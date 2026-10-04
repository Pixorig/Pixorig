import type { Layer } from "../layer";
import { captureSnapshot, getSnapshot } from "../panel-state-store";

export type Text3DViewType = "perspective" | "oblique";
export type Text3DColorMode = "auto" | "color";

export interface Text3DState {
  enabled: boolean;
  viewType: Text3DViewType;
  depth: number;
  colorMode: Text3DColorMode;
  color: string | { kind: string; [key: string]: any };
  darken: number;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  lightingEnabled: boolean;
  lightAngle: number;
  lightIntensity: number;
  lightShadow: number;
  lightSpecular: number;
}

export interface Text3DContext {
  getActiveTextLayer: () => Layer | null | undefined;
  redrawAndSync: (layer?: Layer) => void;
}

export class Text3DService {
  private static readonly PANEL_ID = "3d-text";

  private static readonly DEFAULTS: Text3DState = {
    enabled: false,
    viewType: "oblique",
    depth: 15,
    colorMode: "auto",
    color: "#000000",
    darken: 30,
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    lightingEnabled: false,
    lightAngle: 90,
    lightIntensity: 80,
    lightShadow: 40,
    lightSpecular: 30,
  };

  static getState(layer: Layer | null | undefined): Text3DState {
    if (!layer) {
      return { ...this.DEFAULTS };
    }

    return {
      enabled: !!layer.text3dEnabled,
      viewType: layer.text3dViewType || this.DEFAULTS.viewType,
      depth: typeof layer.text3dDepth === "number" ? layer.text3dDepth : this.DEFAULTS.depth,
      colorMode: layer.text3dColorMode || this.DEFAULTS.colorMode,
      color: layer.text3dColor ?? this.DEFAULTS.color,
      darken: typeof layer.text3dDarken === "number" ? layer.text3dDarken : this.DEFAULTS.darken,
      rotateX: typeof layer.text3dRotateX === "number" ? layer.text3dRotateX : this.DEFAULTS.rotateX,
      rotateY: typeof layer.text3dRotateY === "number" ? layer.text3dRotateY : this.DEFAULTS.rotateY,
      rotateZ: typeof layer.text3dRotateZ === "number" ? layer.text3dRotateZ : this.DEFAULTS.rotateZ,
      lightingEnabled: !!layer.text3dLightingEnabled,
      lightAngle: typeof layer.text3dLightAngle === "number" ? layer.text3dLightAngle : this.DEFAULTS.lightAngle,
      lightIntensity: typeof layer.text3dLightIntensity === "number" ? layer.text3dLightIntensity : this.DEFAULTS.lightIntensity,
      lightShadow: typeof layer.text3dLightShadow === "number" ? layer.text3dLightShadow : this.DEFAULTS.lightShadow,
      lightSpecular: typeof layer.text3dLightSpecular === "number" ? layer.text3dLightSpecular : this.DEFAULTS.lightSpecular,
    };
  }

  static captureInitialState(layer: Layer | null | undefined): void {
    if (!layer) return;
    const current = this.getState(layer);
    captureSnapshot(this.PANEL_ID, layer.id, {
      enabled: current.enabled,
      viewType: current.viewType,
      depth: current.depth,
      colorMode: current.colorMode,
      darken: current.darken,
      rotateX: current.rotateX,
      rotateY: current.rotateY,
      rotateZ: current.rotateZ,
      lightingEnabled: current.lightingEnabled,
      lightAngle: current.lightAngle,
      lightIntensity: current.lightIntensity,
      lightShadow: current.lightShadow,
      lightSpecular: current.lightSpecular,
    });
  }

  static setEnabled(enabled: boolean, context: Text3DContext): Text3DState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, enabled };

    active.text3dEnabled = enabled;
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static setViewType(viewType: Text3DViewType, context: Text3DContext): Text3DState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, viewType };

    active.text3dViewType = viewType;
    active.text3dEnabled = true;
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static setDepth(depth: number, context: Text3DContext): Text3DState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, depth };

    active.text3dDepth = Math.max(1, Math.min(100, Math.round(depth)));
    active.text3dEnabled = true;
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static setColorMode(mode: Text3DColorMode, context: Text3DContext): Text3DState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, colorMode: mode };

    active.text3dColorMode = mode;
    active.text3dEnabled = true;
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static setColor(color: string | { kind: string; [key: string]: any }, context: Text3DContext): Text3DState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, color };

    if (typeof color === "string") {
      active.text3dColor = color;
    } else if (typeof color === "object" && color !== null) {
      const fill = color as any;
      active.text3dColor = fill.kind === "solid" ? fill.hex : fill;
    }
    active.text3dColorMode = "color";
    active.text3dEnabled = true;
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static resetColor(context: Text3DContext): Text3DState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS };

    active.text3dColor = "#000000";
    active.text3dColorMode = "auto";
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static setDarken(darken: number, context: Text3DContext): Text3DState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, darken };

    active.text3dDarken = Math.max(0, Math.min(100, Math.round(darken)));
    active.text3dEnabled = true;
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static setRotateX(val: number, context: Text3DContext): Text3DState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, rotateX: val };

    active.text3dRotateX = Math.max(-80, Math.min(80, Math.round(val)));
    active.text3dEnabled = true;
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static setRotateY(val: number, context: Text3DContext): Text3DState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, rotateY: val };

    active.text3dRotateY = Math.max(-80, Math.min(80, Math.round(val)));
    active.text3dEnabled = true;
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static setRotateZ(val: number, context: Text3DContext): Text3DState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, rotateZ: val };

    active.text3dRotateZ = Math.max(-180, Math.min(180, Math.round(val)));
    active.text3dEnabled = true;
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static reset3DRotation(context: Text3DContext): Text3DState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS };

    active.text3dRotateX = 0;
    active.text3dRotateY = 0;
    active.text3dRotateZ = 0;
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static setLightingEnabled(enabled: boolean, context: Text3DContext): Text3DState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, lightingEnabled: enabled };

    active.text3dLightingEnabled = enabled;
    active.text3dEnabled = true;
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static setLightAngle(deg: number, context: Text3DContext): Text3DState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, lightAngle: deg };

    const normalized = ((Math.round(deg) % 360) + 360) % 360;
    active.text3dLightAngle = normalized;
    active.text3dEnabled = true;
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static setLightIntensity(val: number, context: Text3DContext): Text3DState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, lightIntensity: val };

    active.text3dLightIntensity = Math.max(0, Math.min(100, Math.round(val)));
    active.text3dEnabled = true;
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static setLightShadow(val: number, context: Text3DContext): Text3DState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, lightShadow: val };

    active.text3dLightShadow = Math.max(0, Math.min(100, Math.round(val)));
    active.text3dEnabled = true;
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static setLightSpecular(val: number, context: Text3DContext): Text3DState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, lightSpecular: val };

    active.text3dLightSpecular = Math.max(0, Math.min(100, Math.round(val)));
    active.text3dEnabled = true;
    context.redrawAndSync(active);
    return this.getState(active);
  }

  /**
   * Reset 3D Text: tắt + trả toàn bộ tham số về mặc định (hoặc từ snapshot nếu có)
   */
  static reset(context: Text3DContext): Text3DState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS };

    const snap = getSnapshot(this.PANEL_ID, active.id);
    if (snap) {
      active.text3dEnabled = Boolean(snap.enabled);
      active.text3dViewType = (snap.viewType as Text3DViewType) || this.DEFAULTS.viewType;
      active.text3dDepth = typeof snap.depth === "number" ? snap.depth : this.DEFAULTS.depth;
      active.text3dColorMode = (snap.colorMode as Text3DColorMode) || this.DEFAULTS.colorMode;
      active.text3dDarken = typeof snap.darken === "number" ? snap.darken : this.DEFAULTS.darken;
      active.text3dRotateX = typeof snap.rotateX === "number" ? snap.rotateX : this.DEFAULTS.rotateX;
      active.text3dRotateY = typeof snap.rotateY === "number" ? snap.rotateY : this.DEFAULTS.rotateY;
      active.text3dRotateZ = typeof snap.rotateZ === "number" ? snap.rotateZ : this.DEFAULTS.rotateZ;
      active.text3dLightingEnabled = Boolean(snap.lightingEnabled);
      active.text3dLightAngle = typeof snap.lightAngle === "number" ? snap.lightAngle : this.DEFAULTS.lightAngle;
      active.text3dLightIntensity = typeof snap.lightIntensity === "number" ? snap.lightIntensity : this.DEFAULTS.lightIntensity;
      active.text3dLightShadow = typeof snap.lightShadow === "number" ? snap.lightShadow : this.DEFAULTS.lightShadow;
      active.text3dLightSpecular = typeof snap.lightSpecular === "number" ? snap.lightSpecular : this.DEFAULTS.lightSpecular;
    } else {
      active.text3dEnabled = false;
      active.text3dViewType = "oblique";
      active.text3dDepth = 15;
      active.text3dColorMode = "auto";
      active.text3dColor = "#000000";
      active.text3dDarken = 30;
      active.text3dRotateX = 0;
      active.text3dRotateY = 0;
      active.text3dRotateZ = 0;
      active.text3dLightingEnabled = false;
      active.text3dLightAngle = 90;
      active.text3dLightIntensity = 80;
      active.text3dLightShadow = 40;
      active.text3dLightSpecular = 30;
    }

    context.redrawAndSync(active);
    return this.getState(active);
  }
}
