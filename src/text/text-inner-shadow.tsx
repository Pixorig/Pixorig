import { h } from "../ui/jsx";
import { PanelHeader } from "../ui/PanelHeader";
import { SliderControl } from "../ui/SliderControl";
import { LayerManager, Layer } from "../core/layer";
import { TextTransform } from "./text-transform";
import { ColorModule } from "../modules/color";
import { captureSnapshot, getSnapshot } from "../core/panel-state-store";

export class TextInnerShadowModule {
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

    if (!containerGroup.querySelector(".inner-shadow-panel")) {
      containerGroup.dataset._savedInner = containerGroup.innerHTML;
    }

    const layer = this.getTargetLayer();

    // Ghi mốc THAM SỐ LÚC MỞ PANEL (giống Shadow): blur, offset X/Y.
    // Reset phục hồi các giá trị này — KHÔNG tắt hiệu ứng, KHÔNG đụng màu
    // (màu có nút xóa riêng trong color row).
    if (layer) {
      captureSnapshot("inner-shadow", layer.id, {
        innerShadowBlur: layer.innerShadowBlur ?? 5,
        innerShadowOffsetX: layer.innerShadowOffsetX ?? 0,
        innerShadowOffsetY: layer.innerShadowOffsetY ?? 4,
      });
    }

    const panelEl = (
      <div
        class="inner-shadow-panel"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          userSelect: "none",
          padding: "12px 8px",
        }}
      ></div>
    ) as HTMLElement;

    // Back button
    // Reset = phục hồi THAM SỐ về mốc lúc mở panel gần nhất (giống Shadow):
    // blur, offset X/Y. Không tắt hiệu ứng, không đụng màu.
    const backBtn = PanelHeader({
      title: "Inner Shadow",
      onBack: () => this.close(containerGroup),
      onReset: () => {
        const l = this.getTargetLayer();
        if (l) {
          const snap = getSnapshot("inner-shadow", l.id);
          l.innerShadowBlur = snap ? Number(snap.innerShadowBlur) : 5;
          l.innerShadowOffsetX = snap ? Number(snap.innerShadowOffsetX) : 0;
          l.innerShadowOffsetY = snap ? Number(snap.innerShadowOffsetY) : 4;
          this.redrawAndSync(l);
          // Re-render để slider hiển thị lại giá trị đã reset
          this.open(containerGroup);
        }
      },
    });
    panelEl.appendChild(backBtn);

    // Color row: [Color][xóa]
    const hasColor = !!layer?.innerShadowEnabled;
    const selectColorBtn = (
      <button
        type="button"
        style={{
          flex: "1",
          background: "#2a2a2a",
          border: "1px solid #444",
          borderRadius: "4px",
          color: "#fff",
          padding: "6px 10px",
          cursor: "pointer",
          fontSize: "12px",
        }}
        onClick={() => {
          containerGroup.dataset._savedInner_innerShadow = containerGroup.innerHTML;
          ColorModule.open(containerGroup, {
            layerManager: this.layerManager,
            onColorChange: (color) => {
              const l = this.getTargetLayer();
              if (!l) return;
              if (typeof color === "string") {
                l.innerShadowColor = color;
              } else if (typeof color === "object" && color !== null) {
                const fill = color as any;
                if (fill.kind === "solid") {
                  l.innerShadowColor = fill.hex;
                } else {
                  l.innerShadowColor = fill;
                }
              }
              l.innerShadowEnabled = true;
              this.redrawAndSync(l);
            },
            onClose: () => {
              this.open(containerGroup);
            },
          });
        }}
      >
        Color
      </button>
    );

    const deleteBtn = (
      <button
        type="button"
        style={{
          background: "#2a2a2a",
          border: "1px solid #444",
          borderRadius: "4px",
          color: hasColor ? "#ff4d4d" : "#666",
          padding: "6px 10px",
          cursor: hasColor ? "pointer" : "not-allowed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        disabled={!hasColor}
        onClick={() => {
          const l = this.getTargetLayer();
          if (l) {
            l.innerShadowEnabled = false;
            this.redrawAndSync(l);
            this.open(containerGroup);
          }
        }}
      >
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path
            fill="currentColor"
            d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
          />
        </svg>
      </button>
    );

    const colorRow = (
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {selectColorBtn}
        {deleteBtn}
      </div>
    ) as HTMLElement;
    panelEl.appendChild(colorRow);

    // Blur radius slider: 0 - 25
    const blurSlider = SliderControl({
      label: "Blur radius",
      value: layer?.innerShadowBlur ?? 5,
      min: 0,
      max: 25,
      sliderMin: 0,
      sliderMax: 25,
      btnStep: 1,
      onChange: (val) => {
        const l = this.getTargetLayer();
        if (!l) return;
        l.innerShadowBlur = Math.round(val);
        this.redrawAndSync(l);
      },
    });
    panelEl.appendChild(blurSlider);

    // Offset X slider: -100 - 100
    const offsetXSlider = SliderControl({
      label: "Offset X",
      value: layer?.innerShadowOffsetX ?? 0,
      min: -100,
      max: 100,
      sliderMin: -100,
      sliderMax: 100,
      btnStep: 1,
      onChange: (val) => {
        const l = this.getTargetLayer();
        if (!l) return;
        l.innerShadowOffsetX = Math.round(val);
        this.redrawAndSync(l);
      },
    });
    panelEl.appendChild(offsetXSlider);

    // Offset Y slider: -100 - 100
    const offsetYSlider = SliderControl({
      label: "Offset Y",
      value: layer?.innerShadowOffsetY ?? 4,
      min: -100,
      max: 100,
      sliderMin: -100,
      sliderMax: 100,
      btnStep: 1,
      onChange: (val) => {
        const l = this.getTargetLayer();
        if (!l) return;
        l.innerShadowOffsetY = Math.round(val);
        this.redrawAndSync(l);
      },
    });
    panelEl.appendChild(offsetYSlider);

    containerGroup.innerHTML = "";
    containerGroup.appendChild(panelEl);
  }

  close(containerGroup: HTMLElement): void {
    if (!containerGroup) return;
    if (containerGroup.dataset._savedInner) {
      containerGroup.innerHTML = containerGroup.dataset._savedInner;
      delete containerGroup.dataset._savedInner;
    }
  }
}
