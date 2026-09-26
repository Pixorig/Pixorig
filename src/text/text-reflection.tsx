/**
 * Module điều khiển hiệu ứng Reflection (Phản chiếu lật ngược chân chữ)
 */
import { LayerManager, Layer } from "../core/layer";
import { TextTransform } from "./text-transform";
import { SliderControl } from "../ui/SliderControl";
import { h } from "../ui/jsx";

export class TextReflectionModule {
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

  private redrawAndSync(layer?: Layer | null): void {
    const target = layer || this.getTargetLayer();
    if (!target) return;
    this.textTransform.redrawTextLayer(target);
    this.layerManager.render();
    if (this.textTransform.selectedLayer === target) {
      this.textTransform.drawSelectionOverlay(target);
    }
  }

  open(containerGroup: HTMLElement): void {
    if (!containerGroup) return;

    if (!containerGroup.dataset._savedInner) {
      containerGroup.dataset._savedInner = containerGroup.innerHTML;
    }

    const renderUI = () => {
      const layer = this.getTargetLayer();
      containerGroup.innerHTML = "";

      const panel = (
        <div
          class="reflection-panel"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            userSelect: "none",
            padding: "8px 4px",
          }}
        ></div>
      ) as HTMLElement;

      // 1. Header (Nút Back + Tiêu đề Reflection)
      const headerRow = (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            paddingBottom: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              class="btn-back-reflection"
              style={{
                background: "transparent",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                padding: "4px",
              }}
              title="Quay lại"
              onClick={() => this.close(containerGroup)}
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span style={{ fontWeight: "600", fontSize: "14px", color: "#fff" }}>
              Reflection
            </span>
          </div>
        </div>
      ) as HTMLElement;
      panel.appendChild(headerRow);

      // 2. Công tắc (Switch toggle Enabled)
      const isEnabled = !!layer?.reflectionEnabled;
      const switchRow = (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 4px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
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
                  l.reflectionEnabled = checked;
                  this.redrawAndSync(l);
                  renderUI();
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
      panel.appendChild(switchRow);

      // 3. Slider Vertical offset: -100 ~ 100
      if (isEnabled) {
        const offsetSlider = (
          <div class="control-row">
            <SliderControl
              label="Vertical offset"
              value={layer?.reflectionOffset ?? 0}
              min={-100}
              max={100}
              step={1}
              onChange={(val) => {
                const l = this.getTargetLayer();
                if (!l) return;
                l.reflectionOffset = Math.round(val);
                this.redrawAndSync(l);
              }}
            />
          </div>
        );
        panel.appendChild(offsetSlider);
      }

      containerGroup.appendChild(panel);
    };

    renderUI();
  }

  close(containerGroup: HTMLElement): void {
    if (!containerGroup) return;
    if (containerGroup.dataset._savedInner) {
      containerGroup.innerHTML = containerGroup.dataset._savedInner;
      delete containerGroup.dataset._savedInner;
    }
  }
}
