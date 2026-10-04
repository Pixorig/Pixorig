import type { Layer, TextDecoration } from "../layer";
import { captureSnapshot, getSnapshot } from "../panel-state-store";

export interface TextStyleState {
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  textDecoration: TextDecoration;
  underline: boolean;
}

export interface TextStyleContext {
  getActiveTextLayer: () => Layer | null | undefined;
  redrawAndSync: (layer?: Layer) => void;
}

export class TextStyleService {
  private static readonly PANEL_ID = "text-style";

  static getCurrentStyle(layer: Layer | null | undefined): TextStyleState {
    if (!layer) {
      return {
        fontWeight: "normal",
        fontStyle: "normal",
        textDecoration: "none",
        underline: false,
      };
    }

    const currentDec: TextDecoration =
      layer.textDecoration || (layer.underline ? "underline" : "none");

    return {
      fontWeight: layer.fontWeight === "bold" ? "bold" : "normal",
      fontStyle: layer.fontStyle === "italic" ? "italic" : "normal",
      textDecoration: currentDec,
      underline: currentDec === "underline" || !!layer.underline,
    };
  }

  static captureInitialState(layer: Layer | null | undefined): void {
    if (!layer) return;
    const current = this.getCurrentStyle(layer);
    captureSnapshot(this.PANEL_ID, layer.id, { ...current });
  }

  static toggleBold(context: TextStyleContext): TextStyleState {
    const active = context.getActiveTextLayer();
    if (!active) {
      return {
        fontWeight: "normal",
        fontStyle: "normal",
        textDecoration: "none",
        underline: false,
      };
    }

    active.fontWeight = active.fontWeight === "bold" ? "normal" : "bold";
    context.redrawAndSync(active);
    return this.getCurrentStyle(active);
  }

  static toggleItalic(context: TextStyleContext): TextStyleState {
    const active = context.getActiveTextLayer();
    if (!active) {
      return {
        fontWeight: "normal",
        fontStyle: "normal",
        textDecoration: "none",
        underline: false,
      };
    }

    active.fontStyle = active.fontStyle === "italic" ? "normal" : "italic";
    context.redrawAndSync(active);
    return this.getCurrentStyle(active);
  }

  static toggleDecoration(type: TextDecoration, context: TextStyleContext): TextStyleState {
    const active = context.getActiveTextLayer();
    if (!active) {
      return {
        fontWeight: "normal",
        fontStyle: "normal",
        textDecoration: "none",
        underline: false,
      };
    }

    const current = active.textDecoration || (active.underline ? "underline" : "none");
    const nextDecoration = current === type ? "none" : type;
    active.textDecoration = nextDecoration;
    active.underline = nextDecoration === "underline";

    context.redrawAndSync(active);
    return this.getCurrentStyle(active);
  }

  static clearStyle(context: TextStyleContext): TextStyleState {
    const active = context.getActiveTextLayer();
    if (!active) {
      return {
        fontWeight: "normal",
        fontStyle: "normal",
        textDecoration: "none",
        underline: false,
      };
    }

    active.fontWeight = "normal";
    active.fontStyle = "normal";
    active.textDecoration = "none";
    active.underline = false;

    context.redrawAndSync(active);
    return this.getCurrentStyle(active);
  }

  static resetStyle(context: TextStyleContext): TextStyleState {
    const active = context.getActiveTextLayer();
    if (!active) {
      return {
        fontWeight: "normal",
        fontStyle: "normal",
        textDecoration: "none",
        underline: false,
      };
    }

    const snap = getSnapshot(this.PANEL_ID, active.id);
    if (snap) {
      active.fontWeight = (snap.fontWeight as "normal" | "bold") || "normal";
      active.fontStyle = (snap.fontStyle as "normal" | "italic") || "normal";
      active.textDecoration = (snap.textDecoration as TextDecoration) || "none";
      active.underline = Boolean(snap.underline);
    } else {
      active.fontWeight = "normal";
      active.fontStyle = "normal";
      active.textDecoration = "none";
      active.underline = false;
    }

    context.redrawAndSync(active);
    return this.getCurrentStyle(active);
  }
}
