import type { Layer, LayerManager } from "../layer";
import { eventBus } from "../event-bus";

export type PositionAlignment =
  | "left"
  | "center-h"
  | "right"
  | "top"
  | "center-v"
  | "bottom";

export interface PositionServiceOptions {
  layerManager?: LayerManager;
  canvas?: HTMLCanvasElement | null;
  onPositionChange?: (type: PositionAlignment, layer: Layer) => void;
}

export class PositionService {
  static alignLayer(
    layer: Layer | null | undefined,
    type: PositionAlignment,
    options: PositionServiceOptions = {}
  ): void {
    if (!layer) return;

    const canvas =
      options.canvas ||
      (document.getElementById("canvas") as HTMLCanvasElement | null);
    if (!canvas) return;

    const W = canvas.width;
    const H = canvas.height;

    if (layer.type === "text") {
      const ctx = layer.ctx;
      ctx.font = `${layer.fontStyle} ${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
      const lines = String(layer.text || "").split("\n");
      let maxLineWidth = 0;
      for (const line of lines) {
        const w = ctx.measureText(line).width;
        if (w > maxLineWidth) maxLineWidth = w;
      }
      const textWidth = maxLineWidth;

      // Chiều cao KHỐI chữ (mirror Layer.drawText: baseline dòng đầu ở y,
      // các dòng sau ở y + i*lineHeight, textBaseline mặc định "alphabetic").
      const fs =
        typeof layer.fontSize === "number" && isFinite(layer.fontSize)
          ? layer.fontSize
          : 48;
      const textLines = String(layer.text ?? "").split("\n");
      const textLineHeight = Math.round(fs * 1.2 + (layer.lineSpacing || 0));
      let textAscent = 0;
      let textDescent = 0;
      for (const ln of textLines) {
        const m = ctx.measureText(ln || " ");
        const a =
          typeof m.actualBoundingBoxAscent === "number"
            ? m.actualBoundingBoxAscent
            : fs * 0.8;
        const d =
          typeof m.actualBoundingBoxDescent === "number"
            ? m.actualBoundingBoxDescent
            : fs * 0.2;
        if (a > textAscent) textAscent = a;
        if (d > textDescent) textDescent = d;
      }
      // Block spans (y - ascent) .. (y + (n-1)*lineHeight + descent)
      const textBlockH =
        textAscent + (textLines.length - 1) * textLineHeight + textDescent;

      switch (type) {
        case "left":
          layer.x = 0;
          if (layer.textAlign === "center") layer.x += textWidth / 2;
          else if (layer.textAlign === "right") layer.x += textWidth;
          break;
        case "center-h":
          layer.x = W / 2;
          if (layer.textAlign === "left") layer.x -= textWidth / 2;
          else if (layer.textAlign === "right") layer.x += textWidth / 2;
          break;
        case "right":
          layer.x = W;
          if (layer.textAlign === "left") layer.x -= textWidth;
          else if (layer.textAlign === "center") layer.x -= textWidth / 2;
          break;
        case "top":
          layer.y = textAscent;
          break;
        case "center-v":
          layer.y = (H - textBlockH) / 2 + textAscent;
          break;
        case "bottom":
          layer.y =
            H - textDescent - (textLines.length - 1) * textLineHeight;
          break;
      }

      if (layer.text !== null) {
        layer.drawText(layer.text, layer.x, layer.y);
      }
    } else {
      const layerW = layer.canvas.width || 100;
      const layerH = layer.canvas.height || 100;

      switch (type) {
        case "left":
          layer.x = 0;
          break;
        case "center-h":
          layer.x = (W - layerW) / 2;
          break;
        case "right":
          layer.x = W - layerW;
          break;
        case "top":
          layer.y = 0;
          break;
        case "center-v":
          layer.y = (H - layerH) / 2;
          break;
        case "bottom":
          layer.y = H - layerH;
          break;
      }
    }

    if (options.layerManager) {
      options.layerManager.render();
    }

    eventBus.emit("layer:position-changed", {
      layer,
      type,
      x: layer.x,
      y: layer.y,
    });

    if (options.onPositionChange) {
      options.onPositionChange(type, layer);
    }
  }
}
