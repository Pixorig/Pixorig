import type { Layer } from "../layer";
import { captureSnapshot, getSnapshot } from "../panel-state-store";

export interface TextEmbossState {
  enabled: boolean;
  angle: number;
  intensity: number;
  ambient: number;
  hardness: number;
  bevel: number;
}

export interface TextEmbossContext {
  getActiveTextLayer: () => Layer | null | undefined;
  redrawAndSync: (layer?: Layer) => void;
}

export class TextEmbossService {
  private static readonly PANEL_ID = "emboss";

  private static readonly DEFAULTS: TextEmbossState = {
    enabled: false,
    angle: 90,
    intensity: 50,
    ambient: 50,
    hardness: 20,
    bevel: 3,
  };

  static getState(layer: Layer | null | undefined): TextEmbossState {
    if (!layer) {
      return { ...this.DEFAULTS };
    }

    return {
      enabled: !!layer.embossEnabled,
      angle: typeof layer.embossAngle === "number" ? layer.embossAngle : this.DEFAULTS.angle,
      intensity: typeof layer.embossIntensity === "number" ? layer.embossIntensity : this.DEFAULTS.intensity,
      ambient: typeof layer.embossAmbient === "number" ? layer.embossAmbient : this.DEFAULTS.ambient,
      hardness: typeof layer.embossHardness === "number" ? layer.embossHardness : this.DEFAULTS.hardness,
      bevel: typeof layer.embossBevel === "number" ? layer.embossBevel : this.DEFAULTS.bevel,
    };
  }

  static captureInitialState(layer: Layer | null | undefined): void {
    if (!layer) return;
    const current = this.getState(layer);
    captureSnapshot(this.PANEL_ID, layer.id, {
      embossAngle: current.angle,
      embossIntensity: current.intensity,
      embossAmbient: current.ambient,
      embossHardness: current.hardness,
      embossBevel: current.bevel,
    });
  }

  static setEnabled(enabled: boolean, context: TextEmbossContext): TextEmbossState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, enabled };

    active.embossEnabled = enabled;
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static setAngle(angle: number, context: TextEmbossContext): TextEmbossState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, angle };

    const normalized = ((Math.round(angle) % 360) + 360) % 360;
    active.embossAngle = normalized;
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static setIntensity(intensity: number, context: TextEmbossContext): TextEmbossState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, intensity };

    active.embossIntensity = Math.max(0, Math.min(100, Math.round(intensity)));
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static setAmbient(ambient: number, context: TextEmbossContext): TextEmbossState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, ambient };

    active.embossAmbient = Math.max(0, Math.min(100, Math.round(ambient)));
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static setHardness(hardness: number, context: TextEmbossContext): TextEmbossState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, hardness };

    active.embossHardness = Math.max(0, Math.min(100, Math.round(hardness)));
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static setBevel(bevel: number, context: TextEmbossContext): TextEmbossState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, bevel };

    active.embossBevel = Math.max(0, Math.min(100, Math.round(bevel)));
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static resetEmboss(context: TextEmbossContext): TextEmbossState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS };

    const snap = getSnapshot(this.PANEL_ID, active.id);
    active.embossAngle = snap ? Number(snap.embossAngle) : this.DEFAULTS.angle;
    active.embossIntensity = snap ? Number(snap.embossIntensity) : this.DEFAULTS.intensity;
    active.embossAmbient = snap ? Number(snap.embossAmbient) : this.DEFAULTS.ambient;
    active.embossHardness = snap ? Number(snap.embossHardness) : this.DEFAULTS.hardness;
    active.embossBevel = snap ? Number(snap.embossBevel) : this.DEFAULTS.bevel;

    context.redrawAndSync(active);
    return this.getState(active);
  }
}
