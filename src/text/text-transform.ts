/**
 * Text Transform Module - TypeScript
 * Handles hit-testing, dragging, font resizing, rotating, and in-place canvas editing
 */

import { Layer, LayerManager } from "../core/layer";
import { eventBus } from "../core/event-bus";
import { ColorModule } from "../modules/color";

export interface TextBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  textWidth: number;
  x0: number;
  resizeHandleX: number;
  resizeHandleY: number;
  resizeHandleSize: number;
}

export interface TextEditingOptions {
  deleteBackward?: boolean;
  deleteForward?: boolean;
  insertText?: string;
}

/**
 * Checks if text contains RTL characters (Arabic, Hebrew, etc.)
 */
export function isRTL(text: string): boolean {
  return /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/.test(text);
}

/**
 * Tính bbox alpha của shadow vừa vẽ trên offscreen canvas (quét theo bước 8px,
 * nới 1 ô + margin). Dùng để dựng gradient/pattern phủ kín toàn bộ vùng shadow
 * (gồm cả phần tràn ngoài bounds chữ + blur) thay vì chỉ bounds chữ.
 * Trả về toạ độ pixel; null nếu canvas trống/hết bộ nhớ.
 */
export function collectShadowBBox(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  margin: number
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  try {
    const img = ctx.getImageData(0, 0, width, height);
    const data = img.data;
    const step = 8;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y += step) {
      const rowOff = y * width * 4;
      for (let x = 0; x < width; x += step) {
        if (data[rowOff + x * 4 + 3] !== 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null;
    minX = Math.max(0, minX - step - margin);
    minY = Math.max(0, minY - step - margin);
    maxX = Math.min(width - 1, maxX + step + margin);
    maxY = Math.min(height - 1, maxY + step + margin);
    return { minX, minY, maxX, maxY };
  } catch {
    return null;
  }
}

/**
 * Resolves CanvasTextAlign ("left" | "right" | "center" | "start" | "end")
 * to absolute alignment ("left" | "right" | "center") based on text direction (LTR / RTL)
 */
export function resolveEffectiveAlign(
  align: CanvasTextAlign,
  text: string
): "left" | "right" | "center" {
  if (align === "center") return "center";
  const rtl = isRTL(text);
  if (align === "start") return rtl ? "right" : "left";
  if (align === "end") return rtl ? "left" : "right";
  return align === "right" ? "right" : "left";
}

export class TextTransform {
  canvas: HTMLCanvasElement;
  layerManager: LayerManager;
  isDragging = false;
  isResizing = false;
  isEditing = false;
  selectedLayer: Layer | null = null;
  dragStartX = 0;
  dragStartY = 0;
  textStartX = 0;
  textStartY = 0;
  resizeStartY = 0;
  textStartSize = 0;
  cursorMode: "default" | "move" | "ns-resize" = "default";
  editorEl: HTMLTextAreaElement | null = null;
  editingLayer: Layer | null = null;
  editingOriginalText = "";

  // Perspective mode state
  isPerspectiveMode = false;
  activePerspectiveCorner: "tl" | "tr" | "br" | "bl" | null = null;
  perspectiveStartPos: { x: number; y: number } = { x: 0, y: 0 };
  perspectiveStartOffset: { x: number; y: number } = { x: 0, y: 0 };

  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  private boundMouseLeave: (e: MouseEvent) => void;
  private boundDoubleClick: (e: MouseEvent) => void;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private unsubscribers: Array<() => void> = [];

  constructor(canvas: HTMLCanvasElement, layerManager: LayerManager) {
    this.canvas = canvas;
    this.layerManager = layerManager;

    this.boundMouseDown = this.handleMouseDown.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseUp = this.handleMouseUp.bind(this);
    this.boundMouseLeave = this.handleMouseLeave.bind(this);
    this.boundDoubleClick = this.handleDoubleClick.bind(this);
    this.boundKeyDown = this.handleKeyDown.bind(this);

    this.initEventListeners();
    this.initEventBus();

    // Expose to window for backwards compatibility if needed
    (window as unknown as { textTransform?: TextTransform }).textTransform = this;
  }

  /**
   * Initialize canvas and keyboard event listeners
   */
  initEventListeners(): void {
    this.canvas.addEventListener("mousedown", this.boundMouseDown);
    this.canvas.addEventListener("mousemove", this.boundMouseMove);
    this.canvas.addEventListener("mouseup", this.boundMouseUp);
    this.canvas.addEventListener("mouseleave", this.boundMouseLeave);
    this.canvas.addEventListener("dblclick", this.boundDoubleClick);
    document.addEventListener("keydown", this.boundKeyDown);
  }

  /**
   * Register event listeners via eventBus
   */
  private initEventBus(): void {
    const unsubSelect = eventBus.on<Layer>("layer:selected", (layer) => {
      if (layer && layer.type === "text") {
        this.selectedLayer = layer;
      } else {
        this.selectedLayer = null;
      }
    });

    const unsubRedraw = eventBus.on<Layer>("text:redraw", (layer) => {
      if (layer) {
        this.redrawTextLayer(layer);
        this.layerManager.render();
        if (this.selectedLayer?.id === layer.id) {
          this.drawSelectionOverlay(layer);
        }
      }
    });

    this.unsubscribers.push(unsubSelect, unsubRedraw);
  }

  destroy(): void {
    this.canvas.removeEventListener("mousedown", this.boundMouseDown);
    this.canvas.removeEventListener("mousemove", this.boundMouseMove);
    this.canvas.removeEventListener("mouseup", this.boundMouseUp);
    this.canvas.removeEventListener("mouseleave", this.boundMouseLeave);
    this.canvas.removeEventListener("dblclick", this.boundDoubleClick);
    document.removeEventListener("keydown", this.boundKeyDown);
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
  }

  /**
   * Get scale-adjusted mouse position on canvas
   */
  getMousePos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  /**
   * Calculate text layer bounding box (supports curved text, padding, alignment)
   */
  getTextBounds(layer: Layer | null): TextBounds | null {
    if (
      !layer ||
      layer.type !== "text" ||
      layer.text === null ||
      layer.text === undefined
    ) {
      return null;
    }

    const ctx = layer.ctx;
    const weight = layer.fontWeight || "normal";
    const style = layer.fontStyle || "normal";
    ctx.font = `${style} ${weight} ${layer.fontSize}px ${layer.fontFamily}`;
    if ("letterSpacing" in ctx) {
      const ls = layer.letterSpacing || 0;
      (ctx as any).letterSpacing = ls !== 0 ? `${ls}px` : "0px";
    }
    if ("wordSpacing" in ctx) {
      const ws = layer.wordSpacing || 0;
      (ctx as any).wordSpacing = ws !== 0 ? `${ws}px` : "0px";
    }

    const lines = String(layer.text).split("\n");
    const widths = lines.map((line) => ctx.measureText(line).width);
    const width = Math.max(10, ...widths);
    const lineHeight = Math.round(layer.fontSize * 1.2 + (layer.lineSpacing || 0));
    const extraBottom = Math.round(layer.fontSize * 0.35);

    // Curve sagitta: space for curved text arc
    // curveHorzPad: extra horizontal space for rotated curved glyphs
    let curveSagitta = 0;
    let curveHorzPad = 0;
    if (layer.curveBend && layer.curveBend !== 0) {
      const bendAbs = Math.abs(layer.curveBend);
      const halfAngleRad = ((bendAbs * 1.8) / 2) * (Math.PI / 180);
      if (halfAngleRad > 0.01 && width > 1) {
        const R = Math.max(width, 1) / 2 / Math.sin(halfAngleRad);
        curveSagitta = R * (1 - Math.cos(halfAngleRad));
        curveHorzPad =
          layer.fontSize * Math.sin(Math.min(halfAngleRad, Math.PI / 2));
      }
    }

    const height = Math.max(
      layer.fontSize,
      (Math.max(1, lines.length) - 1) * lineHeight +
        layer.fontSize +
        extraBottom +
        curveSagitta
    );

    const pLeft = layer.paddingLeft || 0;
    const pRight = layer.paddingRight || 0;

    const effAlign = resolveEffectiveAlign(layer.textAlign, layer.text || "");
    let x0 = layer.x;
    if (effAlign === "center") {
      x0 = layer.x - width / 2;
    } else if (effAlign === "right") {
      x0 = layer.x - width;
    }

    const boundsX = x0 - pLeft - curveHorzPad;
    const boundsWidth = Math.max(1, width + pLeft + pRight + 2 * curveHorzPad);
    const bottomBaselineY =
      layer.y + Math.max(0, lines.length - 1) * lineHeight + extraBottom;

    // Shift top if curve bends upwards (bend > 0)
    const topShift = layer.curveBend && layer.curveBend > 0 ? curveSagitta : 0;

    return {
      x: boundsX,
      y: layer.y - layer.fontSize - topShift,
      width: boundsWidth,
      height: height + topShift,
      textWidth: width,
      x0,
      resizeHandleX: boundsX + boundsWidth,
      resizeHandleY: bottomBaselineY,
      resizeHandleSize: 12,
    };
  }

  /**
   * Check if mouse coordinate is inside bounding box
   */
  isPointInText(x: number, y: number, bounds: TextBounds | null): boolean {
    if (!bounds) return false;
    return (
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height
    );
  }

  /**
   * Check if mouse coordinate is inside resize handle
   */
  isPointInResizeHandle(
    x: number,
    y: number,
    bounds: TextBounds | null
  ): boolean {
    if (!bounds) return false;
    const handleX = bounds.resizeHandleX;
    const handleY = bounds.resizeHandleY;
    const size = bounds.resizeHandleSize;

    return (
      x >= handleX - size &&
      x <= handleX + size &&
      y >= handleY - size &&
      y <= handleY + size
    );
  }

  /**
   * Get 4 corner positions of perspective box on canvas
   */
  getPerspectiveCornerPoints(layer: Layer, bounds: TextBounds): {
    tl: { x: number; y: number };
    tr: { x: number; y: number };
    br: { x: number; y: number };
    bl: { x: number; y: number };
  } {
    const pts = layer.perspectivePoints || {
      tl: { x: 0, y: 0 },
      tr: { x: 0, y: 0 },
      br: { x: 0, y: 0 },
      bl: { x: 0, y: 0 },
    };
    return {
      tl: { x: bounds.x - 10 + pts.tl.x, y: bounds.y - 10 + pts.tl.y },
      tr: { x: bounds.x + bounds.width + 10 + pts.tr.x, y: bounds.y - 10 + pts.tr.y },
      br: { x: bounds.x + bounds.width + 10 + pts.br.x, y: bounds.y + bounds.height + 10 + pts.br.y },
      bl: { x: bounds.x - 10 + pts.bl.x, y: bounds.y + bounds.height + 10 + pts.bl.y },
    };
  }

  /**
   * Find if point is near one of the 4 perspective corners
   */
  findPerspectiveCornerAt(
    x: number,
    y: number,
    layer: Layer,
    bounds: TextBounds
  ): "tl" | "tr" | "br" | "bl" | null {
    const corners = this.getPerspectiveCornerPoints(layer, bounds);
    const radius = 14;
    const distSq = (p1: { x: number; y: number }, p2: { x: number; y: number }) =>
      (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;

    if (distSq({ x, y }, corners.tl) <= radius ** 2) return "tl";
    if (distSq({ x, y }, corners.tr) <= radius ** 2) return "tr";
    if (distSq({ x, y }, corners.br) <= radius ** 2) return "br";
    if (distSq({ x, y }, corners.bl) <= radius ** 2) return "bl";
    return null;
  }

  /**
   * Find text layer at mouse position (traversing top-down zIndex)
   */
  findTextLayerAt(
    x: number,
    y: number
  ): { layer: Layer; bounds: TextBounds } | null {
    const layers = [...this.layerManager.layers]
      .filter((l) => l.type === "text" && l.visible && !l.locked)
      .sort((a, b) => b.zIndex - a.zIndex);

    for (const layer of layers) {
      const bounds = this.getTextBounds(layer);
      if (bounds && this.isPointInText(x, y, bounds)) {
        return { layer, bounds };
      }
    }

    return null;
  }

  /**
   * Handle mousedown event
   */
  handleMouseDown(e: MouseEvent): void {
    if (this.isEditing) return;
    const pos = this.getMousePos(e);

    // Kéo corner perspective nếu đang bật perspective mode VÀ Enabled đang bật
    if (this.isPerspectiveMode && this.selectedLayer?.perspectiveEnabled) {
      const bounds = this.getTextBounds(this.selectedLayer);
      if (bounds) {
        const corner = this.findPerspectiveCornerAt(pos.x, pos.y, this.selectedLayer, bounds);
        if (corner) {
          this.activePerspectiveCorner = corner;
          this.perspectiveStartPos = { x: pos.x, y: pos.y };
          const curPts = this.selectedLayer.perspectivePoints || {
            tl: { x: 0, y: 0 },
            tr: { x: 0, y: 0 },
            br: { x: 0, y: 0 },
            bl: { x: 0, y: 0 },
          };
          this.perspectiveStartOffset = { ...curPts[corner] };
          this.canvas.style.cursor = "crosshair";
          return;
        }
      }
    }

    const result = this.findTextLayerAt(pos.x, pos.y);

    if (result) {
      const { layer, bounds } = result;

      if (this.isPointInResizeHandle(pos.x, pos.y, bounds)) {
        this.isResizing = true;
        this.selectedLayer = layer;
        this.resizeStartY = pos.y;
        this.textStartSize = layer.fontSize;
        this.canvas.style.cursor = "ns-resize";
      } else {
        this.isDragging = true;
        this.selectedLayer = layer;
        this.dragStartX = pos.x;
        this.dragStartY = pos.y;
        this.textStartX = layer.x;
        this.textStartY = layer.y;
        this.canvas.style.cursor = "move";
      }

      this.layerManager.setActiveLayer(layer.id);
      eventBus.emit("text:selected", layer);
      eventBus.emit("text:show-properties");

      const textSection = document.querySelector(
        '.sidebar-section[data-section="text"]'
      );
      if (textSection) {
        document
          .querySelectorAll(".sidebar-section")
          .forEach((s) => s.classList.remove("active"));
        textSection.classList.add("active");
      }
      const subSidebar = document.getElementById("sub-sidebar");
      const body = document.getElementById("body");
      if (subSidebar) subSidebar.classList.remove("hidden");
      if (body) body.classList.add("sub-open");
    } else {
      this.selectedLayer = null;
      this.layerManager.setActiveLayer(0);
      this.canvas.style.cursor = "default";
      this.layerManager.render();
      eventBus.emit("text:deselected");
      eventBus.emit("text:hide-properties");
    }
  }

  /**
   * Handle mousemove event
   */
  handleMouseMove(e: MouseEvent): void {
    if (this.isEditing) return;
    const pos = this.getMousePos(e);

    // Kéo corner perspective (chỉ khi Enabled đang bật)
    if (this.activePerspectiveCorner && this.selectedLayer?.perspectiveEnabled) {
      const dx = pos.x - this.perspectiveStartPos.x;
      const dy = pos.y - this.perspectiveStartPos.y;
      if (!this.selectedLayer.perspectivePoints) {
        this.selectedLayer.perspectivePoints = {
          tl: { x: 0, y: 0 },
          tr: { x: 0, y: 0 },
          br: { x: 0, y: 0 },
          bl: { x: 0, y: 0 },
        };
      }
      this.selectedLayer.perspectivePoints[this.activePerspectiveCorner] = {
        x: this.perspectiveStartOffset.x + dx,
        y: this.perspectiveStartOffset.y + dy,
      };
      this.selectedLayer.perspectiveEnabled = true;
      this.redrawTextLayer(this.selectedLayer);
      this.layerManager.render();
      this.drawSelectionOverlay(this.selectedLayer);
      return;
    }

    if (this.isDragging && this.selectedLayer) {
      const dx = pos.x - this.dragStartX;
      const dy = pos.y - this.dragStartY;

      this.selectedLayer.x = this.textStartX + dx;
      this.selectedLayer.y = this.textStartY + dy;

      this.redrawTextLayer(this.selectedLayer);
      this.layerManager.render();
      this.drawSelectionOverlay(this.selectedLayer);
      eventBus.emit("text:moved", {
        layer: this.selectedLayer,
        x: this.selectedLayer.x,
        y: this.selectedLayer.y,
      });
    } else if (this.isResizing && this.selectedLayer) {
      const dy = pos.y - this.resizeStartY;
      const newSize = Math.max(10, this.textStartSize + dy);

      this.selectedLayer.fontSize = Math.round(newSize);

      const sizeDisplay = document.getElementById("size-value-display");
      const sizeSlider = document.getElementById("size-slider") as HTMLInputElement | null;
      if (sizeDisplay) sizeDisplay.textContent = String(Math.round(newSize));
      if (sizeSlider) {
        sizeSlider.value = String(
          Math.min(Math.max(Math.round(newSize), 2), 300)
        );
      }

      this.redrawTextLayer(this.selectedLayer);
      this.layerManager.render();
      this.drawSelectionOverlay(this.selectedLayer);
      eventBus.emit("text:size-changed", {
        layer: this.selectedLayer,
        fontSize: this.selectedLayer.fontSize,
      });
    } else {
      const result = this.findTextLayerAt(pos.x, pos.y);

      if (this.isPerspectiveMode && this.selectedLayer?.perspectiveEnabled) {
        const bounds = this.getTextBounds(this.selectedLayer);
        if (bounds && this.findPerspectiveCornerAt(pos.x, pos.y, this.selectedLayer, bounds)) {
          this.canvas.style.cursor = "crosshair";
          return;
        }
      }

      if (result) {
        const { layer, bounds } = result;

        if (this.selectedLayer && layer.id === this.selectedLayer.id) {
          this.layerManager.render();
          this.drawSelectionOverlay(this.selectedLayer);
        }

        if (this.isPointInResizeHandle(pos.x, pos.y, bounds)) {
          this.canvas.style.cursor = "ns-resize";
        } else {
          this.canvas.style.cursor = "move";
        }
      } else {
        this.canvas.style.cursor = "default";

        if (this.selectedLayer) {
          this.layerManager.render();
          this.drawSelectionOverlay(this.selectedLayer);
        }
      }
    }
  }

  /**
   * Handle mouseup event
   */
  handleMouseUp(e: MouseEvent): void {
    if (this.isEditing) return;

    if (this.activePerspectiveCorner) {
      this.activePerspectiveCorner = null;
      this.layerManager.render();
      if (this.selectedLayer) {
        this.drawSelectionOverlay(this.selectedLayer);
      }
      this.canvas.style.cursor = "default";
      return;
    }

    if (this.isDragging || this.isResizing) {
      this.isDragging = false;
      this.isResizing = false;

      this.layerManager.render();
      if (this.selectedLayer) {
        this.drawSelectionOverlay(this.selectedLayer);
      }

      const pos = this.getMousePos(e);
      const result = this.findTextLayerAt(pos.x, pos.y);

      if (result) {
        const { bounds } = result;
        if (this.isPointInResizeHandle(pos.x, pos.y, bounds)) {
          this.canvas.style.cursor = "ns-resize";
        } else {
          this.canvas.style.cursor = "move";
        }
      } else {
        this.canvas.style.cursor = "default";
      }
    }
  }

  /**
   * Handle mouseleave event
   */
  handleMouseLeave(e: MouseEvent): void {
    this.handleMouseUp(e);
  }

  /**
   * Handle keyboard shortcuts for selected text layer
   */
  handleKeyDown(e: KeyboardEvent): void {
    if (this.isEditing) return;
    if (!this.selectedLayer || this.selectedLayer.type !== "text") return;
    if (!this.selectedLayer.visible || this.selectedLayer.locked) return;

    const active = document.activeElement;
    const tag = active ? active.tagName : "";
    if (
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      (active && (active as HTMLElement).isContentEditable)
    ) {
      return;
    }

    if (e.key === "Backspace") {
      e.preventDefault();
      this.startTextEditing(this.selectedLayer, { deleteBackward: true });
      return;
    }

    if (e.key === "Delete") {
      e.preventDefault();
      const layerId = this.selectedLayer.id;
      if (layerId !== 0) {
        this.selectedLayer = null;
        this.layerManager.deleteLayer(layerId);
        this.layerManager.render();
        const hasTextLayers = this.layerManager.layers.some(
          (l) => l.type === "text"
        );
        if (!hasTextLayers) {
          eventBus.emit("text:hide-properties");
        }
      }
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      this.startTextEditing(this.selectedLayer, { insertText: "\n" });
      return;
    }

    if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      this.startTextEditing(this.selectedLayer, { insertText: e.key });
    }
  }

  /**
   * Double click to enter text editing mode
   */
  handleDoubleClick(e: MouseEvent): void {
    const pos = this.getMousePos(e);
    const result = this.findTextLayerAt(pos.x, pos.y);
    if (!result) return;
    const { layer } = result;
    if (layer.locked || !layer.visible) return;

    this.layerManager.setActiveLayer(layer.id);
    this.selectedLayer = layer;
    this.layerManager.render();
    this.drawSelectionOverlay(layer);
    this.startTextEditing(layer);
  }

  /**
   * Redraw full text layer content onto layer canvas
   */
  redrawTextLayer(layer: Layer | null): void {
    if (!layer || layer.type !== "text") return;

    layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);

    const weight = layer.fontWeight || "normal";
    const style = layer.fontStyle || "normal";
    layer.ctx.font = `${style} ${weight} ${layer.fontSize}px ${layer.fontFamily}`;

    // Apply letter spacing (Canvas 2D API, Chromium 94+)
    const letterSp = layer.letterSpacing || 0;
    const wordSp = layer.wordSpacing || 0;
    if ("letterSpacing" in layer.ctx) {
      (layer.ctx as any).letterSpacing = letterSp !== 0 ? `${letterSp}px` : "0px";
    }
    if ("wordSpacing" in layer.ctx) {
      (layer.ctx as any).wordSpacing = wordSp !== 0 ? `${wordSp}px` : "0px";
    }

    const bounds = this.getTextBounds(layer);

    // === Draw item background (color or image) before text ===
    if (bounds && (layer.itemBgColor || layer.itemBgImage)) {
      const pL = layer.itemBgPaddingLeft || 0;
      const pR = layer.itemBgPaddingRight || 0;
      const pT = layer.itemBgPaddingTop || 0;
      const pB = layer.itemBgPaddingBottom || 0;
      const radius = layer.itemBgRadius || 0;

      const bgX = bounds.x - pL;
      const bgY = bounds.y - pT;
      const bgW = bounds.width + pL + pR;
      const bgH = bounds.height + pT + pB;

      layer.ctx.save();
      // Draw rounded rect path
      if (radius > 0) {
        const r = Math.min(radius, bgW / 2, bgH / 2);
        layer.ctx.beginPath();
        layer.ctx.moveTo(bgX + r, bgY);
        layer.ctx.lineTo(bgX + bgW - r, bgY);
        layer.ctx.arcTo(bgX + bgW, bgY, bgX + bgW, bgY + r, r);
        layer.ctx.lineTo(bgX + bgW, bgY + bgH - r);
        layer.ctx.arcTo(bgX + bgW, bgY + bgH, bgX + bgW - r, bgY + bgH, r);
        layer.ctx.lineTo(bgX + r, bgY + bgH);
        layer.ctx.arcTo(bgX, bgY + bgH, bgX, bgY + bgH - r, r);
        layer.ctx.lineTo(bgX, bgY + r);
        layer.ctx.arcTo(bgX, bgY, bgX + r, bgY, r);
        layer.ctx.closePath();
      } else {
        layer.ctx.beginPath();
        layer.ctx.rect(bgX, bgY, bgW, bgH);
      }

      if (layer.itemBgImage) {
        // Fill with image pattern
        const img = layer.itemBgImage;
        const patternCanvas = document.createElement("canvas");
        patternCanvas.width = Math.max(1, Math.round(bgW));
        patternCanvas.height = Math.max(1, Math.round(bgH));
        const pCtx = patternCanvas.getContext("2d");
        if (pCtx) {
          pCtx.drawImage(img, 0, 0, patternCanvas.width, patternCanvas.height);
        }
        const pattern = layer.ctx.createPattern(patternCanvas, "no-repeat");
        if (pattern && typeof DOMMatrix !== "undefined") {
          pattern.setTransform(new DOMMatrix().translate(bgX, bgY));
        }
        if (pattern) {
          layer.ctx.fillStyle = pattern;
        }
      } else if (layer.itemBgColor) {
        if (typeof layer.itemBgColor === "string") {
          layer.ctx.fillStyle = layer.itemBgColor;
        } else {
          // Gradient fill (BackgroundFill object)
          const fill = layer.itemBgColor as any;
          const bgBounds = { x: bgX, y: bgY, width: bgW, height: bgH };

          if (fill.kind === "solid") {
            layer.ctx.fillStyle = fill.hex;
          } else if (fill.kind === "preset" || (fill.kind === "custom" && fill.data?.type === "linear")) {
            const grad = ColorModule.createGradientFillForCtx(layer.ctx, bgBounds, fill);
            if (grad) {
              layer.ctx.fillStyle = grad;
            }
          } else if (fill.kind === "custom" && fill.data?.meshPoints) {
            const meshPattern = ColorModule.createMeshPatternForBounds(layer.ctx, bgBounds, fill);
            if (meshPattern) {
              layer.ctx.fillStyle = meshPattern;
            }
          }
        }
      }

      layer.ctx.fill();
      layer.ctx.restore();
    }
    let isPatternFill = false;
    let textPattern: CanvasPattern | null = null;

    // Texture takes precedence over Color
    if (layer.textureImage && bounds) {
      const img = layer.textureImage;
      const scale =
        layer.textureScale !== undefined ? layer.textureScale : 1.0;

      const targetW = Math.max(1, Math.round(bounds.width * scale));
      const targetH = Math.max(1, Math.round(bounds.height * scale));

      // Pattern cache: only recreate when image/scale/dimensions change
      if (
        !layer._textureCacheCanvas ||
        layer._textureCacheImg !== img ||
        layer._textureCacheScale !== scale ||
        layer._textureCacheW !== targetW ||
        layer._textureCacheH !== targetH
      ) {
        if (!layer._textureCacheCanvas) {
          layer._textureCacheCanvas = document.createElement("canvas");
        }
        layer._textureCacheCanvas.width = targetW;
        layer._textureCacheCanvas.height = targetH;
        const offCtx = layer._textureCacheCanvas.getContext("2d");
        if (offCtx) {
          offCtx.drawImage(img, 0, 0, targetW, targetH);
        }
        layer._textureCacheImg = img;
        layer._textureCacheScale = scale;
        layer._textureCacheW = targetW;
        layer._textureCacheH = targetH;
      }

      const repeatMode = scale < 1.0 ? "repeat" : "no-repeat";
      textPattern = layer.ctx.createPattern(layer._textureCacheCanvas, repeatMode);

      if (textPattern && typeof DOMMatrix !== "undefined") {
        const matrix = new DOMMatrix().translate(bounds.x, bounds.y);
        textPattern.setTransform(matrix);
      }
      isPatternFill = true;
    } else if (
      typeof layer.fontColor === "object" &&
      layer.fontColor !== null
    ) {
      const fillObj = layer.fontColor;
      const isMesh =
        fillObj.kind === "custom" &&
        fillObj.data &&
        (fillObj.data.type === "radial" || fillObj.data.type === "mesh");

      if (isMesh) {
        textPattern = ColorModule.createMeshPatternForBounds(
          layer.ctx,
          bounds,
          fillObj
        );
        isPatternFill = true;
      } else {
        const gradFill = ColorModule.createGradientFillForCtx(
          layer.ctx,
          bounds,
          fillObj
        );
        layer.ctx.fillStyle = gradFill || "#000000";
      }
    } else {
      layer.ctx.fillStyle = layer.fontColor || "#000000";
    }

    if (isPatternFill && textPattern) {
      layer.ctx.fillStyle = textPattern;
    }

    const isRtl = isRTL(layer.text || "");
    layer.ctx.direction = isRtl ? "rtl" : "ltr";
    layer.ctx.textAlign = layer.textAlign;

    let drawX = layer.x;
    const pLeft = layer.paddingLeft || 0;
    const pRight = layer.paddingRight || 0;

    drawX += pLeft - pRight;

    // Clamp text inside bounding box boundaries
    const effAlign = resolveEffectiveAlign(layer.textAlign, layer.text || "");
    const curveBendCheck = layer.curveBend || 0;
    if (bounds && curveBendCheck === 0) {
      const textW = bounds.textWidth;
      let textLeft = drawX;
      if (effAlign === "center") textLeft = drawX - textW / 2;
      else if (effAlign === "right") textLeft = drawX - textW;

      const textRight = textLeft + textW;
      const boxLeft = bounds.x;
      const boxRight = bounds.x + bounds.width;

      if (textRight > boxRight && textLeft > boxLeft) {
        const overflowR = textRight - boxRight;
        const availableL = textLeft - boxLeft;
        const shift = Math.min(overflowR, availableL);
        drawX -= shift;
      } else if (textLeft < boxLeft && textRight < boxRight) {
        const overflowL = boxLeft - textLeft;
        const availableR = boxRight - textRight;
        const shift = Math.min(overflowL, availableR);
        drawX += shift;
      }
    }

    const lines = String(layer.text ?? "").split("\n");
    const lineHeight = Math.round(layer.fontSize * 1.2 + (layer.lineSpacing || 0));

    // Apply shadow — vẽ riêng pass trước clip (shadow cần tràn ngoài bounds)
    if (layer.shadowEnabled) {
      const alpha = Math.min(1, Math.max(0, layer.shadowOpacity ?? 0.5));
      const rawColor = layer.shadowColor;
      // Gradient/preset shadow: giữ object để tô silhouette bằng gradient
      const shadowFillObj =
        rawColor && typeof rawColor === "object" ? (rawColor as any) : null;
      let shadowHex = "#000000";
      if (typeof rawColor === "string" && rawColor.startsWith("#")) {
        shadowHex = rawColor;
      }
      const r = parseInt(shadowHex.slice(1, 3), 16) || 0;
      const g = parseInt(shadowHex.slice(3, 5), 16) || 0;
      const b = parseInt(shadowHex.slice(5, 7), 16) || 0;
      const blur = layer.shadowBlur ?? 4;

      // Vẽ text với shadow — dùng offscreen canvas để shadow không bị clip
      const offCanvas = document.createElement("canvas");
      offCanvas.width = layer.canvas.width;
      offCanvas.height = layer.canvas.height;
      const offCtx = offCanvas.getContext("2d")!;
      offCtx.font = `${style} ${weight} ${layer.fontSize}px ${layer.fontFamily}`;
      offCtx.textAlign = effAlign;
      offCtx.textBaseline = layer.ctx.textBaseline;
      offCtx.direction = isRTL(layer.text || "") ? "rtl" : "ltr";
      if ("letterSpacing" in offCtx) {
        (offCtx as any).letterSpacing = (layer.letterSpacing || 0) !== 0 ? `${layer.letterSpacing}px` : "0px";
      }
      if ("wordSpacing" in offCtx) {
        (offCtx as any).wordSpacing = (layer.wordSpacing || 0) !== 0 ? `${layer.wordSpacing}px` : "0px";
      }
      offCtx.shadowColor = `rgba(${r},${g},${b},${alpha})`;
      if (layer.shadowOuterGlow) {
        // Glow = shadow tâm trùng chữ. Canvas vẫn vẽ shadow khi blur = 0
        // (nằm ngay dưới chữ, phần chữ bị xóa bằng destination-out bên dưới
        //  → còn lại halo cứng). Không được clamp blur lên 1.
        offCtx.shadowBlur = blur;
        offCtx.shadowOffsetX = 0;
        offCtx.shadowOffsetY = 0;
      } else {
        offCtx.shadowBlur = blur;
        offCtx.shadowOffsetX = layer.shadowOffsetX ?? 0;
        offCtx.shadowOffsetY = layer.shadowOffsetY ?? 4;
      }
      // Shadow gradient: silhouette màu đục bất kỳ, tô lại bằng gradient phía dưới
      offCtx.fillStyle = shadowFillObj ? "#000000" : `rgb(${r},${g},${b})`;
      const shadowLines = String(layer.text ?? "").split("\n");
      const shadowLH = Math.round(layer.fontSize * 1.2 + (layer.lineSpacing || 0));
      for (let i = 0; i < shadowLines.length; i++) {
        const sLine = shadowLines[i];
        if (!sLine) continue;
        offCtx.fillText(sLine, drawX, layer.y + i * shadowLH);
      }
      // Xóa pixels chữ gốc, chỉ giữ shadow (composite)
      offCtx.globalCompositeOperation = "destination-out";
      offCtx.shadowColor = "transparent";
      offCtx.shadowBlur = 0;
      offCtx.shadowOffsetX = 0;
      offCtx.shadowOffsetY = 0;
      offCtx.fillStyle = "#000";
      for (let i = 0; i < shadowLines.length; i++) {
        const sLine = shadowLines[i];
        if (!sLine) continue;
        offCtx.fillText(sLine, drawX, layer.y + i * shadowLH);
      }
      // Shadow gradient: tô silhouette bằng gradient, mask theo alpha sẵn có.
      // Gradient/pattern phải được dựng trên bbox alpha THẬT của shadow
      // (gồm phần tràn ngoài bounds + blur) — nếu dùng bounds chữ thì mọi
      // vùng ngoài spread sẽ rơi ra ngoài gradient/pattern (mesh còn bị
      // tô nền đen từ renderBackgroundFill) → shadow biến thành màu đen.
      if (shadowFillObj) {
        const overflow = blur + 2;
        const sb = collectShadowBBox(offCtx, offCanvas.width, offCanvas.height, overflow);
        if (sb) {
          const gradBounds = {
            x: sb.minX,
            y: sb.minY,
            width: Math.max(1, sb.maxX - sb.minX),
            height: Math.max(1, sb.maxY - sb.minY),
          };
          const tintCanvas = document.createElement("canvas");
          tintCanvas.width = offCanvas.width;
          tintCanvas.height = offCanvas.height;
          const tctx = tintCanvas.getContext("2d");
          if (tctx) {
            let tintFill: CanvasGradient | CanvasPattern | null =
              ColorModule.createGradientFillForCtx(
                tctx,
                gradBounds,
                shadowFillObj
              );
            if (!tintFill) {
              // Mesh/radial: pattern phủ đúng bbox. spread mesh (≥1.6 bbox)
              // luôn vượt quá bbox nên các blob phủ kín, không lộ nền đen.
              tintFill = ColorModule.createMeshPatternForBounds(
                tctx,
                gradBounds,
                shadowFillObj
              );
            }
            if (tintFill) {
              tctx.fillStyle = tintFill as string | CanvasGradient | CanvasPattern;
              tctx.fillRect(0, 0, tintCanvas.width, tintCanvas.height);
              // Mask gradient theo silhouette → giữ nguyên opacity của shadow
              tctx.globalCompositeOperation = "destination-in";
              tctx.drawImage(offCanvas, 0, 0);
              offCtx.globalCompositeOperation = "source-over";
              offCtx.drawImage(tintCanvas, 0, 0);
            }
          }
        }
      }
      // Vẽ shadow lên layer chính
      layer.ctx.drawImage(offCanvas, 0, 0);
    }

    // Apply 3D Shadow (Bóng đổ 3D phối cảnh / mặt sàn)
    if (layer.shadow3dEnabled && bounds) {
      this.apply3DShadow(layer, bounds, drawX, lineHeight, lines, style, weight, effAlign, isRtl);
    }

    if (bounds) {
      layer.ctx.save();
      layer.ctx.beginPath();
      layer.ctx.rect(
        bounds.x,
        bounds.y,
        Math.max(0, bounds.width),
        Math.max(0, bounds.height)
      );
      layer.ctx.clip();
    }

    for (let i = 0; i < lines.length; i++) {
      const lineY = layer.y + i * lineHeight;
      const lineText = lines[i];
      if (!lineText) continue;

      const bend = layer.curveBend || 0;

      if (bend !== 0) {
        // Curved text: position glyphs along circular arc
        const totalAngleDeg = bend * 1.8;
        const totalAngleRad = (totalAngleDeg * Math.PI) / 180;
        const halfAngle = Math.abs(totalAngleRad) / 2;
        const sign = bend >= 0 ? 1 : -1;

        const chars = [...lineText];
        const charWidths = chars.map((c) => layer.ctx.measureText(c).width);
        const lineTotalWidth = charWidths.reduce((a, b) => a + b, 0);

        if (lineTotalWidth > 1 && halfAngle > 0.001) {
          const R = lineTotalWidth / 2 / Math.sin(halfAngle);
          const cosHalf = Math.cos(halfAngle);

          let lineLeft = drawX;
          if (effAlign === "center") {
            lineLeft = drawX - lineTotalWidth / 2;
          } else if (effAlign === "right") {
            lineLeft = drawX - lineTotalWidth;
          }

          let cumX = 0;
          for (let j = 0; j < chars.length; j++) {
            const ch = chars[j];
            const cw = charWidths[j];
            if (cw < 0.1) {
              cumX += cw;
              continue;
            }

            const charCenter = cumX + cw / 2;
            const dx = charCenter - lineTotalWidth / 2;
            cumX += cw;

            const theta = Math.asin(dx / R);
            const px = lineLeft + lineTotalWidth / 2 + dx;
            const py = lineY - sign * R * (Math.cos(theta) - cosHalf);

            layer.ctx.save();
            layer.ctx.translate(px, py);
            layer.ctx.rotate(sign * theta);
            layer.ctx.fillText(ch, -cw / 2, 0);
            layer.ctx.restore();
          }

          // Curved text decorations along arc
          const dec =
            layer.textDecoration || (layer.underline ? "underline" : "none");
          if (dec !== "none") {
            const textWidth = lineTotalWidth;
            const fontSize = layer.fontSize;
            const strokeWidth = Math.max(1, Math.round(fontSize * 0.06));
            const underlineOff = Math.round(fontSize * 0.15);
            const strikeOff = Math.round(fontSize * -0.3);

            layer.ctx.save();
            layer.ctx.strokeStyle = layer.ctx.fillStyle;
            layer.ctx.lineWidth = strokeWidth;

            let decOffset = underlineOff;
            if (dec === "strikethrough") decOffset = strikeOff;

            if (dec === "dashed-underline") {
              const dashLen = Math.max(3, Math.round(fontSize * 0.15));
              layer.ctx.setLineDash([dashLen, dashLen]);
            }

            let cumDx = 0;
            for (let j = 0; j < chars.length; j++) {
              const cw = charWidths[j];
              const charCenter = cumDx + cw / 2;
              const dx = charCenter - textWidth / 2;
              cumDx += cw;

              if (cw < 0.1) continue;

              const theta = Math.asin(dx / R);
              const tangentAngle = -sign * theta;

              if (dec === "dotted-underline") {
                const dotRadius = Math.max(1.5, Math.round(fontSize * 0.04));
                const dotStep = dotRadius * 3;
                for (let ddx = -cw / 2 + 1; ddx < cw / 2; ddx += dotStep) {
                  const dTheta = Math.asin((dx + ddx) / R);
                  const dPx = lineLeft + lineTotalWidth / 2 + dx + ddx;
                  const dPy =
                    lineY -
                    sign * R * (Math.cos(dTheta) - cosHalf) +
                    underlineOff * Math.cos(tangentAngle);
                  layer.ctx.beginPath();
                  layer.ctx.arc(dPx, dPy, dotRadius, 0, Math.PI * 2);
                  layer.ctx.fill();
                }
              } else if (dec === "double-underline" || dec === "underline") {
                const segStart = -cw / 2;
                const segEnd = cw / 2;
                const sTheta = Math.asin((dx + segStart) / R);
                const eTheta = Math.asin((dx + segEnd) / R);
                const off =
                  dec === "double-underline"
                    ? Math.max(2, Math.round(fontSize * 0.08))
                    : 0;

                const sPx = lineLeft + lineTotalWidth / 2 + dx + segStart;
                const ePx = lineLeft + lineTotalWidth / 2 + dx + segEnd;
                const sPy =
                  lineY -
                  sign * R * (Math.cos(sTheta) - cosHalf) +
                  (underlineOff - off / 2) * Math.cos(tangentAngle);
                const ePy =
                  lineY -
                  sign * R * (Math.cos(eTheta) - cosHalf) +
                  (underlineOff - off / 2) * Math.cos(tangentAngle);

                layer.ctx.beginPath();
                layer.ctx.moveTo(sPx, sPy);
                layer.ctx.lineTo(ePx, ePy);
                layer.ctx.stroke();

                if (off > 0) {
                  const sPy2 =
                    lineY -
                    sign * R * (Math.cos(sTheta) - cosHalf) +
                    (underlineOff + off / 2) * Math.cos(tangentAngle);
                  const ePy2 =
                    lineY -
                    sign * R * (Math.cos(eTheta) - cosHalf) +
                    (underlineOff + off / 2) * Math.cos(tangentAngle);
                  layer.ctx.beginPath();
                  layer.ctx.moveTo(sPx, sPy2);
                  layer.ctx.lineTo(ePx, ePy2);
                  layer.ctx.stroke();
                }
              } else if (dec === "strikethrough") {
                const sTheta2 = Math.asin((dx - cw / 2) / R);
                const eTheta2 = Math.asin((dx + cw / 2) / R);
                const sPx = lineLeft + lineTotalWidth / 2 + dx - cw / 2;
                const ePx = lineLeft + lineTotalWidth / 2 + dx + cw / 2;
                const sPy =
                  lineY -
                  sign * R * (Math.cos(sTheta2) - cosHalf) +
                  strikeOff * Math.cos(tangentAngle);
                const ePy =
                  lineY -
                  sign * R * (Math.cos(eTheta2) - cosHalf) +
                  strikeOff * Math.cos(tangentAngle);
                layer.ctx.beginPath();
                layer.ctx.moveTo(sPx, sPy);
                layer.ctx.lineTo(ePx, ePy);
                layer.ctx.stroke();
              } else {
                const sTheta2 = Math.asin((dx - cw / 2) / R);
                const eTheta2 = Math.asin((dx + cw / 2) / R);
                const sPx = lineLeft + lineTotalWidth / 2 + dx - cw / 2;
                const ePx = lineLeft + lineTotalWidth / 2 + dx + cw / 2;
                const sPy =
                  lineY -
                  sign * R * (Math.cos(sTheta2) - cosHalf) +
                  decOffset * Math.cos(tangentAngle);
                const ePy =
                  lineY -
                  sign * R * (Math.cos(eTheta2) - cosHalf) +
                  decOffset * Math.cos(tangentAngle);
                layer.ctx.beginPath();
                layer.ctx.moveTo(sPx, sPy);
                layer.ctx.lineTo(ePx, ePy);
                layer.ctx.stroke();
              }
            }

            layer.ctx.restore();
          }
        } else {
          layer.ctx.fillText(lineText, drawX, lineY);
        }
      } else {
        // Normal straight text (with Justify support)
        const targetWidth = bounds ? bounds.textWidth : layer.ctx.measureText(lineText).width;
        const words = lineText.trim().split(/\s+/);
        const shouldJustify = !!(layer.textJustify && bounds && words.length > 1);

        let lineStartX = drawX;
        if (effAlign === "center") {
          lineStartX = drawX - targetWidth / 2;
        } else if (effAlign === "right") {
          lineStartX = drawX - targetWidth;
        }

        if (shouldJustify) {
          const wordWidths = words.map((w) => layer.ctx.measureText(w).width);
          const totalWordsW = wordWidths.reduce((a, b) => a + b, 0);
          const gapCount = words.length - 1;
          const spaceW = Math.max(
            layer.ctx.measureText(" ").width,
            (targetWidth - totalWordsW) / gapCount
          );

          layer.ctx.save();
          if (isRtl) {
            let curX = lineStartX + targetWidth;
            layer.ctx.textAlign = "right";
            for (let w = 0; w < words.length; w++) {
              layer.ctx.fillText(words[w], curX, lineY);
              curX -= wordWidths[w] + spaceW;
            }
          } else {
            let curX = lineStartX;
            layer.ctx.textAlign = "left";
            for (let w = 0; w < words.length; w++) {
              layer.ctx.fillText(words[w], curX, lineY);
              curX += wordWidths[w] + spaceW;
            }
          }
          layer.ctx.restore();
        } else {
          layer.ctx.fillText(lineText, drawX, lineY);
        }

        const dec =
          layer.textDecoration || (layer.underline ? "underline" : "none");
        if (dec !== "none" && lineText) {
          const textWidth = shouldJustify ? targetWidth : layer.ctx.measureText(lineText).width;
          let startX = shouldJustify ? lineStartX : drawX;
          if (!shouldJustify) {
            if (effAlign === "center") {
              startX = drawX - textWidth / 2;
            } else if (effAlign === "right") {
              startX = drawX - textWidth;
            }
          }

          const fontSize = layer.fontSize;
          const strokeWidth = Math.max(1, Math.round(fontSize * 0.06));
          const underlineY = lineY + Math.round(fontSize * 0.15);
          const strikeY = lineY - Math.round(fontSize * 0.3);

          layer.ctx.save();
          layer.ctx.strokeStyle = layer.ctx.fillStyle;
          layer.ctx.lineWidth = strokeWidth;

          if (dec === "underline") {
            layer.ctx.beginPath();
            layer.ctx.moveTo(startX, underlineY);
            layer.ctx.lineTo(startX + textWidth, underlineY);
            layer.ctx.stroke();
          } else if (dec === "double-underline") {
            const offset = Math.max(2, Math.round(fontSize * 0.08));
            layer.ctx.beginPath();
            layer.ctx.moveTo(startX, underlineY - offset / 2);
            layer.ctx.lineTo(startX + textWidth, underlineY - offset / 2);
            layer.ctx.moveTo(startX, underlineY + offset / 2);
            layer.ctx.lineTo(startX + textWidth, underlineY + offset / 2);
            layer.ctx.stroke();
          } else if (dec === "strikethrough") {
            layer.ctx.beginPath();
            layer.ctx.moveTo(startX, strikeY);
            layer.ctx.lineTo(startX + textWidth, strikeY);
            layer.ctx.stroke();
          } else if (dec === "dashed-underline") {
            const dashLen = Math.max(3, Math.round(fontSize * 0.15));
            layer.ctx.setLineDash([dashLen, dashLen]);
            layer.ctx.beginPath();
            layer.ctx.moveTo(startX, underlineY);
            layer.ctx.lineTo(startX + textWidth, underlineY);
            layer.ctx.stroke();
          } else if (dec === "dotted-underline") {
            const dotRadius = Math.max(1.5, Math.round(fontSize * 0.04));
            const step = dotRadius * 3;
            layer.ctx.fillStyle = layer.ctx.strokeStyle;
            for (let x = startX; x <= startX + textWidth; x += step) {
              layer.ctx.beginPath();
              layer.ctx.arc(x, underlineY, dotRadius, 0, Math.PI * 2);
              layer.ctx.fill();
            }
          } else if (dec === "wavy-underline") {
            const wavelength = Math.max(4, Math.round(fontSize * 0.15));
            const amplitude = Math.max(1.5, Math.round(fontSize * 0.05));
            layer.ctx.beginPath();
            let x = startX;
            layer.ctx.moveTo(x, underlineY);
            while (x < startX + textWidth) {
              layer.ctx.quadraticCurveTo(
                x + wavelength / 4,
                underlineY - amplitude,
                x + wavelength / 2,
                underlineY
              );
              layer.ctx.quadraticCurveTo(
                x + (3 * wavelength) / 4,
                underlineY + amplitude,
                x + wavelength,
                underlineY
              );
              x += wavelength;
            }
            layer.ctx.stroke();
          }

          layer.ctx.restore();
        }
      }
    }

    if (bounds) {
      layer.ctx.restore();
    }

    // Draw inner shadow — bóng đổ vào bên trong chữ
    if (layer.innerShadowEnabled) {
      const alpha = Math.min(1, Math.max(0, layer.innerShadowOpacity ?? 0.6));
      const rawColor = layer.innerShadowColor;
      const shadowFillObj =
        rawColor && typeof rawColor === "object" ? (rawColor as any) : null;
      let shadowHex = "#000000";
      if (typeof rawColor === "string" && rawColor.startsWith("#")) {
        shadowHex = rawColor;
      }
      const r = parseInt(shadowHex.slice(1, 3), 16) || 0;
      const g = parseInt(shadowHex.slice(3, 5), 16) || 0;
      const b = parseInt(shadowHex.slice(5, 7), 16) || 0;
      const blur = Math.max(0, layer.innerShadowBlur ?? 5);
      const offX = layer.innerShadowOffsetX ?? 0;
      const offY = layer.innerShadowOffsetY ?? 4;

      // 1. Tạo mask text thuần trên canvas A
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = layer.canvas.width;
      maskCanvas.height = layer.canvas.height;
      const mCtx = maskCanvas.getContext("2d")!;
      mCtx.font = `${style} ${weight} ${layer.fontSize}px ${layer.fontFamily}`;
      mCtx.textAlign = effAlign;
      mCtx.textBaseline = layer.ctx.textBaseline;
      mCtx.direction = isRtl ? "rtl" : "ltr";
      if ("letterSpacing" in mCtx) {
        (mCtx as any).letterSpacing = (layer.letterSpacing || 0) !== 0 ? `${layer.letterSpacing}px` : "0px";
      }
      if ("wordSpacing" in mCtx) {
        (mCtx as any).wordSpacing = (layer.wordSpacing || 0) !== 0 ? `${layer.wordSpacing}px` : "0px";
      }
      mCtx.fillStyle = "#000000";

      const bend = layer.curveBend || 0;
      if (bend !== 0) {
        const totalAngleDeg = bend * 1.8;
        const totalAngleRad = (totalAngleDeg * Math.PI) / 180;
        const halfAngle = Math.abs(totalAngleRad) / 2;
        const sign = bend >= 0 ? 1 : -1;
        for (let i = 0; i < lines.length; i++) {
          const lineY = layer.y + i * lineHeight;
          const lineText = lines[i];
          if (!lineText) continue;
          const chars = [...lineText];
          const charWidths = chars.map((c) => mCtx.measureText(c).width);
          const lineTotalWidth = charWidths.reduce((a, b) => a + b, 0);
          if (lineTotalWidth > 1 && halfAngle > 0.001) {
            const R = lineTotalWidth / 2 / Math.sin(halfAngle);
            const cosHalf = Math.cos(halfAngle);
            let lineLeft = drawX;
            if (effAlign === "center") lineLeft = drawX - lineTotalWidth / 2;
            else if (effAlign === "right") lineLeft = drawX - lineTotalWidth;

            let cumX = 0;
            for (let j = 0; j < chars.length; j++) {
              const ch = chars[j];
              const cw = charWidths[j];
              if (cw < 0.1) {
                cumX += cw;
                continue;
              }
              const charCenter = cumX + cw / 2;
              const dx = charCenter - lineTotalWidth / 2;
              cumX += cw;
              const theta = Math.asin(dx / R);
              const px = lineLeft + lineTotalWidth / 2 + dx;
              const py = lineY - sign * R * (Math.cos(theta) - cosHalf);
              mCtx.save();
              mCtx.translate(px, py);
              mCtx.rotate(sign * theta);
              mCtx.fillText(ch, -cw / 2, 0);
              mCtx.restore();
            }
          }
        }
      } else {
        for (let i = 0; i < lines.length; i++) {
          const lineY = layer.y + i * lineHeight;
          const lineText = lines[i];
          if (!lineText) continue;
          const words = lineText.trim().split(/\s+/);
          const shouldJustify = !!(layer.textJustify && bounds && words.length > 1);
          if (shouldJustify) {
            const targetWidth = bounds ? bounds.textWidth : mCtx.measureText(lineText).width;
            const wordWidths = words.map((w) => mCtx.measureText(w).width);
            const totalWordsW = wordWidths.reduce((a, b) => a + b, 0);
            const gapCount = words.length - 1;
            const spaceW = Math.max(
              mCtx.measureText(" ").width,
              (targetWidth - totalWordsW) / gapCount
            );
            let lineStartX = drawX;
            if (effAlign === "center") lineStartX = drawX - targetWidth / 2;
            else if (effAlign === "right") lineStartX = drawX - targetWidth;

            mCtx.save();
            if (isRtl) {
              let curX = lineStartX + targetWidth;
              mCtx.textAlign = "right";
              for (let w = 0; w < words.length; w++) {
                mCtx.fillText(words[w], curX, lineY);
                curX -= wordWidths[w] + spaceW;
              }
            } else {
              let curX = lineStartX;
              mCtx.textAlign = "left";
              for (let w = 0; w < words.length; w++) {
                mCtx.fillText(words[w], curX, lineY);
                curX += wordWidths[w] + spaceW;
              }
            }
            mCtx.restore();
          } else {
            mCtx.fillText(lineText, drawX, lineY);
          }
        }
      }

      // 2. Tạo inner shadow trên canvas B
      // Bằng cách tạo inverted mask (hộp bao quanh trừ đi hình text) và đổ bóng vào text
      const shadowCanvas = document.createElement("canvas");
      shadowCanvas.width = layer.canvas.width;
      shadowCanvas.height = layer.canvas.height;
      const sCtx = shadowCanvas.getContext("2d")!;

      // Hộp lớn bao toàn canvas
      sCtx.fillStyle = "#000000";
      sCtx.fillRect(0, 0, shadowCanvas.width, shadowCanvas.height);
      // Cắt bỏ phần text khỏi hộp bằng destination-out
      sCtx.globalCompositeOperation = "destination-out";
      sCtx.drawImage(maskCanvas, 0, 0);

      // Bây giờ sCtx chứa hình "khuôn rỗng" text.
      // Đổ bóng khuôn này lên canvas C với offset và blur
      const innerCanvas = document.createElement("canvas");
      innerCanvas.width = layer.canvas.width;
      innerCanvas.height = layer.canvas.height;
      const iCtx = innerCanvas.getContext("2d")!;
      iCtx.shadowColor = `rgba(${r},${g},${b},${alpha})`;
      iCtx.shadowBlur = blur;
      iCtx.shadowOffsetX = offX;
      iCtx.shadowOffsetY = offY;
      iCtx.drawImage(shadowCanvas, 0, 0);

      // Mask lại chỉ giữ phần bóng nằm BÊN TRONG chữ (destination-in bằng maskCanvas)
      iCtx.globalCompositeOperation = "destination-in";
      iCtx.shadowColor = "transparent";
      iCtx.shadowBlur = 0;
      iCtx.shadowOffsetX = 0;
      iCtx.shadowOffsetY = 0;
      iCtx.drawImage(maskCanvas, 0, 0);

      // Nếu shadow có gradient fill
      if (shadowFillObj) {
        const tCanvas = document.createElement("canvas");
        tCanvas.width = innerCanvas.width;
        tCanvas.height = innerCanvas.height;
        const tCtx = tCanvas.getContext("2d");
        const tBounds = bounds || { x: layer.x, y: layer.y, width: layer.canvas.width, height: layer.canvas.height };
        if (tCtx) {
          let tintFill: CanvasGradient | CanvasPattern | null =
            ColorModule.createGradientFillForCtx(tCtx, tBounds, shadowFillObj);
          if (!tintFill) {
            tintFill = ColorModule.createMeshPatternForBounds(tCtx, tBounds, shadowFillObj);
          }
          if (tintFill) {
            tCtx.fillStyle = tintFill as string | CanvasGradient | CanvasPattern;
            tCtx.fillRect(0, 0, tCanvas.width, tCanvas.height);
            tCtx.globalCompositeOperation = "destination-in";
            tCtx.drawImage(innerCanvas, 0, 0);
            iCtx.clearRect(0, 0, innerCanvas.width, innerCanvas.height);
            iCtx.globalCompositeOperation = "source-over";
            iCtx.drawImage(tCanvas, 0, 0);
          }
        }
      }

      // Vẽ inner shadow đè lên chữ chính
      layer.ctx.drawImage(innerCanvas, 0, 0);
    }

    // Reset shadow trước khi vẽ stroke (stroke không cần shadow)
    layer.ctx.shadowColor = "transparent";
    layer.ctx.shadowBlur = 0;
    layer.ctx.shadowOffsetX = 0;
    layer.ctx.shadowOffsetY = 0;

    // Draw text stroke - vẽ sau fill, re-fill đè phần trong → chỉ còn viền ngoài
    const strokeW = layer.strokeWidth || 0;
    if (strokeW > 0 && (layer.strokeColor || layer.strokeImage)) {
      const strokeBounds = this.getTextBounds(layer);
      let strokeStyle: string | CanvasPattern | CanvasGradient | null = null;

      if (layer.strokeImage) {
        const img = layer.strokeImage;
        const strokeBoundsForImg = strokeBounds || { x: layer.x, y: layer.y, width: layer.canvas.width, height: layer.canvas.height };
        const patternCanvas = document.createElement("canvas");
        patternCanvas.width = Math.max(1, Math.round(strokeBoundsForImg.width));
        patternCanvas.height = Math.max(1, Math.round(strokeBoundsForImg.height));
        const pCtx = patternCanvas.getContext("2d");
        if (pCtx) {
          pCtx.drawImage(img, 0, 0, patternCanvas.width, patternCanvas.height);
        }
        const pat = layer.ctx.createPattern(patternCanvas, "no-repeat");
        if (pat && typeof DOMMatrix !== "undefined") {
          pat.setTransform(new DOMMatrix().translate(strokeBoundsForImg.x, strokeBoundsForImg.y));
        }
        strokeStyle = pat;
      } else if (layer.strokeColor) {
        const sc = layer.strokeColor as any;
        if (typeof sc === "string") {
          strokeStyle = sc;
        } else if (sc?.kind === "solid") {
          strokeStyle = sc.hex as string;
        } else if (strokeBounds && (sc?.kind === "linear" || sc?.kind === "radial" || sc?.kind === "custom")) {
          const g = ColorModule.createGradientFillForCtx(layer.ctx, strokeBounds, sc)
            || (sc?.kind === "custom" ? ColorModule.createMeshPatternForBounds(layer.ctx, strokeBounds, sc) : null);
          strokeStyle = g;
        }
      }

      if (strokeStyle) {
        const strokeLines = String(layer.text ?? "").split("\n");
        const strokeLH = Math.round(layer.fontSize * 1.2 + (layer.lineSpacing || 0));

        layer.ctx.save();
        if (strokeBounds) {
          layer.ctx.beginPath();
          layer.ctx.rect(strokeBounds.x, strokeBounds.y, Math.max(0, strokeBounds.width), Math.max(0, strokeBounds.height));
          layer.ctx.clip();
        }

        layer.ctx.font = `${layer.fontStyle || "normal"} ${layer.fontWeight || "normal"} ${layer.fontSize}px ${layer.fontFamily}`;
        layer.ctx.strokeStyle = strokeStyle;
        layer.ctx.lineWidth = strokeW * 2;
        layer.ctx.lineJoin = "round";
        layer.ctx.textAlign = layer.textAlign;
        layer.ctx.direction = isRTL(layer.text || "") ? "rtl" : "ltr";

        // Bước 1: strokeText (lineWidth*2 = nửa trong + nửa ngoài)
        for (let i = 0; i < strokeLines.length; i++) {
          const sLine = strokeLines[i];
          if (!sLine) continue;
          layer.ctx.strokeText(sLine, drawX, layer.y + i * strokeLH);
        }

        // Bước 2: fillText đè lên để che phần stroke bên trong chữ
        if (isPatternFill && textPattern) {
          layer.ctx.fillStyle = textPattern;
        } else {
          const fc = layer.fontColor as any;
          layer.ctx.fillStyle =
            typeof fc === "string" ? fc
            : fc?.kind === "solid" ? fc.hex
            : layer.fontColor as string || "#000000";
        }
        for (let i = 0; i < strokeLines.length; i++) {
          const sLine = strokeLines[i];
          if (!sLine) continue;
          layer.ctx.fillText(sLine, drawX, layer.y + i * strokeLH);
        }

        layer.ctx.restore();
      }
    }

    // Draw Emboss Shading (Phong-like 3D bump mapping on text)
    if (layer.embossEnabled) {
      this.applyEmbossShading(layer);
    }

    // Apply Perspective Quad Transformation (4-corner warp)
    if (layer.perspectiveEnabled && layer.perspectivePoints && bounds) {
      this.applyPerspectiveWarp(layer, bounds);
    }

    // Apply 3D Rotate (X Axis / Y Axis projection)
    if ((layer.rotate3dX !== 0 || layer.rotate3dY !== 0) && bounds) {
      this.apply3DRotate(layer, bounds);
    }

    // Apply 3D Text Extrusion (Depth, View type: Perspective | Oblique, Darken, 3D Rotation)
    if (layer.text3dEnabled && bounds) {
      this.apply3DTextExtrusion(layer, bounds);
    }

    // Apply Reflection (Bóng phản chiếu lật ngược phía dưới)
    if (layer.reflectionEnabled && bounds) {
      this.applyReflection(layer, bounds);
    }
  }

  /**
   * Apply Emboss 3D relief / lighting effect on text layer
   */
  private applyEmbossShading(layer: Layer): void {
    const w = layer.canvas.width;
    const h = layer.canvas.height;
    if (w <= 0 || h <= 0) return;

    // 1. Lấy imageData hiện tại của text layer
    const textImgData = layer.ctx.getImageData(0, 0, w, h);
    const data = textImgData.data;

    // Xác định bounding box alpha > 0 để tránh duyệt toàn bộ canvas
    let minX = w, maxX = 0, minY = h, maxY = 0;
    for (let y = 0; y < h; y += 2) {
      const rowOffset = y * w * 4;
      for (let x = 0; x < w; x += 2) {
        if (data[rowOffset + x * 4 + 3] > 10) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (minX > maxX || minY > maxY) return;

    const pad = Math.max(4, Math.round((layer.embossBevel || 3) * 2));
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(w - 1, maxX + pad);
    maxY = Math.min(h - 1, maxY + pad);

    const subW = maxX - minX + 1;
    const subH = maxY - minY + 1;
    if (subW <= 0 || subH <= 0) return;

    // Vector hướng sáng L = [Lx, Ly, Lz]
    const angleRad = ((layer.embossAngle ?? 90) * Math.PI) / 180;
    // lx, ly theo góc chiếu
    const lx = Math.cos(angleRad);
    const ly = Math.sin(angleRad);
    const lz = 0.6; // Đèn chếch một góc lên bề mặt
    const lLen = Math.sqrt(lx * lx + ly * ly + lz * lz);
    const nLx = lx / lLen;
    const nLy = ly / lLen;
    const nLz = lz / lLen;

    const bevelRadius = Math.max(1, Math.min(25, Math.round(layer.embossBevel ?? 3)));
    const intensity = (layer.embossIntensity ?? 50) / 50; // 0 -> 2
    const ambient = (layer.embossAmbient ?? 50) / 100; // 0 -> 1
    const hardness = Math.max(1, (layer.embossHardness ?? 20) * 1.5); // exponent

    const bumpCanvas = document.createElement("canvas");
    bumpCanvas.width = subW;
    bumpCanvas.height = subH;
    const bCtx = bumpCanvas.getContext("2d")!;
    const bumpImgData = bCtx.createImageData(subW, subH);
    const outData = bumpImgData.data;

    const step = bevelRadius;

    for (let sy = 0; sy < subH; sy++) {
      const gy = minY + sy;
      const yUp = Math.max(0, gy - step);
      const yDn = Math.min(h - 1, gy + step);
      const rowOffset = gy * w * 4;

      for (let sx = 0; sx < subW; sx++) {
        const gx = minX + sx;
        const outIdx = (sy * subW + sx) * 4;
        const curAlpha = data[rowOffset + gx * 4 + 3];

        if (curAlpha < 5) {
          outData[outIdx + 3] = 0;
          continue;
        }

        const xLt = Math.max(0, gx - step);
        const xRt = Math.min(w - 1, gx + step);

        // Đạo hàm chiều cao (height gradient) xấp xỉ từ alpha lân cận
        const aL = data[gy * w * 4 + xLt * 4 + 3];
        const aR = data[gy * w * 4 + xRt * 4 + 3];
        const aU = data[yUp * w * 4 + gx * 4 + 3];
        const aD = data[yDn * w * 4 + gx * 4 + 3];

        const dzdx = (aR - aL) / 255.0;
        const dzdy = (aD - aU) / 255.0;

        // Vector pháp tuyến N = [-dzdx, -dzdy, 1] chuẩn hóa
        const nx = -dzdx * 1.8;
        const ny = -dzdy * 1.8;
        const nz = 1.0;
        const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
        const normX = nx / nLen;
        const normY = ny / nLen;
        const normZ = nz / nLen;

        // Diffuse factor = N • L
        const dotNL = normX * nLx + normY * nLy + normZ * nLz;
        const diff = Math.max(0, dotNL) * intensity;

        // Specular factor (Blinn-Phong với V = [0,0,1], H = (L+V)/2)
        const hx = nLx;
        const hy = nLy;
        const hz = nLz + 1.0;
        const hLen = Math.sqrt(hx * hx + hy * hy + hz * hz);
        const dotNH = Math.max(0, (normX * hx + normY * hy + normZ * hz) / hLen);
        const spec = Math.pow(dotNH, hardness) * (intensity * 0.8);

        // Highlight & Shadow shade
        // lightVal < 0: tối đi (shadow), lightVal > 0: sáng lên (highlight)
        const lightVal = (diff + ambient - 1.0) + spec;

        if (lightVal >= 0) {
          // Highlight: màu trắng pha vào
          const lightAmount = Math.min(255, Math.round(lightVal * 255));
          outData[outIdx] = 255;
          outData[outIdx + 1] = 255;
          outData[outIdx + 2] = 255;
          outData[outIdx + 3] = Math.round((lightAmount * curAlpha) / 255);
        } else {
          // Shadow: màu đen pha vào
          const darkAmount = Math.min(255, Math.round(Math.abs(lightVal) * 255));
          outData[outIdx] = 0;
          outData[outIdx + 1] = 0;
          outData[outIdx + 2] = 0;
          outData[outIdx + 3] = Math.round((darkAmount * curAlpha) / 255);
        }
      }
    }

    bCtx.putImageData(bumpImgData, 0, 0);

    // Vẽ lớp bump shading đè lên với soft-light hoặc source-over
    layer.ctx.save();
    layer.ctx.drawImage(bumpCanvas, minX, minY);
    layer.ctx.restore();
  }

  /**
   * Apply 4-corner perspective warping on text layer
   * Chia nhỏ thành lưới tam giác affine (triangle mesh warping)
   */
  private applyPerspectiveWarp(layer: Layer, bounds: TextBounds): void {
    const pts = layer.perspectivePoints;
    if (!pts) return;
    const isZero =
      pts.tl.x === 0 && pts.tl.y === 0 &&
      pts.tr.x === 0 && pts.tr.y === 0 &&
      pts.br.x === 0 && pts.br.y === 0 &&
      pts.bl.x === 0 && pts.bl.y === 0;
    if (isZero) return;

    const w = layer.canvas.width;
    const h = layer.canvas.height;
    if (w <= 0 || h <= 0) return;

    // Bounding box nguồn gốc cần warp
    const pad = 10;
    const srcX = Math.max(0, Math.floor(bounds.x - pad));
    const srcY = Math.max(0, Math.floor(bounds.y - pad));
    const srcW = Math.min(w - srcX, Math.ceil(bounds.width + pad * 2));
    const srcH = Math.min(h - srcY, Math.ceil(bounds.height + pad * 2));
    if (srcW <= 0 || srcH <= 0) return;

    // Snapshot nội dung gốc trước khi warp
    const snapCanvas = document.createElement("canvas");
    snapCanvas.width = srcW;
    snapCanvas.height = srcH;
    const sCtx = snapCanvas.getContext("2d");
    if (!sCtx) return;
    sCtx.drawImage(layer.canvas, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

    // Xóa vùng text trên layer để vẽ kết quả warp
    layer.ctx.clearRect(srcX, srcY, srcW, srcH);

    // 4 góc đích tuyệt đối
    const pTL = { x: bounds.x - pad + pts.tl.x, y: bounds.y - pad + pts.tl.y };
    const pTR = { x: bounds.x + bounds.width + pad + pts.tr.x, y: bounds.y - pad + pts.tr.y };
    const pBR = { x: bounds.x + bounds.width + pad + pts.br.x, y: bounds.y + bounds.height + pad + pts.br.y };
    const pBL = { x: bounds.x - pad + pts.bl.x, y: bounds.y + bounds.height + pad + pts.bl.y };

    // Chia lưới NxN phân đoạn
    const SUBDIV = 16;
    const getDestPoint = (u: number, v: number) => {
      // Bilinear interpolation
      const topX = pTL.x + (pTR.x - pTL.x) * u;
      const topY = pTL.y + (pTR.y - pTL.y) * u;
      const botX = pBL.x + (pBR.x - pBL.x) * u;
      const botY = pBL.y + (pBR.y - pBL.y) * u;
      return {
        x: topX + (botX - topX) * v,
        y: topY + (botY - topY) * v,
      };
    };

    // Hàm biến đổi affine cho 1 tam giác từ snapshot sang layer canvas
    const drawTriangle = (
      p0: { x: number; y: number },
      p1: { x: number; y: number },
      p2: { x: number; y: number },
      s0: { x: number; y: number },
      s1: { x: number; y: number },
      s2: { x: number; y: number }
    ) => {
      layer.ctx.save();
      // Nới clip tam giác ra ngoài (theo hướng tâm tam giác) ~1-2px để các mảnh
      // warp chồng lấn lên nhau, lấp chỗ khuyết do anti-aliasing của clip →
      // không còn đường kẻ lưới (seams) giữa các tam giác kề.
      const cx = (p0.x + p1.x + p2.x) / 3;
      const cy = (p0.y + p1.y + p2.y) / 3;
      const expandPt = (px: number, py: number) => {
        const vx = px - cx;
        const vy = py - cy;
        const len = Math.sqrt(vx * vx + vy * vy) || 1;
        return {
          x: cx + vx * 1.05 + (vx / len) * 1.5,
          y: cy + vy * 1.05 + (vy / len) * 1.5,
        };
      };
      const e0 = expandPt(p0.x, p0.y);
      const e1 = expandPt(p1.x, p1.y);
      const e2 = expandPt(p2.x, p2.y);
      layer.ctx.beginPath();
      layer.ctx.moveTo(e0.x, e0.y);
      layer.ctx.lineTo(e1.x, e1.y);
      layer.ctx.lineTo(e2.x, e2.y);
      layer.ctx.closePath();
      layer.ctx.clip();

      const denom = (s0.x - s2.x) * (s1.y - s2.y) - (s1.x - s2.x) * (s0.y - s2.y);
      if (Math.abs(denom) > 1e-6) {
        const m11 = ((p0.x - p2.x) * (s1.y - s2.y) - (p1.x - p2.x) * (s0.y - s2.y)) / denom;
        const m12 = ((p0.y - p2.y) * (s1.y - s2.y) - (p1.y - p2.y) * (s0.y - s2.y)) / denom;
        const m21 = ((p1.x - p2.x) * (s0.x - s2.x) - (p0.x - p2.x) * (s1.x - s2.x)) / denom;
        const m22 = ((p1.y - p2.y) * (s0.x - s2.x) - (p0.y - p2.y) * (s1.x - s2.x)) / denom;
        const dx = p2.x - m11 * s2.x - m21 * s2.y;
        const dy = p2.y - m12 * s2.x - m22 * s2.y;

        layer.ctx.transform(m11, m12, m21, m22, dx, dy);
        layer.ctx.drawImage(snapCanvas, 0, 0);
      }
      layer.ctx.restore();
    };

    for (let iy = 0; iy < SUBDIV; iy++) {
      const v0 = iy / SUBDIV;
      const v1 = (iy + 1) / SUBDIV;
      const sy0 = v0 * srcH;
      const sy1 = v1 * srcH;

      for (let ix = 0; ix < SUBDIV; ix++) {
        const u0 = ix / SUBDIV;
        const u1 = (ix + 1) / SUBDIV;
        const sx0 = u0 * srcW;
        const sx1 = u1 * srcW;

        const d00 = getDestPoint(u0, v0);
        const d10 = getDestPoint(u1, v0);
        const d01 = getDestPoint(u0, v1);
        const d11 = getDestPoint(u1, v1);

        // Tam giác 1: d00, d10, d01
        drawTriangle(
          d00, d10, d01,
          { x: sx0, y: sy0 },
          { x: sx1, y: sy0 },
          { x: sx0, y: sy1 }
        );

        // Tam giác 2: d10, d11, d01
        drawTriangle(
          d10, d11, d01,
          { x: sx1, y: sy0 },
          { x: sx1, y: sy1 },
          { x: sx0, y: sy1 }
        );
      }
    }
  }

  /**
   * Apply 3D Text Extrusion (Depth, View type: Perspective | Oblique, Darken)
   */
  private apply3DTextExtrusion(layer: Layer, bounds: TextBounds): void {
    const depth = Math.max(1, Math.min(100, layer.text3dDepth ?? 15));
    const viewType = layer.text3dViewType || "oblique";
    const darkenRatio = Math.max(0, Math.min(1, (layer.text3dDarken ?? 30) / 100));

    const w = layer.canvas.width;
    const h = layer.canvas.height;
    if (w <= 0 || h <= 0) return;

    // Snapshot mặt trước của text hiện tại
    const frontCanvas = document.createElement("canvas");
    frontCanvas.width = w;
    frontCanvas.height = h;
    const fCtx = frontCanvas.getContext("2d");
    if (!fCtx) return;
    fCtx.drawImage(layer.canvas, 0, 0);

    // Xóa layer để vẽ lại từ các lớp độ sâu (extrusion layers) từ sau ra trước, rồi vẽ mặt trước đè lên
    layer.ctx.clearRect(0, 0, w, h);

    // Xác định nguồn fill đùn khối 3D (string màu hex hoặc object Gradient/Pattern)
    let extrudeFillObj: any = null;
    let extrudeBaseColorHex = "#000000";

    if (layer.text3dColorMode === "color" && layer.text3dColor) {
      if (typeof layer.text3dColor === "string") {
        extrudeBaseColorHex = layer.text3dColor;
      } else if (typeof layer.text3dColor === "object" && layer.text3dColor !== null) {
        extrudeFillObj = layer.text3dColor;
        if (extrudeFillObj.kind === "solid") {
          extrudeBaseColorHex = extrudeFillObj.hex || "#000000";
          extrudeFillObj = null;
        }
      }
    } else {
      // Auto: lấy từ fontColor của layer
      if (typeof layer.fontColor === "string") {
        extrudeBaseColorHex = layer.fontColor;
      } else if (typeof layer.fontColor === "object" && layer.fontColor !== null) {
        const fc = layer.fontColor as any;
        if (fc.kind === "solid") {
          extrudeBaseColorHex = fc.hex || "#000000";
        } else {
          extrudeFillObj = fc;
        }
      }
    }

    // Parse base color sang RGB cho trường hợp màu đơn
    let r = 0, g = 0, b = 0;
    if (!extrudeFillObj && extrudeBaseColorHex.startsWith("#")) {
      let hex = extrudeBaseColorHex.slice(1);
      if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
      r = parseInt(hex.slice(0, 2), 16) || 0;
      g = parseInt(hex.slice(2, 4), 16) || 0;
      b = parseInt(hex.slice(4, 6), 16) || 0;
    }

    // Chuẩn bị pattern / gradient canvas nếu extrudeFillObj tồn tại
    let gradientPatternCanvas: HTMLCanvasElement | null = null;
    if (extrudeFillObj) {
      gradientPatternCanvas = document.createElement("canvas");
      gradientPatternCanvas.width = w;
      gradientPatternCanvas.height = h;
      const gpCtx = gradientPatternCanvas.getContext("2d");
      if (gpCtx) {
        let gradFill: any = null;
        const isMesh =
          extrudeFillObj.kind === "custom" &&
          extrudeFillObj.data &&
          (extrudeFillObj.data.type === "radial" || extrudeFillObj.data.type === "mesh");

        if (isMesh) {
          gradFill = ColorModule.createMeshPatternForBounds(gpCtx, bounds, extrudeFillObj);
        } else {
          gradFill = ColorModule.createGradientFillForCtx(gpCtx, bounds, extrudeFillObj);
        }

        gpCtx.fillStyle = gradFill || "#000000";
        gpCtx.fillRect(0, 0, w, h);
      }
    }

    // Tạo silhouette mask canvas cho extrusion
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = w;
    maskCanvas.height = h;
    const mCtx = maskCanvas.getContext("2d");
    if (!mCtx) return;

    mCtx.drawImage(frontCanvas, 0, 0);
    mCtx.globalCompositeOperation = "source-in";
    mCtx.fillStyle = "#ffffff";
    mCtx.fillRect(0, 0, w, h);

    // Vẽ các lát cắt extrusion theo hướng từ xa nhất (z = depth) về gần (z = 1)
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const canvasCenterX = w / 2;
    const canvasCenterY = h / 2;

    const steps = Math.max(depth, Math.round(depth * 1.5));

    for (let s = steps; s >= 1; s--) {
      const t = s / steps; // 1 (xa nhất) -> 0 (gần mặt trước)
      const curDepthPx = t * depth;

      // Tính offset dx, dy tùy theo viewType
      let dx = 0;
      let dy = 0;
      let scale = 1.0;

      if (viewType === "oblique") {
        // Oblique: góc 45 độ hướng xuống dưới bên phải (hoặc xiên)
        const angle = -Math.PI / 4; // 45 deg chéo xuống phải
        dx = Math.cos(angle) * curDepthPx;
        dy = -Math.sin(angle) * curDepthPx;
      } else {
        // Perspective: tụ về tâm canvas hoặc tâm văn bản
        const dirX = canvasCenterX - centerX;
        const dirY = canvasCenterY - centerY;
        const dist = Math.hypot(dirX, dirY) || 1;
        const normX = dirX / dist;
        const normY = dirY / dist;

        dx = normX * curDepthPx * 0.8;
        dy = normY * curDepthPx * 0.8;
        scale = 1.0 - t * 0.12 * (depth / 100);
      }

      layer.ctx.save();
      if (scale !== 1.0) {
        layer.ctx.translate(centerX + dx, centerY + dy);
        layer.ctx.scale(scale, scale);
        layer.ctx.translate(-centerX, -centerY);
      } else {
        layer.ctx.translate(dx, dy);
      }

      // Tô màu lát cắt
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = w;
      sliceCanvas.height = h;
      const slCtx = sliceCanvas.getContext("2d");
      if (slCtx) {
        if (gradientPatternCanvas) {
          // Vẽ gradient pattern
          slCtx.drawImage(gradientPatternCanvas, 0, 0);
          // Darken shading cho gradient bằng lớp phủ màu đen bán trong suốt
          const darkAlpha = Math.max(0, Math.min(1, darkenRatio * t));
          if (darkAlpha > 0.001) {
            slCtx.fillStyle = `rgba(0, 0, 0, ${darkAlpha})`;
            slCtx.fillRect(0, 0, w, h);
          }
        } else {
          // Tô màu đơn sắc với tính toán Darken
          const factor = 1.0 - darkenRatio * t;
          const curR = Math.max(0, Math.min(255, Math.round(r * factor)));
          const curG = Math.max(0, Math.min(255, Math.round(g * factor)));
          const curB = Math.max(0, Math.min(255, Math.round(b * factor)));
          slCtx.fillStyle = `rgb(${curR},${curG},${curB})`;
          slCtx.fillRect(0, 0, w, h);
        }

        // Cắt theo silhouette mask
        slCtx.globalCompositeOperation = "destination-in";
        slCtx.drawImage(maskCanvas, 0, 0);
        layer.ctx.drawImage(sliceCanvas, 0, 0);
      }
      layer.ctx.restore();
    }

    // Cuối cùng vẽ mặt trước (Front text) nguyên bản đè lên
    layer.ctx.drawImage(frontCanvas, 0, 0);

    // Áp dụng Simulate lighting cho 3D Text nếu bật
    if (layer.text3dLightingEnabled) {
      this.apply3DTextLighting(layer, bounds);
    }

    // Áp dụng xoay 3D Rotation của chính 3D Text (X, Y, Z rotation) nếu có
    const rotXDeg = Math.max(-80, Math.min(80, layer.text3dRotateX ?? 0));
    const rotYDeg = Math.max(-80, Math.min(80, layer.text3dRotateY ?? 0));
    const rotZDeg = Math.max(-180, Math.min(180, layer.text3dRotateZ ?? 0));

    if (rotXDeg !== 0 || rotYDeg !== 0 || rotZDeg !== 0) {
      this.apply3DRotateAngles(layer, bounds, rotXDeg, rotYDeg, rotZDeg);
    }
  }

  /**
   * Apply directional lighting, shadow and specular highlight onto 3D Text
   */
  private apply3DTextLighting(layer: Layer, bounds: TextBounds): void {
    const w = layer.canvas.width;
    const h = layer.canvas.height;
    if (w <= 0 || h <= 0) return;

    // Quét vùng bounding box có pixel alpha > 0 thực tế trên canvas
    const fullImg = layer.ctx.getImageData(0, 0, w, h);
    const fullData = fullImg.data;

    const pad = Math.max(20, Math.round((layer.text3dDepth ?? 15) * 2));
    let minX = Math.max(0, Math.floor(bounds.x - pad));
    let minY = Math.max(0, Math.floor(bounds.y - pad));
    let maxX = Math.min(w - 1, Math.ceil(bounds.x + bounds.width + pad * 2));
    let maxY = Math.min(h - 1, Math.ceil(bounds.y + bounds.height + pad * 2));

    const areaW = maxX - minX + 1;
    const areaH = maxY - minY + 1;
    if (areaW <= 0 || areaH <= 0) return;

    const angleDeg = layer.text3dLightAngle ?? 90;
    const intensity = Math.max(0, Math.min(100, layer.text3dLightIntensity ?? 80)) / 50; // 0 -> 2
    const shadow = Math.max(0, Math.min(100, layer.text3dLightShadow ?? 40)) / 100; // 0 -> 1
    const specular = Math.max(0, Math.min(100, layer.text3dLightSpecular ?? 30)) / 100; // 0 -> 1

    const rad = (angleDeg * Math.PI) / 180;
    const lx = Math.cos(rad);
    const ly = Math.sin(rad);
    const lz = 0.6;
    const lLen = Math.sqrt(lx * lx + ly * ly + lz * lz);
    const nLx = lx / lLen;
    const nLy = ly / lLen;
    const nLz = lz / lLen;

    const step = 2;
    const hardness = Math.max(1, specular * 60 + 5);

    const bumpCanvas = document.createElement("canvas");
    bumpCanvas.width = areaW;
    bumpCanvas.height = areaH;
    const bCtx = bumpCanvas.getContext("2d");
    if (!bCtx) return;
    const bumpImgData = bCtx.createImageData(areaW, areaH);
    const outData = bumpImgData.data;

    for (let sy = 0; sy < areaH; sy++) {
      const gy = minY + sy;
      const yUp = Math.max(0, gy - step);
      const yDn = Math.min(h - 1, gy + step);
      const rowOffset = gy * w * 4;

      for (let sx = 0; sx < areaW; sx++) {
        const gx = minX + sx;
        const curAlpha = fullData[rowOffset + gx * 4 + 3];
        const outIdx = (sy * areaW + sx) * 4;

        if (curAlpha < 5) {
          outData[outIdx + 3] = 0;
          continue;
        }

        const xLt = Math.max(0, gx - step);
        const xRt = Math.min(w - 1, gx + step);

        const aL = fullData[gy * w * 4 + xLt * 4 + 3];
        const aR = fullData[gy * w * 4 + xRt * 4 + 3];
        const aU = fullData[yUp * w * 4 + gx * 4 + 3];
        const aD = fullData[yDn * w * 4 + gx * 4 + 3];

        const dzdx = (aR - aL) / 255.0;
        const dzdy = (aD - aU) / 255.0;

        const nx = -dzdx * 2.0;
        const ny = -dzdy * 2.0;
        const nz = 1.0;
        const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
        const normX = nx / nLen;
        const normY = ny / nLen;
        const normZ = nz / nLen;

        // Diffuse factor
        const dotNL = normX * nLx + normY * nLy + normZ * nLz;
        const diff = dotNL * intensity;

        // Specular factor (Blinn-Phong)
        const hx = nLx;
        const hy = nLy;
        const hz = nLz + 1.0;
        const hLen = Math.sqrt(hx * hx + hy * hy + hz * hz);
        const dotNH = Math.max(0, (normX * hx + normY * hy + normZ * hz) / hLen);
        const spec = Math.pow(dotNH, hardness) * (specular * intensity * 1.5);

        const lightVal = diff + spec;

        if (lightVal >= 0) {
          // Highlight: màu trắng
          const lightAmount = Math.min(255, Math.round(lightVal * 255));
          outData[outIdx] = 255;
          outData[outIdx + 1] = 255;
          outData[outIdx + 2] = 255;
          outData[outIdx + 3] = Math.round((lightAmount * curAlpha) / 255);
        } else {
          // Shadow: màu đen pha theo slider shadow
          const darkAmount = Math.min(255, Math.round(Math.abs(lightVal) * shadow * 255));
          outData[outIdx] = 0;
          outData[outIdx + 1] = 0;
          outData[outIdx + 2] = 0;
          outData[outIdx + 3] = Math.round((darkAmount * curAlpha) / 255);
        }
      }
    }

    bCtx.putImageData(bumpImgData, 0, 0);

    // Vẽ lớp ánh sáng & bóng lên khối chữ
    layer.ctx.save();
    layer.ctx.drawImage(bumpCanvas, minX, minY);
    layer.ctx.restore();
  }

  /**
   * Apply 3D rotation along X and Y axes with perspective projection
   */
  private apply3DRotate(layer: Layer, bounds: TextBounds): void {
    const rx = ((layer.rotate3dX ?? 0) * Math.PI) / 180;
    const ry = ((layer.rotate3dY ?? 0) * Math.PI) / 180;
    if (rx === 0 && ry === 0) return;
    this.apply3DRotateAngles(layer, bounds, layer.rotate3dX ?? 0, layer.rotate3dY ?? 0, 0);
  }

  /**
   * Helper warp mesh 3D rotate cho X, Y, Z rotation với camera perspective
   */
  private apply3DRotateAngles(
    layer: Layer,
    bounds: TextBounds,
    degX: number,
    degY: number,
    degZ: number
  ): void {
    const rx = (degX * Math.PI) / 180;
    const ry = (degY * Math.PI) / 180;
    const rz = (degZ * Math.PI) / 180;

    const w = layer.canvas.width;
    const h = layer.canvas.height;
    if (w <= 0 || h <= 0) return;

    const pad = Math.max(20, Math.round((layer.text3dDepth ?? 15) * 1.5));
    const srcX = Math.max(0, Math.floor(bounds.x - pad));
    const srcY = Math.max(0, Math.floor(bounds.y - pad));
    const srcW = Math.min(w - srcX, Math.ceil(bounds.width + pad * 2));
    const srcH = Math.min(h - srcY, Math.ceil(bounds.height + pad * 2));
    if (srcW <= 0 || srcH <= 0) return;

    const snapCanvas = document.createElement("canvas");
    snapCanvas.width = srcW;
    snapCanvas.height = srcH;
    const sCtx = snapCanvas.getContext("2d");
    if (!sCtx) return;
    sCtx.drawImage(layer.canvas, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

    layer.ctx.clearRect(srcX, srcY, srcW, srcH);

    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const fov = 800; // perspective distance

    // Project (x, y, 0) relative to center with 3D rotation Z -> Y -> X
    const cosZ = Math.cos(rz), sinZ = Math.sin(rz);
    const cosY = Math.cos(ry), sinY = Math.sin(ry);
    const cosX = Math.cos(rx), sinX = Math.sin(rx);

    const project3D = (gx: number, gy: number) => {
      const dx = gx - centerX;
      const dy = gy - centerY;

      // 1. Rotation around Z axis (rz)
      const x0 = dx * cosZ - dy * sinZ;
      const y0 = dx * sinZ + dy * cosZ;
      const z0 = 0;

      // 2. Rotation around Y axis (ry)
      const x1 = x0 * cosY + z0 * sinY;
      const y1 = y0;
      const z1 = -x0 * sinY + z0 * cosY;

      // 3. Rotation around X axis (rx)
      const x2 = x1;
      const y2 = y1 * cosX - z1 * sinX;
      const z2 = y1 * sinX + z1 * cosX;

      // Perspective projection
      const scale = fov / Math.max(50, fov + z2);
      return {
        x: centerX + x2 * scale,
        y: centerY + y2 * scale,
      };
    };

    const pTL = project3D(srcX, srcY);
    const pTR = project3D(srcX + srcW, srcY);
    const pBR = project3D(srcX + srcW, srcY + srcH);
    const pBL = project3D(srcX, srcY + srcH);

    const SUBDIV = 16;
    const getDestPoint = (u: number, v: number) => {
      const topX = pTL.x + (pTR.x - pTL.x) * u;
      const topY = pTL.y + (pTR.y - pTL.y) * u;
      const botX = pBL.x + (pBR.x - pBL.x) * u;
      const botY = pBL.y + (pBR.y - pBL.y) * u;
      return {
        x: topX + (botX - topX) * v,
        y: topY + (botY - topY) * v,
      };
    };

    const drawTriangle = (
      p0: { x: number; y: number },
      p1: { x: number; y: number },
      p2: { x: number; y: number },
      s0: { x: number; y: number },
      s1: { x: number; y: number },
      s2: { x: number; y: number }
    ) => {
      layer.ctx.save();
      layer.ctx.beginPath();
      layer.ctx.moveTo(p0.x, p0.y);
      layer.ctx.lineTo(p1.x, p1.y);
      layer.ctx.lineTo(p2.x, p2.y);
      layer.ctx.closePath();
      layer.ctx.clip();

      const denom = (s0.x - s2.x) * (s1.y - s2.y) - (s1.x - s2.x) * (s0.y - s2.y);
      if (Math.abs(denom) > 1e-6) {
        const m11 = ((p0.x - p2.x) * (s1.y - s2.y) - (p1.x - p2.x) * (s0.y - s2.y)) / denom;
        const m12 = ((p0.y - p2.y) * (s1.y - s2.y) - (p1.y - p2.y) * (s0.y - s2.y)) / denom;
        const m21 = ((p1.x - p2.x) * (s0.x - s2.x) - (p0.x - p2.x) * (s1.x - s2.x)) / denom;
        const m22 = ((p1.y - p2.y) * (s0.x - s2.x) - (p0.y - p2.y) * (s1.x - s2.x)) / denom;
        const dx = p2.x - m11 * s2.x - m21 * s2.y;
        const dy = p2.y - m12 * s2.x - m22 * s2.y;

        layer.ctx.transform(m11, m12, m21, m22, dx, dy);
        layer.ctx.drawImage(snapCanvas, 0, 0);
      }
      layer.ctx.restore();
    };

    for (let iy = 0; iy < SUBDIV; iy++) {
      const v0 = iy / SUBDIV;
      const v1 = (iy + 1) / SUBDIV;
      const sy0 = v0 * srcH;
      const sy1 = v1 * srcH;

      for (let ix = 0; ix < SUBDIV; ix++) {
        const u0 = ix / SUBDIV;
        const u1 = (ix + 1) / SUBDIV;
        const sx0 = u0 * srcW;
        const sx1 = u1 * srcW;

        const d00 = getDestPoint(u0, v0);
        const d10 = getDestPoint(u1, v0);
        const d01 = getDestPoint(u0, v1);
        const d11 = getDestPoint(u1, v1);

        drawTriangle(
          d00, d10, d01,
          { x: sx0, y: sy0 },
          { x: sx1, y: sy0 },
          { x: sx0, y: sy1 }
        );

        drawTriangle(
          d10, d11, d01,
          { x: sx1, y: sy0 },
          { x: sx1, y: sy1 },
          { x: sx0, y: sy1 }
        );
      }
    }
  }

  /**
   * Render 3D Ground Shadow của tấm bìa hình chữ nhật (perspective cast shadow ngả xuống sàn)
   */
  private apply3DShadow(
    layer: Layer,
    bounds: TextBounds,
    _drawX: number,
    _lineHeight: number,
    _lines: string[],
    _style: string,
    _weight: string,
    _effAlign: CanvasTextAlign,
    _isRtl: boolean
  ): void {
    const w = layer.canvas.width;
    const h = layer.canvas.height;
    if (w <= 0 || h <= 0) return;

    const alpha = Math.min(1, Math.max(0, layer.shadow3dOpacity ?? 0.5));
    if (alpha <= 0) return;

    const blur = Math.max(0, Math.min(25, layer.shadow3dBlur ?? 4));
    const expand = Math.max(0, Math.min(50, layer.shadow3dExpand ?? 0));

    // Get shadow direction from layer properties
    const angle = ((layer.shadow3dAngle ?? 135) * Math.PI) / 180;
    const distance = layer.shadow3dDistance ?? 26;

    const rawColor = layer.shadow3dColor;
    const shadowFillObj =
      rawColor && typeof rawColor === "object" ? (rawColor as any) : null;
    let shadowHex = "#000000";
    if (typeof rawColor === "string" && rawColor.startsWith("#")) {
      shadowHex = rawColor;
    }
    const r = parseInt(shadowHex.slice(1, 3), 16) || 0;
    const g = parseInt(shadowHex.slice(3, 5), 16) || 0;
    const b = parseInt(shadowHex.slice(5, 7), 16) || 0;

    // Tọa độ tấm bìa hình chữ nhật bao quanh chữ
    const cardLeft = bounds.x - expand;
    const cardRight = bounds.x + bounds.width + expand;
    const cardTop = bounds.y;
    const cardBottom = bounds.y + bounds.height;

    // Calculate shadow projection based on angle and distance
    const shadowLength = distance * 3; // Multiplier for visual effect
    const offsetX = Math.cos(angle) * shadowLength;
    const offsetY = Math.sin(angle) * shadowLength;

    // Calculate perspective spread based on distance
    const perspectiveSpread = (bounds.width * 0.08 + expand * 0.2) * (distance / 30);

    // Calculate the four corners of the shadow trapezoid
    const pTopLeft = { x: cardLeft, y: cardTop };
    const pTopRight = { x: cardRight, y: cardTop };
    const pBottomLeft = {
      x: cardLeft + offsetX - perspectiveSpread,
      y: cardTop + offsetY,
    };
    const pBottomRight = {
      x: cardRight + offsetX + perspectiveSpread,
      y: cardTop + offsetY,
    };

    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = w;
    shadowCanvas.height = h;
    const sCtx = shadowCanvas.getContext("2d");
    if (!sCtx) return;

    // Gradient bóng đổ: đậm ở chân chữ và nhạt dần theo hướng bóng
    const gradStartX = (cardLeft + cardRight) / 2;
    const gradStartY = (cardTop + cardBottom) / 2;
    const gradEndX = gradStartX + offsetX;
    const gradEndY = gradStartY + offsetY;

    const grad = sCtx.createLinearGradient(gradStartX, gradStartY, gradEndX, gradEndY);

    if (blur > 0) {
      sCtx.shadowColor = shadowFillObj
        ? `rgba(0,0,0,${alpha})`
        : `rgba(${r},${g},${b},${alpha})`;
      sCtx.shadowBlur = blur;
      sCtx.shadowOffsetY = h * 2;
    }

    const startColor = `rgba(${r},${g},${b},${alpha})`;
    const endColor = `rgba(${r},${g},${b},0)`;

    grad.addColorStop(0, shadowFillObj ? "rgba(0,0,0,1)" : startColor);
    grad.addColorStop(0.7, shadowFillObj ? "rgba(0,0,0,0.4)" : `rgba(${r},${g},${b},${alpha * 0.4})`);
    grad.addColorStop(1, shadowFillObj ? "rgba(0,0,0,0)" : endColor);

    sCtx.fillStyle = grad;

    // Vẽ khối bóng đổ hình bình hành/hình thang theo hướng đã chọn
    const offsetBlurY = blur > 0 ? -h * 2 : 0;
    sCtx.beginPath();
    sCtx.moveTo(pTopLeft.x, pTopLeft.y + offsetBlurY);
    sCtx.lineTo(pTopRight.x, pTopRight.y + offsetBlurY);
    sCtx.lineTo(pBottomRight.x, pBottomRight.y + offsetBlurY);
    sCtx.lineTo(pBottomLeft.x, pBottomLeft.y + offsetBlurY);
    sCtx.closePath();
    sCtx.fill();

    if (blur > 0) {
      sCtx.shadowOffsetY = 0;
      sCtx.shadowBlur = 0;
    }

    // Gradient fill từ ColorModule
    if (shadowFillObj) {
      const minX = Math.min(pTopLeft.x, pBottomLeft.x, pTopRight.x, pBottomRight.x);
      const maxX = Math.max(pTopLeft.x, pBottomLeft.x, pTopRight.x, pBottomRight.x);
      const minY = Math.min(pTopLeft.y, pBottomLeft.y, pTopRight.y, pBottomRight.y);
      const maxY = Math.max(pTopLeft.y, pBottomLeft.y, pTopRight.y, pBottomRight.y);
      const gradBounds = {
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
      };
      const tintCanvas = document.createElement("canvas");
      tintCanvas.width = w;
      tintCanvas.height = h;
      const tintCtx = tintCanvas.getContext("2d");
      if (tintCtx) {
        let tintFill: CanvasGradient | CanvasPattern | null =
          ColorModule.createGradientFillForCtx(tintCtx, gradBounds, shadowFillObj);
        if (!tintFill) {
          tintFill = ColorModule.createMeshPatternForBounds(tintCtx, gradBounds, shadowFillObj);
        }
        if (tintFill) {
          tintCtx.fillStyle = tintFill as string | CanvasGradient | CanvasPattern;
          tintCtx.fillRect(0, 0, w, h);
          tintCtx.globalCompositeOperation = "destination-in";
          tintCtx.drawImage(shadowCanvas, 0, 0);

          sCtx.clearRect(0, 0, w, h);
          sCtx.drawImage(tintCanvas, 0, 0);
        }
      }
    }

    // Vẽ bóng tấm bìa phía sau/dưới chữ
    layer.ctx.save();
    layer.ctx.drawImage(shadowCanvas, 0, 0);
    layer.ctx.restore();
  }

  /**
   * Render Reflection (phản chiếu gương lật ngược phía dưới chữ)
   * Ở offset = -50, chữ phản chiếu sát khít bằng mép chữ chính.
   */
  private applyReflection(layer: Layer, bounds: TextBounds): void {
    const w = layer.canvas.width;
    const h = layer.canvas.height;
    if (w <= 0 || h <= 0) return;

    // Chụp lại toàn bộ text layer hiện tại
    const snapCanvas = document.createElement("canvas");
    snapCanvas.width = w;
    snapCanvas.height = h;
    const sCtx = snapCanvas.getContext("2d");
    if (!sCtx) return;
    sCtx.drawImage(layer.canvas, 0, 0);

    // Tính toán trục phản chiếu (mép dưới của chữ chính)
    const textBottom = bounds.y + bounds.height;

    // Offset: từ -100 ~ 100
    // Khi offset = 0: khoảng cách = 0 (bóng phản chiếu sát khít với đáy chữ chính)
    // Khi offset < 0 (-100 ~ 0): bóng đi lên lấn quá chân chữ
    // Khi offset > 0 (0 ~ 100): bóng lùi dần xuống dưới
    const offsetVal = layer.reflectionOffset ?? 0;
    const gap = offsetVal * 1.0;

    const mirrorCanvas = document.createElement("canvas");
    mirrorCanvas.width = w;
    mirrorCanvas.height = h;
    const mCtx = mirrorCanvas.getContext("2d");
    if (!mCtx) return;

    // Lật ngược theo chiều dọc qua trục textBottom + gap / 2
    // y_new = textBottom + gap + (textBottom - y)
    // y_new = 2 * textBottom + gap - y
    mCtx.save();
    mCtx.translate(0, 2 * textBottom + gap);
    mCtx.scale(1, -1);
    mCtx.drawImage(snapCanvas, 0, 0);
    mCtx.restore();

    // Áp dụng gradient mờ dần từ trên xuống dưới cho bóng phản chiếu
    const reflectTop = textBottom + gap;
    const reflectBottom = reflectTop + bounds.height;

    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = w;
    maskCanvas.height = h;
    const maskCtx = maskCanvas.getContext("2d");
    if (maskCtx) {
      const grad = maskCtx.createLinearGradient(0, reflectTop, 0, reflectBottom);
      grad.addColorStop(0, "rgba(255, 255, 255, 0.45)");
      grad.addColorStop(0.5, "rgba(255, 255, 255, 0.15)");
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");

      maskCtx.fillStyle = grad;
      maskCtx.fillRect(0, 0, w, h);

      mCtx.globalCompositeOperation = "destination-in";
      mCtx.drawImage(maskCanvas, 0, 0);
    }

    // Vẽ bóng phản chiếu lên layer chính
    layer.ctx.save();
    layer.ctx.drawImage(mirrorCanvas, 0, 0);
    layer.ctx.restore();
  }

  /**
   * Draw selection overlay and resize handle on main canvas
   */
  drawSelectionOverlay(layer: Layer | null): void {
    if (!layer) return;

    const bounds = this.getTextBounds(layer);
    if (!bounds) return;

    const ctx = this.layerManager.mainCtx;

    ctx.save();

    if (layer.rotation) {
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
    }

    ctx.strokeStyle = "#00f260";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(
      bounds.x - 10,
      bounds.y - 10,
      bounds.width + 20,
      bounds.height + 20
    );
    ctx.setLineDash([]);

    const handleSize = bounds.resizeHandleSize;
    ctx.fillStyle = "#00f260";
    ctx.fillRect(
      bounds.resizeHandleX - handleSize / 2,
      bounds.resizeHandleY - handleSize / 2,
      handleSize,
      handleSize
    );

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      bounds.resizeHandleX - handleSize / 2,
      bounds.resizeHandleY - handleSize / 2,
      handleSize,
      handleSize
    );

    // Vẽ 4 handles góc phối cảnh nếu đang trong perspective mode VÀ Enabled đang bật
    if (this.isPerspectiveMode && layer.perspectiveEnabled) {
      const corners = this.getPerspectiveCornerPoints(layer, bounds);
      const cSize = 14;
      const cornerList = [corners.tl, corners.tr, corners.br, corners.bl];

      // Nối đường quad biến dạng
      ctx.beginPath();
      ctx.strokeStyle = "#ff007f";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.moveTo(corners.tl.x, corners.tl.y);
      ctx.lineTo(corners.tr.x, corners.tr.y);
      ctx.lineTo(corners.br.x, corners.br.y);
      ctx.lineTo(corners.bl.x, corners.bl.y);
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);

      cornerList.forEach((pt) => {
        ctx.fillStyle = "#ff007f";
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, cSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    ctx.restore();
  }

  /**
   * Start inline text editing with textarea overlay
   */
  startTextEditing(layer: Layer | null, options: TextEditingOptions = {}): void {
    if (!layer || layer.type !== "text") return;
    if (layer.locked || !layer.visible) return;

    if (this.isEditing) {
      this.commitTextEditing();
    }

    const bounds = this.getTextBounds(layer);
    if (!bounds) return;

    const canvasArea = document.getElementById("canvas-area");
    if (!canvasArea) return;

    const editor = document.createElement("textarea");
    editor.className = "canvas-text-editor";
    const prevText = String(layer.text ?? "");
    let initialText = prevText;
    if (options.deleteBackward) {
      initialText = prevText.slice(0, Math.max(0, prevText.length - 1));
    } else if (options.deleteForward) {
      initialText = prevText.slice(1);
    }
    if (options.insertText) {
      initialText = initialText + String(options.insertText);
    }
    editor.value = initialText;
    editor.setAttribute("spellcheck", "false");
    editor.rows = 1;

    editor.addEventListener("mousedown", (ev) => ev.stopPropagation());
    editor.addEventListener("dblclick", (ev) => ev.stopPropagation());
    editor.addEventListener("click", (ev) => ev.stopPropagation());

    editor.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        this.cancelTextEditing();
        return;
      }
      if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") {
        ev.preventDefault();
        this.commitTextEditing();
      }
    });

    editor.addEventListener("input", () => {
      this.positionEditorForLayer(layer, editor);
      this.autosizeEditor(editor);
    });

    editor.addEventListener("blur", () => {
      this.commitTextEditing();
    });

    canvasArea.appendChild(editor);

    this.isEditing = true;
    this.editorEl = editor;
    this.editingLayer = layer;
    this.editingOriginalText = String(layer.text ?? "");

    layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    this.layerManager.render();
    this.drawSelectionOverlay(layer);

    this.positionEditorForLayer(layer, editor);
    this.autosizeEditor(editor);

    setTimeout(() => {
      editor.focus();
      editor.setSelectionRange(editor.value.length, editor.value.length);
    }, 0);
  }

  /**
   * Commit edited text from textarea overlay into layer
   */
  commitTextEditing(): void {
    if (!this.isEditing || !this.editorEl || !this.editingLayer) return;
    const newText = String(this.editorEl.value ?? "");
    const layerIdToCommit = this.editingLayer.id;
    const shouldDeleteLayer = newText.trim().length === 0;

    if (shouldDeleteLayer) {
      this.removeEditor();
      if (this.selectedLayer && this.selectedLayer.id === layerIdToCommit) {
        this.selectedLayer = null;
      }
      this.layerManager.deleteLayer(layerIdToCommit);
      this.layerManager.render();

      const hasTextLayers = this.layerManager.layers.some(
        (l) => l.type === "text"
      );
      if (!hasTextLayers) {
        eventBus.emit("text:hide-properties");
      }
      return;
    }

    this.editingLayer.text = newText;

    const safeName = newText.replace(/\s+/g, " ").trim();
    const newName =
      safeName.length > 20
        ? safeName.substring(0, 20) + "..."
        : safeName || "Text";
    this.editingLayer.name = newName;

    this.redrawTextLayer(this.editingLayer);
    this.layerManager.render();
    this.drawSelectionOverlay(this.editingLayer);
    eventBus.emit("layer:changed", this.layerManager.getLayersList());
    eventBus.emit("text:edited", {
      layer: this.editingLayer,
      text: newText,
    });

    this.removeEditor();
  }

  /**
   * Cancel inline editing and revert text
   */
  cancelTextEditing(): void {
    if (!this.isEditing || !this.editorEl || !this.editingLayer) return;
    this.editingLayer.text = this.editingOriginalText;
    this.redrawTextLayer(this.editingLayer);
    this.layerManager.render();
    this.drawSelectionOverlay(this.editingLayer);
    this.removeEditor();
  }

  /**
   * Remove textarea overlay from DOM
   */
  removeEditor(): void {
    if (this.editorEl && this.editorEl.parentNode) {
      this.editorEl.parentNode.removeChild(this.editorEl);
    }
    this.editorEl = null;
    this.editingLayer = null;
    this.editingOriginalText = "";
    this.isEditing = false;
  }

  /**
   * Auto-resize textarea height to match scrollHeight
   */
  autosizeEditor(editor: HTMLTextAreaElement): void {
    editor.style.height = "auto";
    editor.style.height = `${Math.max(20, editor.scrollHeight)}px`;
  }

  /**
   * Position textarea overlay over the active layer
   */
  positionEditorForLayer(layer: Layer, editor: HTMLTextAreaElement): void {
    const bounds = this.getTextBounds(layer);
    if (!bounds) return;

    const canvasArea = document.getElementById("canvas-area");
    if (!canvasArea) return;

    const areaRect = canvasArea.getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();
    const scaleX = canvasRect.width / this.canvas.width;
    const scaleY = canvasRect.height / this.canvas.height;

    const leftPx = canvasRect.left - areaRect.left + bounds.x * scaleX;
    const topPx = canvasRect.top - areaRect.top + bounds.y * scaleY;
    const widthPx = Math.max(20, (bounds.width + 2) * scaleX);
    const heightPx = Math.max(20, (bounds.height + 2) * scaleY);

    editor.style.left = `${leftPx}px`;
    editor.style.top = `${topPx}px`;
    editor.style.width = `${widthPx}px`;
    editor.style.minHeight = `${heightPx}px`;
    editor.style.fontSize = `${Math.max(10, layer.fontSize * scaleY)}px`;
    editor.style.lineHeight = `${Math.max(
      12,
      Math.round(layer.fontSize * 1.2) * scaleY
    )}px`;
    editor.style.fontFamily = layer.fontFamily;
    editor.style.color =
      typeof layer.fontColor === "string" ? layer.fontColor : "#ffffff";
    editor.style.textAlign = layer.textJustify ? "justify" : layer.textAlign;
    editor.style.direction = isRTL(layer.text || "") ? "rtl" : "ltr";
  }
}
