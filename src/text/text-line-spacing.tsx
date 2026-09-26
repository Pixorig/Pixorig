/**
 * Text Line Spacing Module - TSX Real DOM
 */

import { h } from "../ui/jsx";
import { LayerManager, Layer } from "../core/layer";
import { TextTransform } from "./text-transform";
import { SliderControl } from "../ui/SliderControl";

export class TextLineSpacingModule {
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

    if (!containerGroup.querySelector(".line-spacing-panel")) {
      containerGroup.dataset._savedInner = containerGroup.innerHTML;
    }

    const layer = this.getTargetLayer();
    const currentVal = layer?.lineSpacing ?? 0;

    const panelEl = (
      <div
        class="line-spacing-panel"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          userSelect: "none",
          padding: "12px 8px",
        }}
      ></div>
    ) as HTMLElement;

    const backBtn = (
      <button
        type="button"
        class="sub-item"
        style={{ marginBottom: "4px" }}
        onClick={() => this.close(containerGroup)}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5" />
          <path d="M11 18l-6-6 6-6" />
        </svg>
        <span>Back</span>
      </button>
    );
    panelEl.appendChild(backBtn);

    const sliderEl = SliderControl({
      label: "Line Spacing",
      value: currentVal,
      min: -100,
      max: 100,
      sliderMin: -100,
      sliderMax: 100,
      btnStep: 1,
      onChange: (val) => {
        const target = this.getTargetLayer();
        if (!target) return;
        target.lineSpacing = val;
        this.redrawAndSync(target);
      },
    });

    panelEl.appendChild(sliderEl);

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
