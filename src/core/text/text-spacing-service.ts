import type { Layer } from "../layer";
import { captureSnapshot, getSnapshot } from "../panel-state-store";

export interface TextSpacingState {
  letterSpacing: number;
  wordSpacing: number;
}

export interface TextSpacingContext {
  getActiveTextLayer: () => Layer | null | undefined;
  redrawAndSync: (layer?: Layer) => void;
}

export class TextSpacingService {
  private static readonly SPACING_PANEL_ID = "spacing";
  private static readonly LINE_SPACING_PANEL_ID = "line-spacing";

  // --- Letter & Word Spacing ---
  static getSpacingState(layer: Layer | null | undefined): TextSpacingState {
    return {
      letterSpacing: Math.round(layer?.letterSpacing ?? 0),
      wordSpacing: Math.round(layer?.wordSpacing ?? 0),
    };
  }

  static captureSpacingInitial(layer: Layer | null | undefined): void {
    if (!layer) return;
    captureSnapshot(this.SPACING_PANEL_ID, layer.id, {
      letterSpacing: layer.letterSpacing ?? 0,
      wordSpacing: layer.wordSpacing ?? 0,
    });
  }

  static setLetterSpacing(val: number, context: TextSpacingContext): void {
    const layer = context.getActiveTextLayer();
    if (!layer) return;
    layer.letterSpacing = Math.round(val);
    context.redrawAndSync(layer);
  }

  static setWordSpacing(val: number, context: TextSpacingContext): void {
    const layer = context.getActiveTextLayer();
    if (!layer) return;
    layer.wordSpacing = Math.round(val);
    context.redrawAndSync(layer);
  }

  static resetSpacing(context: TextSpacingContext): TextSpacingState {
    const layer = context.getActiveTextLayer();
    if (!layer) return { letterSpacing: 0, wordSpacing: 0 };

    const snap = getSnapshot(this.SPACING_PANEL_ID, layer.id);
    layer.letterSpacing = snap ? Number(snap.letterSpacing) : 0;
    layer.wordSpacing = snap ? Number(snap.wordSpacing) : 0;
    context.redrawAndSync(layer);
    return this.getSpacingState(layer);
  }

  // --- Line Spacing ---
  static getLineSpacing(layer: Layer | null | undefined): number {
    return Math.round(layer?.lineSpacing ?? 0);
  }

  static captureLineSpacingInitial(layer: Layer | null | undefined): void {
    if (!layer) return;
    captureSnapshot(this.LINE_SPACING_PANEL_ID, layer.id, {
      lineSpacing: layer.lineSpacing ?? 0,
    });
  }

  static setLineSpacing(val: number, context: TextSpacingContext): void {
    const layer = context.getActiveTextLayer();
    if (!layer) return;
    layer.lineSpacing = Math.round(val);
    context.redrawAndSync(layer);
  }

  static resetLineSpacing(context: TextSpacingContext): number {
    const layer = context.getActiveTextLayer();
    if (!layer) return 0;

    const snap = getSnapshot(this.LINE_SPACING_PANEL_ID, layer.id);
    const resetVal = snap ? Number(snap.lineSpacing) : 0;
    layer.lineSpacing = resetVal;
    context.redrawAndSync(layer);
    return resetVal;
  }
}
