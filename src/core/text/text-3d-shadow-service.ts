import type { Layer } from "../layer";
import { captureSnapshot, getSnapshot } from "../panel-state-store";

export interface Text3DShadowState {
  enabled: boolean;
  color: string | { kind: string; [key: string]: any };
  opacity: number; // 0 ~ 100 (%)
  blur: number; // 0 ~ 25
  expand: number; // 0 ~ 50
  angle: number; // 0 ~ 360
  distance: number; // 0 ~ 100
}

export interface Text3DShadowContext {
  getActiveTextLayer: () => Layer | null | undefined;
  redrawAndSync: (layer?: Layer) => void;
}

export class Text3DShadowService {
  private static readonly PANEL_ID = "3d-shadow";

  private static readonly DEFAULTS: Text3DShadowState = {
    enabled: false,
    color: "#000000",
    opacity: 50,
    blur: 4,
    expand: 0,
    angle: 135,
    distance: 26,
  };

  static getState(layer: Layer | null | undefined): Text3DShadowState {
    if (!layer) {
      return { ...this.DEFAULTS };
    }

    const opacity =
      typeof layer.shadow3dOpacity === "number"
        ? Math.round(layer.shadow3dOpacity * 100)
        : this.DEFAULTS.opacity;

    return {
      enabled: !!layer.shadow3dEnabled,
      color: layer.shadow3dColor ?? this.DEFAULTS.color,
      opacity,
      blur: typeof layer.shadow3dBlur === "number" ? layer.shadow3dBlur : this.DEFAULTS.blur,
      expand: typeof layer.shadow3dExpand === "number" ? layer.shadow3dExpand : this.DEFAULTS.expand,
      angle: typeof layer.shadow3dAngle === "number" ? layer.shadow3dAngle : this.DEFAULTS.angle,
      distance: typeof layer.shadow3dDistance === "number" ? layer.shadow3dDistance : this.DEFAULTS.distance,
    };
  }

  static captureInitialState(layer: Layer | null | undefined): void {
    if (!layer) return;
    const current = this.getState(layer);
    captureSnapshot(this.PANEL_ID, layer.id, {
      shadow3dOpacity: (layer.shadow3dOpacity ?? 0.5),
      shadow3dBlur: current.blur,
      shadow3dExpand: current.expand,
      shadow3dAngle: current.angle,
      shadow3dDistance: current.distance,
    });
  }

  static setEnabled(enabled: boolean, context: Text3DShadowContext): Text3DShadowState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, enabled };

    active.shadow3dEnabled = enabled;
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static setColor(color: string | { kind: string; [key: string]: any }, context: Text3DShadowContext): Text3DShadowState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, color };

    if (typeof color === "string") {
      active.shadow3dColor = color;
    } else if (typeof color === "object" && color !== null) {
      const fill = color as any;
      active.shadow3dColor = fill.kind === "solid" ? fill.hex : fill;
    }
    active.shadow3dEnabled = true;
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static resetColor(context: Text3DShadowContext): Text3DShadowState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS };

    active.shadow3dEnabled = false;
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static setOpacity(val: number, context: Text3DShadowContext): Text3DShadowState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, opacity: val };

    const clamped = Math.max(0, Math.min(100, Math.round(val)));
    active.shadow3dOpacity = clamped / 100;
    active.shadow3dEnabled = true;
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static setBlur(val: number, context: Text3DShadowContext): Text3DShadowState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, blur: val };

    active.shadow3dBlur = Math.max(0, Math.min(25, Math.round(val)));
    active.shadow3dEnabled = true;
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static setExpand(val: number, context: Text3DShadowContext): Text3DShadowState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, expand: val };

    active.shadow3dExpand = Math.max(0, Math.min(50, Math.round(val)));
    active.shadow3dEnabled = true;
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static setAngleAndDistance(angle: number, distance: number, context: Text3DShadowContext): Text3DShadowState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, angle, distance };

    active.shadow3dAngle = ((angle % 360) + 360) % 360;
    active.shadow3dDistance = Math.max(0, Math.min(100, Math.round(distance)));
    active.shadow3dEnabled = true;
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static reset(context: Text3DShadowContext): Text3DShadowState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS };

    const snap = getSnapshot(this.PANEL_ID, active.id);
    if (snap) {
      active.shadow3dOpacity = typeof snap.shadow3dOpacity === "number" ? snap.shadow3dOpacity : 0.5;
      active.shadow3dBlur = typeof snap.shadow3dBlur === "number" ? snap.shadow3dBlur : 4;
      active.shadow3dExpand = typeof snap.shadow3dExpand === "number" ? snap.shadow3dExpand : 0;
      active.shadow3dAngle = typeof snap.shadow3dAngle === "number" ? snap.shadow3dAngle : 135;
      active.shadow3dDistance = typeof snap.shadow3dDistance === "number" ? snap.shadow3dDistance : 26;
    } else {
      active.shadow3dOpacity = 0.5;
      active.shadow3dBlur = 4;
      active.shadow3dExpand = 0;
      active.shadow3dAngle = 135;
      active.shadow3dDistance = 26;
    }

    context.redrawAndSync(active);
    return this.getState(active);
  }
}
