import type { Layer, LayerManager } from "../layer";
import { eventBus } from "../event-bus";
import { captureSnapshot, getSnapshot } from "../panel-state-store";

export interface OpacityServiceOptions {
  layerManager?: LayerManager;
  onOpacityChange?: (opacity: number) => void;
}

export class OpacityService {
  private static readonly PANEL_ID = "opacity";

  static getOpacityPercent(layer: Layer | null | undefined): number {
    if (!layer || typeof layer.opacity !== "number") return 100;
    return Math.round(layer.opacity * 100);
  }

  static captureInitialState(layer: Layer | null | undefined): void {
    if (!layer) return;
    const current = this.getOpacityPercent(layer);
    captureSnapshot(this.PANEL_ID, layer.id, { opacity: current });
  }

  static setOpacity(
    layer: Layer | null | undefined,
    percent: number,
    options: OpacityServiceOptions = {}
  ): void {
    if (!layer || layer.id === 0) return;

    const clampedPercent = Math.max(0, Math.min(100, Math.round(percent)));
    const normalized = clampedPercent / 100;

    layer.setOpacity(normalized);

    if (options.layerManager) {
      options.layerManager.render();
    }

    eventBus.emit("layer:opacity-changed", {
      layer,
      opacity: normalized,
    });

    if (options.onOpacityChange) {
      options.onOpacityChange(normalized);
    }
  }

  static resetOpacity(
    layer: Layer | null | undefined,
    options: OpacityServiceOptions = {}
  ): number {
    if (!layer || layer.id === 0) return 100;

    const snap = getSnapshot(this.PANEL_ID, layer.id);
    const resetPercent = snap ? Number(snap.opacity) : 100;

    this.setOpacity(layer, resetPercent, options);
    return resetPercent;
  }
}
