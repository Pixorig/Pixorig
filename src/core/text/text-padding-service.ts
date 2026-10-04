import type { Layer } from "../layer";
import { captureSnapshot, getSnapshot } from "../panel-state-store";

export interface TextPaddingContext {
  getActiveTextLayer: () => Layer | null | undefined;
  redrawAndSync: (layer?: Layer) => void;
}

export interface TextPaddingState {
  paddingLeft: number;
  paddingRight: number;
}

export class TextPaddingService {
  private static readonly PANEL_ID = "padding";

  static getCurrentPadding(layer: Layer | null | undefined): TextPaddingState {
    const left = layer?.paddingLeft ? Math.round(layer.paddingLeft) : 0;
    const right = layer?.paddingRight ? Math.round(layer.paddingRight) : 0;
    return { paddingLeft: left, paddingRight: right };
  }

  static captureInitialState(layer: Layer | null | undefined): void {
    if (!layer) return;
    const current = this.getCurrentPadding(layer);
    captureSnapshot(this.PANEL_ID, layer.id, {
      paddingLeft: current.paddingLeft,
      paddingRight: current.paddingRight,
    });
  }

  static applyPadding(
    side: "left" | "right",
    val: number,
    context: TextPaddingContext
  ): void {
    const active = context.getActiveTextLayer();
    if (!active) return;
    if (side === "left") {
      active.paddingLeft = Math.round(val);
    } else {
      active.paddingRight = Math.round(val);
    }
    context.redrawAndSync(active);
  }

  static resetPadding(context: TextPaddingContext): TextPaddingState {
    const active = context.getActiveTextLayer();
    if (!active) return { paddingLeft: 0, paddingRight: 0 };

    const snap = getSnapshot(this.PANEL_ID, active.id);
    const resetLeft = snap ? Number(snap.paddingLeft) : 0;
    const resetRight = snap ? Number(snap.paddingRight) : 0;

    active.paddingLeft = resetLeft;
    active.paddingRight = resetRight;
    context.redrawAndSync(active);

    return { paddingLeft: resetLeft, paddingRight: resetRight };
  }
}
