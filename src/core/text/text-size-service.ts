import type { Layer } from "../layer";
import { captureSnapshot, getSnapshot } from "../panel-state-store";

export interface TextSizeContext {
  getActiveTextLayer: () => Layer | null | undefined;
  redrawAndSync: (layer?: Layer) => void;
}

export class TextSizeService {
  private static readonly PANEL_ID = "text-size";
  private static readonly DEFAULT_SIZE = 48;

  static getCurrentSize(layer: Layer | null): number {
    if (!layer || typeof layer.fontSize !== "number") {
      return this.DEFAULT_SIZE;
    }
    return Math.round(layer.fontSize);
  }

  static captureInitialState(layer: Layer | null): void {
    if (!layer) return;
    const currentSize = this.getCurrentSize(layer);
    captureSnapshot(this.PANEL_ID, layer.id, { fontSize: currentSize });
  }

  static applySize(newSize: number, context: TextSizeContext): void {
    const active = context.getActiveTextLayer();
    if (!active) return;
    active.fontSize = newSize;
    context.redrawAndSync(active);
  }

  static resetSize(context: TextSizeContext): number {
    const active = context.getActiveTextLayer();
    if (!active) return this.DEFAULT_SIZE;

    const snap = getSnapshot(this.PANEL_ID, active.id);
    const resetVal = snap ? Number(snap.fontSize) : this.DEFAULT_SIZE;

    active.fontSize = resetVal;
    context.redrawAndSync(active);
    return resetVal;
  }
}
