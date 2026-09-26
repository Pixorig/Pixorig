/**
 * Text 3D Rotate Module - TSX Real DOM
 * Quản lý xoay trục 3D:
 * - X Axis: -180° ~ 180°
 * - Y Axis: -180° ~ 180°
 */

import { h } from "../ui/jsx";
import { LayerManager, Layer } from "../core/layer";
import { TextTransform } from "./text-transform";
import { SliderControl } from "../ui/SliderControl";

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

    const renderUI = () => {
      containerGroup.innerHTML = "";

      const panel = (
        <div class="rotate-3d-panel" style="padding: 12px 16px; display: flex; flex-direction: column; gap: 16px;">
          {/* Header với nút Back */}
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <button
                class="btn-back-rotate-3d"
                style="background: transparent; border: none; color: #fff; cursor: pointer; display: flex; align-items: center; padding: 4px;"
                title="Quay lại"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span style="font-weight: 600; font-size: 14px; color: #fff;">3D Rotate</span>
            </div>
            <button
              class="btn-reset-rotate-3d"
              style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); color: #ddd; font-size: 11px; padding: 3px 8px; border-radius: 4px; cursor: pointer;"
            >
              Reset
            </button>
          </div>

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

      const btnBack = panel.querySelector(".btn-back-rotate-3d");
      if (btnBack) {
        btnBack.addEventListener("click", () => {
          this.close(containerGroup);
        });
      }

      const btnReset = panel.querySelector(".btn-reset-rotate-3d");
      if (btnReset) {
        btnReset.addEventListener("click", () => {
          const target = this.getTargetLayer();
          if (!target) return;
          target.rotate3dX = 0;
          target.rotate3dY = 0;
          this.redrawAndSync(target);
          renderUI();
        });
      }
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
