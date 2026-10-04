import type { Layer, LayerManager } from "../layer";
import { eventBus } from "../event-bus";
import { captureSnapshot, getSnapshot } from "../panel-state-store";

export interface RotateServiceOptions {
  layerManager?: LayerManager;
  onAngleChange?: (angle: number) => void;
}

export class RotateService {
  private static readonly PANEL_ID = "rotate";

  static getRotation(layer: Layer | null | undefined): number {
    if (!layer || typeof layer.rotation !== "number") return 0;
    return Math.round(layer.rotation);
  }

  static captureInitialState(layer: Layer | null | undefined): void {
    if (!layer) return;
    const current = this.getRotation(layer);
    captureSnapshot(this.PANEL_ID, layer.id, { rotation: current });
  }

  static setRotation(
    layer: Layer | null | undefined,
    angle: number,
    options: RotateServiceOptions = {}
  ): void {
    if (!layer || layer.id === 0) return;

    layer.rotation = Math.round(angle);

    if (options.layerManager) {
      options.layerManager.render();
    }

    eventBus.emit("layer:rotated", {
      layer,
      rotation: layer.rotation,
    });

    if (options.onAngleChange) {
      options.onAngleChange(layer.rotation);
    }
  }

  static resetRotation(
    layer: Layer | null | undefined,
    options: RotateServiceOptions = {}
  ): number {
    if (!layer || layer.id === 0) return 0;

    const snap = getSnapshot(this.PANEL_ID, layer.id);
    const resetAngle = snap ? Number(snap.rotation) : 0;

    this.setRotation(layer, resetAngle, options);
    return resetAngle;
  }
}
