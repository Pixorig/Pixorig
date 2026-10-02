/**
 * Opacity Module - TypeScript + TSX
 * Manages opacity for layers
 */

import { h } from "../ui/jsx";
import { PanelHeader } from "../ui/PanelHeader";
import { SliderControl } from "../ui/SliderControl";
import { eventBus } from "../core/event-bus";
import { Layer, LayerManager } from "../core/layer";
import { captureSnapshot, getSnapshot } from "../core/panel-state-store";

export interface OpacityModuleOptions {
  layerManager?: LayerManager;
  targetLayer?: Layer | null;
  onOpacityChange?: (opacity: number) => void;
  onClose?: () => void;
}

let savedInnerHTML: string | null = null;

export const OpacityModule = {
  /**
   * Opens Opacity sub-panel inside a container
   * @param containerGroup - Container element
   * @param options - LayerManager, Layer or callback options
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

    const currentOpacity =
      targetLayer && typeof targetLayer.opacity === "number"
        ? Math.round(targetLayer.opacity * 100)
        : 100;

    if (!containerGroup.querySelector(".opacity-panel")) {
      savedInnerHTML = containerGroup.innerHTML;
    }
    // Ghi mốc opacity LÚC MỞ PANEL (giống Size/Padding):
    // Reset luôn về giá trị tại lần mở gần nhất, không phải mặc định 100%.
    // this.open() sau Reset là re-render (đã có .opacity-panel) nên KHÔNG ghi đè mốc.
    if (targetLayer) {
      captureSnapshot("opacity", targetLayer.id, { opacity: currentOpacity });
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
        if (active && active.id !== 0) {
          const snap = getSnapshot("opacity", active.id);
          const resetPercent = snap ? Number(snap.opacity) : 100;
          const normalized = Math.max(0, Math.min(1, resetPercent / 100));
          active.setOpacity(normalized);
          if (layerManager) layerManager.render();
          eventBus.emit("layer:opacity-changed", { layer: active, opacity: normalized });
          if (onOpacityChange) onOpacityChange(normalized);
        }
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

        const normalizedOpacity = val / 100;

        if (active && active.id !== 0) {
          active.setOpacity(normalizedOpacity);
          if (layerManager) {
            layerManager.render();
          }
          eventBus.emit("layer:opacity-changed", {
            layer: active,
            opacity: normalizedOpacity,
          });
        }

        if (onOpacityChange) {
          onOpacityChange(normalizedOpacity);
        }
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
