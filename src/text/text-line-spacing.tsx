/**
 * Text Line Spacing Module - TSX Real DOM
 */

import { h } from "../ui/jsx";
import { PanelHeader } from "../ui/PanelHeader";
import { LayerManager, Layer } from "../core/layer";
import { TextTransform } from "./text-transform";
import { SliderControl } from "../ui/SliderControl";
import { captureSnapshot, getSnapshot } from "../core/panel-state-store";

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

    if (!containerGroup.querySelector(".line-spacing-panel")) {
      containerGroup.dataset._savedInner = containerGroup.innerHTML;
    }
    // Ghi mốc LÚC MỞ PANEL (giống Size/Padding): Reset về giá trị lúc mở gần nhất.
    if (layer) {
      captureSnapshot("line-spacing", layer.id, { lineSpacing: currentVal });
    }

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

    const backBtn = PanelHeader({
      title: "Line Spacing",
      onBack: () => this.close(containerGroup),
      onReset: () => {
        const target = this.getTargetLayer();
        if (target) {
          const snap = getSnapshot("line-spacing", target.id);
          target.lineSpacing = snap ? Number(snap.lineSpacing) : 0;
          this.redrawAndSync(target);
          // Re-render để slider hiển thị lại giá trị đã reset
          this.open(containerGroup);
        }
      },
    });
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
