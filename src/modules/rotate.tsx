/**
 * Rotate Module - TypeScript + TSX
 * Manages rotation (-180° to 180°) for active layer
 */

import { h } from "../ui/jsx";
import { PanelHeader } from "../ui/PanelHeader";
import { SliderControl } from "../ui/SliderControl";
import { Layer } from "../core/layer";
import {
  RotateService,
  type RotateServiceOptions,
} from "../core/layer/rotate-service";

export interface RotateModuleOptions extends RotateServiceOptions {
  targetLayer?: Layer | null;
  onClose?: () => void;
}

let savedInnerHTML: string | null = null;

export const RotateModule = {
  /**
   * Opens Rotate sub-panel inside a container
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

    const currentRotation = RotateService.getRotation(targetLayer);

    if (targetLayer) {
      RotateService.captureInitialState(targetLayer);
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
        RotateService.resetRotation(active, { layerManager, onAngleChange });
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
        RotateService.setRotation(active, val, { layerManager, onAngleChange });
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
