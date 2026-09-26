import { h } from "../ui/jsx";
import { LayerManager, Layer } from "../core/layer";
import { TextTransform } from "./text-transform";

export class TextPerspectiveModule {
  private layerManager: LayerManager;
  private textTransform: TextTransform;

  constructor(layerManager: LayerManager, textTransform: TextTransform) {
    this.layerManager = layerManager;
    this.textTransform = textTransform;
  }

  private getTargetLayer(): Layer | null {
    let layer = this.textTransform.selectedLayer;
    if (!layer || layer.id === 0) {
      const active = this.layerManager.getActiveLayer();
      if (active && active.id !== 0) layer = active;
    }
    return layer?.type === "text" ? layer : null;
  }

  private redrawAndSync(layer: Layer): void {
    this.textTransform.redrawTextLayer(layer);
    this.layerManager.render();
    if (this.textTransform.selectedLayer === layer) {
      this.textTransform.drawSelectionOverlay(layer);
    }
  }

  open(containerGroup: HTMLElement): void {
    if (!containerGroup) return;

    if (!containerGroup.querySelector(".perspective-panel")) {
      containerGroup.dataset._savedInner = containerGroup.innerHTML;
    }

    const layer = this.getTargetLayer();

    // Kích hoạt perspective mode trên textTransform để vẽ và kéo 4 handle góc
    this.textTransform.isPerspectiveMode = true;
    if (layer) {
      this.textTransform.drawSelectionOverlay(layer);
    }

    const panelEl = (
      <div
        class="perspective-panel"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          userSelect: "none",
          padding: "12px 8px",
        }}
      ></div>
    ) as HTMLElement;

    // Header: Back
    const backBtn = (
      <button
        type="button"
        class="sub-item"
        style={{ marginBottom: "4px" }}
        onClick={() => this.close(containerGroup)}
      >
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path
            fill="currentColor"
            d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
          />
        </svg>
        <span>Back</span>
      </button>
    );
    panelEl.appendChild(backBtn);

    // Enabled switch row
    const isEnabled = !!layer?.perspectiveEnabled;

    const enabledRow = (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 4px",
          borderBottom: "1px solid #333",
        }}
      >
        <span style={{ fontSize: "13px", color: "#ddd", fontWeight: "500" }}>
          Enabled
        </span>
        <label
          style={{
            position: "relative",
            display: "inline-block",
            width: "36px",
            height: "20px",
            margin: "0",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={isEnabled}
            style={{ opacity: "0", width: "0", height: "0" }}
            onChange={(e: Event) => {
              const checked = (e.target as HTMLInputElement).checked;
              const l = this.getTargetLayer();
              if (l) {
                l.perspectiveEnabled = checked;
                if (!checked) {
                  // Hủy drag corner đang dở dang (nếu có) khi tắt Enabled
                  this.textTransform.activePerspectiveCorner = null;
                }
                this.redrawAndSync(l);
                this.open(containerGroup);
              }
            }}
          />
          <span
            style={{
              position: "absolute",
              cursor: "pointer",
              top: "0",
              left: "0",
              right: "0",
              bottom: "0",
              backgroundColor: isEnabled ? "#00f260" : "#444",
              borderRadius: "20px",
              transition: "0.2s",
            }}
          >
            <span
              style={{
                position: "absolute",
                content: '""',
                height: "14px",
                width: "14px",
                left: isEnabled ? "19px" : "3px",
                bottom: "3px",
                backgroundColor: "#fff",
                borderRadius: "50%",
                transition: "0.2s",
              }}
            />
          </span>
        </label>
      </div>
    ) as HTMLElement;
    panelEl.appendChild(enabledRow);

    // Reset button row
    const resetBtn = (
      <button
        type="button"
        style={{
          width: "100%",
          padding: "8px 12px",
          background: "#2a2a2a",
          border: "1px solid #444",
          borderRadius: "4px",
          color: "#fff",
          fontSize: "13px",
          fontWeight: "500",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          transition: "background 0.2s",
        }}
        onClick={() => {
          const l = this.getTargetLayer();
          if (l) {
            l.perspectivePoints = {
              tl: { x: 0, y: 0 },
              tr: { x: 0, y: 0 },
              br: { x: 0, y: 0 },
              bl: { x: 0, y: 0 },
            };
            this.redrawAndSync(l);
          }
        }}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
        </svg>
        <span>Reset</span>
      </button>
    );
    panelEl.appendChild(resetBtn);

    containerGroup.innerHTML = "";
    containerGroup.appendChild(panelEl);
  }

  close(containerGroup: HTMLElement): void {
    if (!containerGroup) return;
    this.textTransform.isPerspectiveMode = false;
    const layer = this.getTargetLayer();
    if (layer) {
      this.textTransform.drawSelectionOverlay(layer);
    }
    if (containerGroup.dataset._savedInner) {
      containerGroup.innerHTML = containerGroup.dataset._savedInner;
      delete containerGroup.dataset._savedInner;
    }
  }
}
