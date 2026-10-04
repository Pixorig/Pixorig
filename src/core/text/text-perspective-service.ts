import type { Layer } from "../layer";
import { captureSnapshot, getSnapshot } from "../panel-state-store";

export interface PerspectivePoint {
  x: number;
  y: number;
}

export interface PerspectivePoints {
  tl: PerspectivePoint;
  tr: PerspectivePoint;
  br: PerspectivePoint;
  bl: PerspectivePoint;
}

export interface TextPerspectiveState {
  enabled: boolean;
  points: PerspectivePoints;
}

export interface TextPerspectiveContext {
  getActiveTextLayer: () => Layer | null | undefined;
  redrawAndSync: (layer?: Layer) => void;
  setPerspectiveMode?: (active: boolean) => void;
  resetActiveCorner?: () => void;
}

export class TextPerspectiveService {
  private static readonly PANEL_ID = "perspective";

  private static createDefaultPoints(): PerspectivePoints {
    return {
      tl: { x: 0, y: 0 },
      tr: { x: 0, y: 0 },
      br: { x: 0, y: 0 },
      bl: { x: 0, y: 0 },
    };
  }

  static getState(layer: Layer | null | undefined): TextPerspectiveState {
    if (!layer) {
      return {
        enabled: false,
        points: this.createDefaultPoints(),
      };
    }

    const pts = layer.perspectivePoints || this.createDefaultPoints();
    return {
      enabled: !!layer.perspectiveEnabled,
      points: {
        tl: { x: pts.tl?.x ?? 0, y: pts.tl?.y ?? 0 },
        tr: { x: pts.tr?.x ?? 0, y: pts.tr?.y ?? 0 },
        br: { x: pts.br?.x ?? 0, y: pts.br?.y ?? 0 },
        bl: { x: pts.bl?.x ?? 0, y: pts.bl?.y ?? 0 },
      },
    };
  }

  static captureInitialState(layer: Layer | null | undefined): void {
    if (!layer) return;
    const current = this.getState(layer);
    captureSnapshot(this.PANEL_ID, layer.id, {
      enabled: current.enabled,
      points: JSON.stringify(current.points),
    });
  }

  static setEnabled(enabled: boolean, context: TextPerspectiveContext): TextPerspectiveState {
    const active = context.getActiveTextLayer();
    if (!active) {
      return {
        enabled,
        points: this.createDefaultPoints(),
      };
    }

    active.perspectiveEnabled = enabled;
    if (!enabled && context.resetActiveCorner) {
      context.resetActiveCorner();
    }

    context.redrawAndSync(active);
    return this.getState(active);
  }

  static setPoints(points: PerspectivePoints, context: TextPerspectiveContext): TextPerspectiveState {
    const active = context.getActiveTextLayer();
    if (!active) {
      return {
        enabled: false,
        points,
      };
    }

    active.perspectivePoints = {
      tl: { ...points.tl },
      tr: { ...points.tr },
      br: { ...points.br },
      bl: { ...points.bl },
    };

    context.redrawAndSync(active);
    return this.getState(active);
  }

  static resetPoints(context: TextPerspectiveContext): TextPerspectiveState {
    const active = context.getActiveTextLayer();
    const defaultPoints = this.createDefaultPoints();
    if (!active) {
      return {
        enabled: false,
        points: defaultPoints,
      };
    }

    active.perspectivePoints = defaultPoints;
    if (context.resetActiveCorner) {
      context.resetActiveCorner();
    }

    context.redrawAndSync(active);
    return this.getState(active);
  }

  static restoreSnapshot(context: TextPerspectiveContext): TextPerspectiveState {
    const active = context.getActiveTextLayer();
    if (!active) {
      return {
        enabled: false,
        points: this.createDefaultPoints(),
      };
    }

    const snap = getSnapshot(this.PANEL_ID, active.id);
    if (snap) {
      if (typeof snap.enabled === "boolean") {
        active.perspectiveEnabled = snap.enabled;
      }
      if (typeof snap.points === "string") {
        try {
          active.perspectivePoints = JSON.parse(snap.points);
        } catch {
          active.perspectivePoints = this.createDefaultPoints();
        }
      }
    } else {
      active.perspectivePoints = this.createDefaultPoints();
    }

    context.redrawAndSync(active);
    return this.getState(active);
  }
}
