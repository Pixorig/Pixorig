/**
 * Curve Module - TSX Real DOM
 * Manages text bending / curved text for Text Layer
 */

import { h } from "../ui/jsx";
import { PanelHeader } from "../ui/PanelHeader";
import { SliderControl } from "../ui/SliderControl";
import { LayerManager, Layer } from "../core/layer";
import { TextTransform } from "../text/text-transform";
import { captureSnapshot, getSnapshot } from "../core/panel-state-store";

export class CurveModule {
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
      if (active && active.id !== 0 && active.type === "text") {
        layer = active;
      }
    }
    return layer && layer.type === "text" ? layer : null;
  }

  open(containerGroup: HTMLElement): void {
    if (!containerGroup) return;

    if (!containerGroup.querySelector(".curve-panel")) {
      containerGroup.dataset._savedInner = containerGroup.innerHTML;
    }

    const targetLayer = this.getTargetLayer();
    const currentBend = targetLayer?.curveBend ?? 0;

    if (!containerGroup.querySelector(".curve-panel")) {
      containerGroup.dataset._savedInner = containerGroup.innerHTML;
    }
    // Ghi mốc độ cong LÚC MỞ PANEL (giống Size/Padding): Reset luôn về giá trị
    // tại lần mở gần nhất, không ép về 0. this.open() sau Reset là re-render
    // (đã có .curve-panel) nên không ghi đè mốc.
    if (targetLayer) {
      captureSnapshot("curve", targetLayer.id, { curveBend: currentBend });
    }

    const backBtn = PanelHeader({
      title: "Curve",
      onBack: () => this.close(containerGroup),
      onReset: () => {
        const layer = this.getTargetLayer();
        if (layer) {
          const snap = getSnapshot("curve", layer.id);
          layer.curveBend = snap ? Number(snap.curveBend) : 0;
          this.textTransform.redrawTextLayer(layer);
          this.layerManager.render();
          if (this.textTransform.selectedLayer === layer) {
            this.textTransform.drawSelectionOverlay(layer);
          }
          // Re-render để slider hiển thị lại giá trị đã reset
          this.open(containerGroup);
        }
      },
    });

    const sliderControlEl = SliderControl({
      label: "Bending",
      value: currentBend,
      min: -100,
      max: 100,
      btnStep: 5,
      unit: "%",
      onChange: (val) => {
        const layer = this.getTargetLayer();
        if (layer) {
          layer.curveBend = val;
          this.textTransform.redrawTextLayer(layer);
          this.layerManager.render();
          if (this.textTransform.selectedLayer === layer) {
            this.textTransform.drawSelectionOverlay(layer);
          }
        }
      },
    });

    const panelEl = (
      <div
        class="curve-panel"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          userSelect: "none",
          padding: "12px 8px",
        }}
      >
        {backBtn}
        {sliderControlEl}
      </div>
    );

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
