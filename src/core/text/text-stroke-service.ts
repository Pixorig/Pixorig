import type { Layer } from "../layer";
import { captureSnapshot, getSnapshot } from "../panel-state-store";

export type StrokeFillKind = "none" | "color" | "image";

export interface TextStrokeState {
  strokeWidth: number;
  strokeFillKind: StrokeFillKind;
  strokeColor: string | { kind: string; [key: string]: any } | null;
  hasImage: boolean;
}

export interface TextStrokeContext {
  getActiveTextLayer: () => Layer | null | undefined;
  redrawAndSync: (layer?: Layer) => void;
}

export class TextStrokeService {
  private static readonly PANEL_ID = "stroke";
  private static readonly DEFAULT_WIDTH = 0;

  static getCurrentState(layer: Layer | null | undefined): TextStrokeState {
    const strokeWidth = layer?.strokeWidth ?? this.DEFAULT_WIDTH;
    const hasImage = !!(layer && layer.strokeImage);
    const strokeColor = layer?.strokeColor ?? null;

    let strokeFillKind: StrokeFillKind = "none";
    if (hasImage) {
      strokeFillKind = "image";
    } else if (strokeColor) {
      strokeFillKind = "color";
    }

    return {
      strokeWidth,
      strokeFillKind,
      strokeColor,
      hasImage,
    };
  }

  static captureInitialState(layer: Layer | null | undefined): void {
    if (!layer) return;
    const state = this.getCurrentState(layer);
    captureSnapshot(this.PANEL_ID, layer.id, {
      strokeWidth: state.strokeWidth,
      strokeFillKind: state.strokeFillKind,
    });
  }

  static applyStrokeWidth(width: number, context: TextStrokeContext): void {
    const layer = context.getActiveTextLayer();
    if (!layer) return;
    layer.strokeWidth = Math.max(0, Math.min(50, Math.round(width)));
    context.redrawAndSync(layer);
  }

  static setColor(
    color: string | { kind: string; [key: string]: any },
    context: TextStrokeContext
  ): void {
    const layer = context.getActiveTextLayer();
    if (!layer) return;

    layer.strokeImage = null;
    if (typeof color === "string") {
      layer.strokeColor = color;
    } else if (typeof color === "object" && color !== null) {
      const fill = color as any;
      layer.strokeColor = fill.kind === "solid" ? fill.hex : fill;
    }

    // Nếu chưa có strokeWidth thì bật mặc định tối thiểu 1 hoặc giữ nguyên
    if (!layer.strokeWidth) {
      layer.strokeWidth = 2;
    }

    context.redrawAndSync(layer);
  }

  static clearColor(context: TextStrokeContext): void {
    const layer = context.getActiveTextLayer();
    if (!layer) return;
    layer.strokeColor = null;
    context.redrawAndSync(layer);
  }

  static setImage(image: HTMLImageElement, context: TextStrokeContext): void {
    const layer = context.getActiveTextLayer();
    if (!layer) return;
    layer.strokeColor = null;
    layer.strokeImage = image;

    if (!layer.strokeWidth) {
      layer.strokeWidth = 2;
    }

    context.redrawAndSync(layer);
  }

  static clearImage(context: TextStrokeContext): void {
    const layer = context.getActiveTextLayer();
    if (!layer) return;
    layer.strokeImage = null;
    context.redrawAndSync(layer);
  }

  static reset(context: TextStrokeContext): TextStrokeState {
    const layer = context.getActiveTextLayer();
    if (!layer) {
      return {
        strokeWidth: this.DEFAULT_WIDTH,
        strokeFillKind: "none",
        strokeColor: null,
        hasImage: false,
      };
    }

    const snap = getSnapshot(this.PANEL_ID, layer.id);
    layer.strokeWidth = snap ? Number(snap.strokeWidth) : this.DEFAULT_WIDTH;

    if (snap) {
      const kind = String(snap.strokeFillKind) as StrokeFillKind;
      if (kind === "none") {
        layer.strokeColor = null;
        layer.strokeImage = null;
      } else if (kind === "image" && !layer.strokeImage) {
        layer.strokeColor = null;
      }
    }

    context.redrawAndSync(layer);
    return this.getCurrentState(layer);
  }
}
