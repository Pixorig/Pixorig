import type { Layer } from "../layer";
import { captureSnapshot, getSnapshot } from "../panel-state-store";

export interface Text3DRotateState {
  rotateX: number;
  rotateY: number;
}

export interface Text3DRotateContext {
  getActiveTextLayer: () => Layer | null | undefined;
  redrawAndSync: (layer?: Layer) => void;
}

export class Text3DRotateService {
  private static readonly PANEL_ID = "3d-rotate";

  private static readonly DEFAULTS: Text3DRotateState = {
    rotateX: 0,
    rotateY: 0,
  };

  static getState(layer: Layer | null | undefined): Text3DRotateState {
    if (!layer) {
      return { ...this.DEFAULTS };
    }

    return {
      rotateX: typeof layer.rotate3dX === "number" ? layer.rotate3dX : this.DEFAULTS.rotateX,
      rotateY: typeof layer.rotate3dY === "number" ? layer.rotate3dY : this.DEFAULTS.rotateY,
    };
  }

  static captureInitialState(layer: Layer | null | undefined): void {
    if (!layer) return;
    const current = this.getState(layer);
    captureSnapshot(this.PANEL_ID, layer.id, {
      rotate3dX: current.rotateX,
      rotate3dY: current.rotateY,
    });
  }

  static setRotateX(rotateX: number, context: Text3DRotateContext): Text3DRotateState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, rotateX };

    active.rotate3dX = Math.round(rotateX);
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static setRotateY(rotateY: number, context: Text3DRotateContext): Text3DRotateState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, rotateY };

    active.rotate3dY = Math.round(rotateY);
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static resetRotate(context: Text3DRotateContext): Text3DRotateState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS };

    const snap = getSnapshot(this.PANEL_ID, active.id);
    active.rotate3dX = snap ? Number(snap.rotate3dX) : this.DEFAULTS.rotateX;
    active.rotate3dY = snap ? Number(snap.rotate3dY) : this.DEFAULTS.rotateY;

    context.redrawAndSync(active);
    return this.getState(active);
  }
}
