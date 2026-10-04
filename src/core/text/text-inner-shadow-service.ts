import type { Layer } from "../layer";
import { captureSnapshot, getSnapshot } from "../panel-state-store";

export interface TextInnerShadowState {
  enabled: boolean;
  color: string | { kind: string; [key: string]: any };
  opacity: number;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export interface TextInnerShadowContext {
  getActiveTextLayer: () => Layer | null | undefined;
  redrawAndSync: (layer?: Layer) => void;
}

export class TextInnerShadowService {
  private static readonly PANEL_ID = "inner-shadow";
  private static readonly DEFAULT_OPACITY = 0.6;
  private static readonly DEFAULT_BLUR = 5;
  private static readonly DEFAULT_OFFSET_X = 0;
  private static readonly DEFAULT_OFFSET_Y = 4;
  private static readonly DEFAULT_COLOR = "#000000";

  static getCurrentState(layer: Layer | null | undefined): TextInnerShadowState {
    return {
      enabled: layer?.innerShadowEnabled ?? false,
      color: layer?.innerShadowColor ?? this.DEFAULT_COLOR,
      opacity: layer?.innerShadowOpacity ?? this.DEFAULT_OPACITY,
      blur: layer?.innerShadowBlur ?? this.DEFAULT_BLUR,
      offsetX: layer?.innerShadowOffsetX ?? this.DEFAULT_OFFSET_X,
      offsetY: layer?.innerShadowOffsetY ?? this.DEFAULT_OFFSET_Y,
    };
  }

  static captureInitialState(layer: Layer | null | undefined): void {
    if (!layer) return;
    captureSnapshot(this.PANEL_ID, layer.id, {
      innerShadowBlur: layer.innerShadowBlur ?? this.DEFAULT_BLUR,
      innerShadowOpacity: layer.innerShadowOpacity ?? this.DEFAULT_OPACITY,
      innerShadowOffsetX: layer.innerShadowOffsetX ?? this.DEFAULT_OFFSET_X,
      innerShadowOffsetY: layer.innerShadowOffsetY ?? this.DEFAULT_OFFSET_Y,
    });
  }

  static setEnabled(enabled: boolean, context: TextInnerShadowContext): void {
    const layer = context.getActiveTextLayer();
    if (!layer) return;
    layer.innerShadowEnabled = enabled;
    context.redrawAndSync(layer);
  }

  static setColor(
    color: string | { kind: string; [key: string]: any },
    context: TextInnerShadowContext
  ): void {
    const layer = context.getActiveTextLayer();
    if (!layer) return;

    if (typeof color === "string") {
      layer.innerShadowColor = color;
    } else if (typeof color === "object" && color !== null) {
      const fill = color as any;
      if (fill.kind === "solid") {
        layer.innerShadowColor = fill.hex;
      } else {
        layer.innerShadowColor = fill;
      }
    }
    layer.innerShadowEnabled = true;
    context.redrawAndSync(layer);
  }

  static clearColor(context: TextInnerShadowContext): void {
    const layer = context.getActiveTextLayer();
    if (!layer) return;
    layer.innerShadowEnabled = false;
    context.redrawAndSync(layer);
  }

  static setOpacity(opacity: number, context: TextInnerShadowContext): void {
    const layer = context.getActiveTextLayer();
    if (!layer) return;
    layer.innerShadowOpacity = Math.max(0, Math.min(1, opacity));
    context.redrawAndSync(layer);
  }

  static setBlur(blur: number, context: TextInnerShadowContext): void {
    const layer = context.getActiveTextLayer();
    if (!layer) return;
    layer.innerShadowBlur = Math.max(0, Math.min(25, Math.round(blur)));
    context.redrawAndSync(layer);
  }

  static setOffsetX(offsetX: number, context: TextInnerShadowContext): void {
    const layer = context.getActiveTextLayer();
    if (!layer) return;
    layer.innerShadowOffsetX = Math.max(-100, Math.min(100, Math.round(offsetX)));
    context.redrawAndSync(layer);
  }

  static setOffsetY(offsetY: number, context: TextInnerShadowContext): void {
    const layer = context.getActiveTextLayer();
    if (!layer) return;
    layer.innerShadowOffsetY = Math.max(-100, Math.min(100, Math.round(offsetY)));
    context.redrawAndSync(layer);
  }

  static reset(context: TextInnerShadowContext): TextInnerShadowState {
    const layer = context.getActiveTextLayer();
    if (!layer) {
      return {
        enabled: false,
        color: this.DEFAULT_COLOR,
        opacity: this.DEFAULT_OPACITY,
        blur: this.DEFAULT_BLUR,
        offsetX: this.DEFAULT_OFFSET_X,
        offsetY: this.DEFAULT_OFFSET_Y,
      };
    }

    const snap = getSnapshot(this.PANEL_ID, layer.id);
    layer.innerShadowBlur = snap ? Number(snap.innerShadowBlur) : this.DEFAULT_BLUR;
    layer.innerShadowOpacity =
      snap && snap.innerShadowOpacity !== undefined
        ? Number(snap.innerShadowOpacity)
        : this.DEFAULT_OPACITY;
    layer.innerShadowOffsetX = snap ? Number(snap.innerShadowOffsetX) : this.DEFAULT_OFFSET_X;
    layer.innerShadowOffsetY = snap ? Number(snap.innerShadowOffsetY) : this.DEFAULT_OFFSET_Y;

    context.redrawAndSync(layer);
    return this.getCurrentState(layer);
  }
}
