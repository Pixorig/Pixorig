import type { Layer } from "../layer";
import { captureSnapshot, getSnapshot } from "../panel-state-store";
import { resolveEffectiveAlign, type TextBounds } from "../../text/text-transform";

export interface TextAlignState {
  textAlign: CanvasTextAlign;
  textJustify: boolean;
}

export interface TextAlignContext {
  getActiveTextLayer: () => Layer | null | undefined;
  redrawAndSync: (layer?: Layer) => void;
  getBounds?: (layer: Layer) => TextBounds | null;
}

export class TextAlignService {
  private static readonly PANEL_ID = "text-align";

  static getCurrentState(layer: Layer | null | undefined): TextAlignState {
    return {
      textAlign: layer?.textAlign || "left",
      textJustify: !!layer?.textJustify,
    };
  }

  static captureInitialState(layer: Layer | null | undefined): void {
    if (!layer) return;
    captureSnapshot(this.PANEL_ID, layer.id, {
      textAlign: layer.textAlign || "left",
      textJustify: !!layer.textJustify,
    });
  }

  static applyAlign(align: CanvasTextAlign, context: TextAlignContext): TextAlignState {
    const target = context.getActiveTextLayer();
    if (!target) {
      return { textAlign: align, textJustify: false };
    }

    if (target.textAlign === align) {
      return this.getCurrentState(target);
    }

    const bounds = context.getBounds?.(target);
    if (bounds) {
      const textW = bounds.textWidth;
      const textStr = target.text || "";
      const oldEff = resolveEffectiveAlign(target.textAlign, textStr);
      const newEff = resolveEffectiveAlign(align, textStr);

      let x0 = target.x;
      if (oldEff === "center") {
        x0 = target.x - textW / 2;
      } else if (oldEff === "right") {
        x0 = target.x - textW;
      }

      if (newEff === "center") {
        target.x = x0 + textW / 2;
      } else if (newEff === "right") {
        target.x = x0 + textW;
      } else {
        target.x = x0;
      }
    }

    target.textAlign = align;
    context.redrawAndSync(target);
    return this.getCurrentState(target);
  }

  static toggleJustify(context: TextAlignContext): TextAlignState {
    const target = context.getActiveTextLayer();
    if (!target) {
      return { textAlign: "left", textJustify: false };
    }

    target.textJustify = !target.textJustify;
    context.redrawAndSync(target);
    return this.getCurrentState(target);
  }

  static resetAlign(context: TextAlignContext): TextAlignState {
    const target = context.getActiveTextLayer();
    if (!target) {
      return { textAlign: "left", textJustify: false };
    }

    const snap = getSnapshot(this.PANEL_ID, target.id);
    const prevAlign: CanvasTextAlign = (snap?.textAlign as CanvasTextAlign) || "left";
    const prevJustify: boolean = snap ? Boolean(snap.textJustify) : false;

    target.textJustify = prevJustify;
    this.applyAlign(prevAlign, context);
    return this.getCurrentState(target);
  }
}
