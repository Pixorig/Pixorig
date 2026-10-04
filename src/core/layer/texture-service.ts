import type { Layer } from "../layer";
import { captureSnapshot, getSnapshot } from "../panel-state-store";

export interface TextureState {
  hasImage: boolean;
  textureScale: number; // percent: 10 - 500
}

export interface TextureContext {
  getActiveLayer: () => Layer | null | undefined;
  redrawAndSync: (layer?: Layer) => void;
}

export class TextureService {
  private static readonly PANEL_ID = "texture";
  static readonly MIN_SCALE = 10;
  static readonly MAX_SCALE = 500;
  static readonly DEFAULT_SCALE = 100;

  static getCurrentState(layer: Layer | null | undefined): TextureState {
    const rawScale = typeof layer?.textureScale === "number" ? layer.textureScale : 1.0;
    const scalePercent = Math.round(rawScale * 100);
    return {
      hasImage: !!(layer && layer.textureImage),
      textureScale: Math.max(this.MIN_SCALE, Math.min(this.MAX_SCALE, scalePercent)),
    };
  }

  static captureInitialState(layer: Layer | null | undefined): void {
    if (!layer) return;
    const current = this.getCurrentState(layer);
    captureSnapshot(this.PANEL_ID, layer.id, {
      hasImage: current.hasImage,
      textureScale: current.textureScale,
    });
  }

  static setTextureImage(
    image: HTMLImageElement | null,
    context: TextureContext
  ): TextureState {
    const layer = context.getActiveLayer();
    if (!layer || layer.id === 0) return { hasImage: false, textureScale: this.DEFAULT_SCALE };

    layer.textureImage = image;
    layer._textureCacheCanvas = null;
    context.redrawAndSync(layer);
    return this.getCurrentState(layer);
  }

  static clearTextureImage(context: TextureContext): TextureState {
    return this.setTextureImage(null, context);
  }

  static setTextureScale(
    percent: number,
    context: TextureContext
  ): TextureState {
    const layer = context.getActiveLayer();
    if (!layer || layer.id === 0) {
      return {
        hasImage: false,
        textureScale: Math.max(this.MIN_SCALE, Math.min(this.MAX_SCALE, Math.round(percent))),
      };
    }

    const clampedPercent = Math.max(this.MIN_SCALE, Math.min(this.MAX_SCALE, Math.round(percent)));
    layer.textureScale = clampedPercent / 100;
    layer._textureCacheCanvas = null;
    context.redrawAndSync(layer);
    return this.getCurrentState(layer);
  }

  static resetParameters(context: TextureContext): TextureState {
    const layer = context.getActiveLayer();
    if (!layer || layer.id === 0) {
      return {
        hasImage: false,
        textureScale: this.DEFAULT_SCALE,
      };
    }

    const snap = getSnapshot(this.PANEL_ID, layer.id);
    const resetScale = snap ? Number(snap.textureScale) : this.DEFAULT_SCALE;
    const hadImage = snap ? Boolean(snap.hasImage) : false;

    if (!hadImage) {
      layer.textureImage = null;
    }
    layer.textureScale = resetScale / 100;
    layer._textureCacheCanvas = null;

    context.redrawAndSync(layer);
    return this.getCurrentState(layer);
  }
}
