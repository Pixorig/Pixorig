/**
 * Text 3D Rotate Module - TSX Real DOM
 * Quản lý xoay trục 3D:
 * - X Axis: -180° ~ 180°
 * - Y Axis: -180° ~ 180°
 */

import { h } from "../ui/jsx";
import { PanelHeader } from "../ui/PanelHeader";
import { LayerManager, Layer } from "../core/layer";
import { TextTransform } from "./text-transform";
import { SliderControl } from "../ui/SliderControl";
import { captureSnapshot, getSnapshot } from "../core/panel-state-store";

export class Text3DRotateModule {
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

    if (!containerGroup.querySelector(".rotate-3d-panel")) {
      containerGroup.dataset._savedInner = containerGroup.innerHTML;
    }

    const layer = this.getTargetLayer();
    // Ghi mốc 2 trục LÚC MỞ PANEL (giống Size/Padding): Reset về giá trị lúc mở gần nhất.
    if (layer) {
      captureSnapshot("3d-rotate", layer.id, {
        rotate3dX: layer.rotate3dX ?? 0,
        rotate3dY: layer.rotate3dY ?? 0,
      });
    }

    const renderUI = () => {
      containerGroup.innerHTML = "";

      const panel = (
        <div class="rotate-3d-panel" style="padding: 12px 16px; display: flex; flex-direction: column; gap: 16px;">
          {/* Header với nút Back */}
          {PanelHeader({
            title: "3D Rotate",
            onBack: () => this.close(containerGroup),
            onReset: () => {
              const target = this.getTargetLayer();
              if (!target) return;
              const snap = getSnapshot("3d-rotate", target.id);
              target.rotate3dX = snap ? Number(snap.rotate3dX) : 0;
              target.rotate3dY = snap ? Number(snap.rotate3dY) : 0;
              this.redrawAndSync(target);
              renderUI();
            },
          })}

          {/* X Axis Slider: -180 ~ 180 */}
          <div class="control-row">
            <SliderControl
              label="X axis"
              value={layer?.rotate3dX ?? 0}
              min={-180}
              max={180}
              step={1}
              unit="°"
              onChange={(val) => {
                const target = this.getTargetLayer();
                if (!target) return;
                target.rotate3dX = Math.round(val);
                this.redrawAndSync(target);
              }}
            />
          </div>

          {/* Y Axis Slider: -180 ~ 180 */}
          <div class="control-row">
            <SliderControl
              label="Y axis"
              value={layer?.rotate3dY ?? 0}
              min={-180}
              max={180}
              step={1}
              unit="°"
              onChange={(val) => {
                const target = this.getTargetLayer();
                if (!target) return;
                target.rotate3dY = Math.round(val);
                this.redrawAndSync(target);
              }}
            />
          </div>
        </div>
      );

      containerGroup.appendChild(panel);
    };

    renderUI();
  }

  close(containerGroup: HTMLElement): void {
    if (containerGroup && containerGroup.dataset._savedInner) {
      containerGroup.innerHTML = containerGroup.dataset._savedInner;
      delete containerGroup.dataset._savedInner;
    }
  }
}
