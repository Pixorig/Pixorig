/**
 * Opacity Module - TypeScript + TSX
 * Manages opacity for layers
 */

import { h } from "../ui/jsx";
import { PanelHeader } from "../ui/PanelHeader";
import { SliderControl } from "../ui/SliderControl";
import { Layer } from "../core/layer";
import {
  OpacityService,
  type OpacityServiceOptions,
} from "../core/layer/opacity-service";

export interface OpacityModuleOptions extends OpacityServiceOptions {
  targetLayer?: Layer | null;
  onClose?: () => void;
}

let savedInnerHTML: string | null = null;

export const OpacityModule = {
  /**
   * Opens Opacity sub-panel inside a container
   */
  open(containerGroup: HTMLElement | null, options: OpacityModuleOptions = {}): void {
    if (!containerGroup) return;

    const { layerManager, onOpacityChange, onClose } = options;

    let targetLayer = options.targetLayer;
    if (!targetLayer && layerManager) {
      targetLayer = layerManager.getActiveLayer();
      if (targetLayer && targetLayer.id === 0) {
        targetLayer = undefined;
      }
    }

    const currentOpacity = OpacityService.getOpacityPercent(targetLayer);

    if (!containerGroup.querySelector(".opacity-panel")) {
      savedInnerHTML = containerGroup.innerHTML;
    }

    if (targetLayer) {
      OpacityService.captureInitialState(targetLayer);
    }

    const backBtn = PanelHeader({
      title: "Opacity",
      onBack: () => {
        this.close(containerGroup);
        if (onClose) onClose();
      },
      onReset: () => {
        let active = targetLayer;
        if (!active && layerManager) {
          active = layerManager.getActiveLayer();
        }
        OpacityService.resetOpacity(active, { layerManager, onOpacityChange });
        this.open(containerGroup, options);
      },
    });

    const sliderControlEl = SliderControl({
      label: "Opacity",
      value: currentOpacity,
      min: 0,
      max: 100,
      btnStep: 5,
      unit: "%",
      onChange: (val: number) => {
        let active = targetLayer;
        if (!active && layerManager) {
          active = layerManager.getActiveLayer();
        }
        OpacityService.setOpacity(active, val, { layerManager, onOpacityChange });
      },
    });

    const panelEl = (
      <div
        class="opacity-panel"
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
