/**
 * Rotate Module - TypeScript + TSX
 * Manages rotation (-180° to 180°) for active layer
 */

import { h } from "../ui/jsx";
import { PanelHeader } from "../ui/PanelHeader";
import { SliderControl } from "../ui/SliderControl";
import { eventBus } from "../core/event-bus";
import { Layer, LayerManager } from "../core/layer";
import { captureSnapshot, getSnapshot } from "../core/panel-state-store";

export interface RotateModuleOptions {
  layerManager?: LayerManager;
  targetLayer?: Layer | null;
  onAngleChange?: (angle: number) => void;
  onClose?: () => void;
}

let savedInnerHTML: string | null = null;

export const RotateModule = {
  /**
   * Opens Rotate sub-panel inside a container
   * @param containerGroup - Container element
   * @param options - LayerManager, Layer or callback options
   */
  open(containerGroup: HTMLElement | null, options: RotateModuleOptions = {}): void {
    if (!containerGroup) return;

    if (!containerGroup.querySelector(".rotate-panel")) {
      savedInnerHTML = containerGroup.innerHTML;
    }

    const { layerManager, onAngleChange, onClose } = options;

    let targetLayer = options.targetLayer;
    if (!targetLayer && layerManager) {
      targetLayer = layerManager.getActiveLayer();
      if (targetLayer && targetLayer.id === 0) {
        targetLayer = undefined;
      }
    }

    const currentRotation =
      targetLayer && typeof targetLayer.rotation === "number"
        ? Math.round(targetLayer.rotation)
        : 0;

    if (!containerGroup.querySelector(".rotate-panel")) {
      savedInnerHTML = containerGroup.innerHTML;
    }
    // Ghi mốc góc xoay LÚC MỞ PANEL (giống Size/Padding/Opacity):
    // Reset luôn về giá trị tại lần mở gần nhất, không phải mặc định 0°.
    // this.open() sau Reset là re-render (đã có .rotate-panel) nên KHÔNG ghi đè mốc.
    if (targetLayer) {
      captureSnapshot("rotate", targetLayer.id, { rotation: currentRotation });
    }

    const backBtn = PanelHeader({
      title: "Rotate",
      onBack: () => {
        this.close(containerGroup);
        if (onClose) onClose();
      },
      onReset: () => {
        let active = targetLayer;
        if (!active && layerManager) {
          active = layerManager.getActiveLayer();
        }
        if (active && active.id !== 0) {
          const snap = getSnapshot("rotate", active.id);
          const resetAngle = snap ? Number(snap.rotation) : 0;
          active.rotation = resetAngle;
          if (layerManager) layerManager.render();
          eventBus.emit("layer:rotated", { layer: active, rotation: resetAngle });
          if (onAngleChange) onAngleChange(resetAngle);
        }
        this.open(containerGroup, options);
      },
    });

    const sliderControlEl = SliderControl({
      label: "Angle",
      value: currentRotation,
      min: -180,
      max: 180,
      btnStep: 1,
      unit: "°",
      onChange: (val: number) => {
        let active = targetLayer;
        if (!active && layerManager) {
          active = layerManager.getActiveLayer();
        }

        if (active && active.id !== 0) {
          active.rotation = val;
          if (layerManager) {
            layerManager.render();
          }
          eventBus.emit("layer:rotated", { layer: active, rotation: val });
        }

        if (onAngleChange) {
          onAngleChange(val);
        }
      },
    });

    const panelEl = (
      <div
        class="rotate-panel"
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
    ) as HTMLElement;

    containerGroup.innerHTML = "";
    containerGroup.appendChild(panelEl);
  },

  close(containerGroup: HTMLElement | null): void {
    if (!containerGroup) return;
    if (savedInnerHTML !== null) {
      containerGroup.innerHTML = savedInnerHTML;
      savedInnerHTML = null;
    }
  },
};
