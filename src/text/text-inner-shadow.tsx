import { h } from "../ui/jsx";
import { SliderControl } from "../ui/SliderControl";
import { LayerManager, Layer } from "../core/layer";
import { TextTransform } from "./text-transform";
import { ColorModule } from "../modules/color";

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
