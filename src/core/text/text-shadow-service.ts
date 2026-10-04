import type { Layer } from "../layer";
import { captureSnapshot, getSnapshot } from "../panel-state-store";

export interface TextShadowState {
  enabled: boolean;
  color: string | { kind: string; [key: string]: any };
  opacity: number;
  blur: number;
  offsetX: number;
  offsetY: number;
  outerGlow: boolean;
}

export interface TextShadowContext {
  getActiveTextLayer: () => Layer | null | undefined;
  redrawAndSync: (layer?: Layer) => void;
}

export class TextShadowService {
  private static readonly PANEL_ID = "shadow";
  private static readonly DEFAULT_OPACITY = 0.5;
  private static readonly DEFAULT_BLUR = 4;
  private static readonly DEFAULT_OFFSET_X = 0;
  private static readonly DEFAULT_OFFSET_Y = 4;
  private static readonly DEFAULT_COLOR = "#000000";

  static getCurrentState(layer: Layer | null | undefined): TextShadowState {
    return {
      enabled: layer?.shadowEnabled ?? false,
      color: layer?.shadowColor ?? this.DEFAULT_COLOR,
      opacity: layer?.shadowOpacity ?? this.DEFAULT_OPACITY,
      blur: layer?.shadowBlur ?? this.DEFAULT_BLUR,
      offsetX: layer?.shadowOffsetX ?? this.DEFAULT_OFFSET_X,
      offsetY: layer?.shadowOffsetY ?? this.DEFAULT_OFFSET_Y,
      outerGlow: layer?.shadowOuterGlow ?? false,
    };
  }

  static captureInitialState(layer: Layer | null | undefined): void {
    if (!layer) return;
    captureSnapshot(this.PANEL_ID, layer.id, {
      shadowOpacity: layer.shadowOpacity ?? this.DEFAULT_OPACITY,
      shadowBlur: layer.shadowBlur ?? this.DEFAULT_BLUR,
      shadowOffsetX: layer.shadowOffsetX ?? this.DEFAULT_OFFSET_X,
      shadowOffsetY: layer.shadowOffsetY ?? this.DEFAULT_OFFSET_Y,
      shadowOuterGlow: layer.shadowOuterGlow ? 1 : 0,
    });
  }

  static setEnabled(enabled: boolean, context: TextShadowContext): void {
    const layer = context.getActiveTextLayer();
    if (!layer) return;
    layer.shadowEnabled = enabled;
    context.redrawAndSync(layer);
  }

  static setColor(
    color: string | { kind: string; [key: string]: any },
    context: TextShadowContext
  ): void {
    const layer = context.getActiveTextLayer();
    if (!layer) return;

    if (typeof color === "string") {
      layer.shadowColor = color;
    } else if (typeof color === "object" && color !== null) {
      const fill = color as any;
      if (fill.kind === "solid") {
        layer.shadowColor = fill.hex;
      } else {
        layer.shadowColor = fill;
      }
    }
    layer.shadowEnabled = true;
    context.redrawAndSync(layer);
  }

  static clearColor(context: TextShadowContext): void {
    const layer = context.getActiveTextLayer();
    if (!layer) return;
    layer.shadowEnabled = false;
    context.redrawAndSync(layer);
  }

  static setOpacity(opacity: number, context: TextShadowContext): void {
    const layer = context.getActiveTextLayer();
    if (!layer) return;
    layer.shadowOpacity = Math.max(0, Math.min(1, opacity));
    context.redrawAndSync(layer);
  }

  static setBlur(blur: number, context: TextShadowContext): void {
    const layer = context.getActiveTextLayer();
    if (!layer) return;
    layer.shadowBlur = Math.max(0, Math.min(50, Math.round(blur)));
    context.redrawAndSync(layer);
  }

  static setOffsetX(offsetX: number, context: TextShadowContext): void {
    const layer = context.getActiveTextLayer();
    if (!layer) return;
    layer.shadowOffsetX = Math.max(-100, Math.min(100, Math.round(offsetX)));
    context.redrawAndSync(layer);
  }

  static setOffsetY(offsetY: number, context: TextShadowContext): void {
    const layer = context.getActiveTextLayer();
    if (!layer) return;
    layer.shadowOffsetY = Math.max(-100, Math.min(100, Math.round(offsetY)));
    context.redrawAndSync(layer);
  }

  static setOuterGlow(outerGlow: boolean, context: TextShadowContext): void {
    const layer = context.getActiveTextLayer();
    if (!layer) return;
    layer.shadowOuterGlow = outerGlow;
    context.redrawAndSync(layer);
  }

  static reset(context: TextShadowContext): TextShadowState {
    const layer = context.getActiveTextLayer();
    if (!layer) {
      return {
        enabled: false,
        color: this.DEFAULT_COLOR,
        opacity: this.DEFAULT_OPACITY,
        blur: this.DEFAULT_BLUR,
        offsetX: this.DEFAULT_OFFSET_X,
        offsetY: this.DEFAULT_OFFSET_Y,
        outerGlow: false,
      };
    }

    const snap = getSnapshot(this.PANEL_ID, layer.id);
    layer.shadowOpacity = snap ? Number(snap.shadowOpacity) : this.DEFAULT_OPACITY;
    layer.shadowBlur = snap ? Number(snap.shadowBlur) : this.DEFAULT_BLUR;
    layer.shadowOffsetX = snap ? Number(snap.shadowOffsetX) : this.DEFAULT_OFFSET_X;
    layer.shadowOffsetY = snap ? Number(snap.shadowOffsetY) : this.DEFAULT_OFFSET_Y;
    layer.shadowOuterGlow = snap ? Number(snap.shadowOuterGlow) === 1 : false;

    context.redrawAndSync(layer);
    return this.getCurrentState(layer);
  }
}
