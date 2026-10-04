import type { Layer } from "../layer";
import { captureSnapshot, getSnapshot } from "../panel-state-store";

export interface TextReflectionState {
  enabled: boolean;
  opacity: number; // 0 ~ 100 (%)
  distance: number; // -100 ~ 100
}

export interface TextReflectionContext {
  getActiveTextLayer: () => Layer | null | undefined;
  redrawAndSync: (layer?: Layer) => void;
}

export class TextReflectionService {
  private static readonly PANEL_ID = "reflection";

  private static readonly DEFAULTS: TextReflectionState = {
    enabled: false,
    opacity: 45,
    distance: 0,
  };

  static getState(layer: Layer | null | undefined): TextReflectionState {
    if (!layer) {
      return { ...this.DEFAULTS };
    }

    const distance =
      typeof layer.reflectionDistance === "number"
        ? layer.reflectionDistance
        : typeof layer.reflectionOffset === "number"
        ? layer.reflectionOffset
        : this.DEFAULTS.distance;

    const opacity =
      typeof layer.reflectionOpacity === "number"
        ? Math.round(layer.reflectionOpacity * 100)
        : this.DEFAULTS.opacity;

    return {
      enabled: !!layer.reflectionEnabled,
      opacity,
      distance,
    };
  }

  static captureInitialState(layer: Layer | null | undefined): void {
    if (!layer) return;
    const current = this.getState(layer);
    captureSnapshot(this.PANEL_ID, layer.id, {
      reflectionOffset: current.distance,
      reflectionDistance: current.distance,
      reflectionOpacity: current.opacity,
    });
  }

  static setEnabled(enabled: boolean, context: TextReflectionContext): TextReflectionState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, enabled };

    active.reflectionEnabled = enabled;
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static setOpacity(opacityPercent: number, context: TextReflectionContext): TextReflectionState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, opacity: opacityPercent };

    const clampedPercent = Math.max(0, Math.min(100, Math.round(opacityPercent)));
    active.reflectionOpacity = clampedPercent / 100;
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static setDistance(distance: number, context: TextReflectionContext): TextReflectionState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS, distance };

    const clampedDistance = Math.max(-100, Math.min(100, Math.round(distance)));
    active.reflectionOffset = clampedDistance;
    active.reflectionDistance = clampedDistance;
    context.redrawAndSync(active);
    return this.getState(active);
  }

  static resetReflection(context: TextReflectionContext): TextReflectionState {
    const active = context.getActiveTextLayer();
    if (!active) return { ...this.DEFAULTS };

    const snap = getSnapshot(this.PANEL_ID, active.id);
    const resetDistance = snap
      ? Number(snap.reflectionDistance ?? snap.reflectionOffset ?? this.DEFAULTS.distance)
      : this.DEFAULTS.distance;
    const resetOpacity = snap
      ? Number(snap.reflectionOpacity ?? this.DEFAULTS.opacity)
      : this.DEFAULTS.opacity;

    active.reflectionOffset = resetDistance;
    active.reflectionDistance = resetDistance;
    active.reflectionOpacity = resetOpacity / 100;

    context.redrawAndSync(active);
    return this.getState(active);
  }
}
