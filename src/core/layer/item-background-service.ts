import type { Layer } from "../layer";
import { captureSnapshot, getSnapshot } from "../panel-state-store";

export interface ItemBackgroundState {
  itemBgColor: string | { kind: string; [key: string]: any } | null;
  hasImage: boolean;
  itemBgPaddingLeft: number;
  itemBgPaddingRight: number;
  itemBgPaddingTop: number;
  itemBgPaddingBottom: number;
  itemBgRadius: number;
}

export interface ItemBackgroundContext {
  getActiveLayer: () => Layer | null | undefined;
  redrawAndSync: (layer?: Layer) => void;
  getBounds?: (layer: Layer) => { width: number; height: number } | null;
}

export class ItemBackgroundService {
  private static readonly PANEL_ID = "item-bg";

  static getCurrentState(layer: Layer | null | undefined): ItemBackgroundState {
    return {
      itemBgColor: layer?.itemBgColor ?? null,
      hasImage: !!(layer && layer.itemBgImage),
      itemBgPaddingLeft: Math.round(layer?.itemBgPaddingLeft ?? 0),
      itemBgPaddingRight: Math.round(layer?.itemBgPaddingRight ?? 0),
      itemBgPaddingTop: Math.round(layer?.itemBgPaddingTop ?? 0),
      itemBgPaddingBottom: Math.round(layer?.itemBgPaddingBottom ?? 0),
      itemBgRadius: Math.round(layer?.itemBgRadius ?? 0),
    };
  }

  static captureInitialState(layer: Layer | null | undefined): void {
    if (!layer) return;
    captureSnapshot(this.PANEL_ID, layer.id, {
      itemBgPaddingLeft: layer.itemBgPaddingLeft ?? 0,
      itemBgPaddingRight: layer.itemBgPaddingRight ?? 0,
      itemBgPaddingTop: layer.itemBgPaddingTop ?? 0,
      itemBgPaddingBottom: layer.itemBgPaddingBottom ?? 0,
      itemBgRadius: layer.itemBgRadius ?? 0,
    });
  }

  static setColor(
    color: string | { kind: string; [key: string]: any } | null,
    context: ItemBackgroundContext
  ): void {
    const layer = context.getActiveLayer();
    if (!layer) return;
    layer.itemBgImage = null;
    layer.itemBgColor = color;
    context.redrawAndSync(layer);
  }

  static clearColor(context: ItemBackgroundContext): void {
    const layer = context.getActiveLayer();
    if (!layer) return;
    layer.itemBgColor = null;
    context.redrawAndSync(layer);
  }

  static setImage(image: HTMLImageElement | null, context: ItemBackgroundContext): void {
    const layer = context.getActiveLayer();
    if (!layer) return;
    layer.itemBgColor = null;
    layer.itemBgImage = image;
    context.redrawAndSync(layer);
  }

  static clearImage(context: ItemBackgroundContext): void {
    const layer = context.getActiveLayer();
    if (!layer) return;
    layer.itemBgImage = null;
    context.redrawAndSync(layer);
  }

  static setPadding(
    side: "left" | "right" | "top" | "bottom",
    val: number,
    context: ItemBackgroundContext
  ): void {
    const layer = context.getActiveLayer();
    if (!layer) return;
    const rounded = Math.round(val);
    switch (side) {
      case "left": layer.itemBgPaddingLeft = rounded; break;
      case "right": layer.itemBgPaddingRight = rounded; break;
      case "top": layer.itemBgPaddingTop = rounded; break;
      case "bottom": layer.itemBgPaddingBottom = rounded; break;
    }
    context.redrawAndSync(layer);
  }

  static setRadius(radius: number, context: ItemBackgroundContext): void {
    const layer = context.getActiveLayer();
    if (!layer) return;
    layer.itemBgRadius = Math.max(0, Math.min(100, Math.round(radius)));
    context.redrawAndSync(layer);
  }

  static resetParameters(context: ItemBackgroundContext): ItemBackgroundState {
    const layer = context.getActiveLayer();
    if (!layer) {
      return {
        itemBgColor: null,
        hasImage: false,
        itemBgPaddingLeft: 0,
        itemBgPaddingRight: 0,
        itemBgPaddingTop: 0,
        itemBgPaddingBottom: 0,
        itemBgRadius: 0,
      };
    }

    const snap = getSnapshot(this.PANEL_ID, layer.id);
    layer.itemBgPaddingLeft = snap ? Number(snap.itemBgPaddingLeft) : 0;
    layer.itemBgPaddingRight = snap ? Number(snap.itemBgPaddingRight) : 0;
    layer.itemBgPaddingTop = snap ? Number(snap.itemBgPaddingTop) : 0;
    layer.itemBgPaddingBottom = snap ? Number(snap.itemBgPaddingBottom) : 0;
    layer.itemBgRadius = snap ? Number(snap.itemBgRadius) : 0;

    context.redrawAndSync(layer);
    return this.getCurrentState(layer);
  }
}
