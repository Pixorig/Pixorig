import type { Layer } from "../layer";
import { captureSnapshot, getSnapshot } from "../panel-state-store";

export interface TextCurveContext {
  getActiveTextLayer: () => Layer | null | undefined;
  redrawAndSync: (layer?: Layer) => void;
}

export class TextCurveService {
  private static readonly PANEL_ID = "curve";
  private static readonly DEFAULT_BEND = 0;

  static getCurrentBend(layer: Layer | null | undefined): number {
    if (!layer || typeof layer.curveBend !== "number") {
      return this.DEFAULT_BEND;
    }
    return Math.round(layer.curveBend);
  }

  static captureInitialState(layer: Layer | null | undefined): void {
    if (!layer) return;
    const currentBend = this.getCurrentBend(layer);
    captureSnapshot(this.PANEL_ID, layer.id, { curveBend: currentBend });
  }

  static applyBend(newBend: number, context: TextCurveContext): void {
    const active = context.getActiveTextLayer();
    if (!active) return;
    active.curveBend = Math.max(-100, Math.min(100, Math.round(newBend)));
    context.redrawAndSync(active);
  }

  static resetBend(context: TextCurveContext): number {
    const active = context.getActiveTextLayer();
    if (!active) return this.DEFAULT_BEND;

    const snap = getSnapshot(this.PANEL_ID, active.id);
    const resetVal = snap ? Number(snap.curveBend) : this.DEFAULT_BEND;

    active.curveBend = resetVal;
    context.redrawAndSync(active);
    return resetVal;
  }
}
