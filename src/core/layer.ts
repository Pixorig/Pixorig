/**
 * Layer & LayerManager - TypeScript thuần
 * Độc lập khỏi window.*, giao tiếp qua eventBus
 */

import { eventBus } from "./event-bus";

export type LayerType = "background" | "text" | "image" | "shape" | "normal";
export type TextDecoration =
  | "none"
  | "underline"
  | "double-underline"
  | "strikethrough"
  | "dashed-underline"
  | "wavy-underline"
  | "dotted-underline";

export interface LayerItemDTO {
  id: number;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number;
  isActive: boolean;
}

export class Layer {
  id: number;
  name: string;
  type: LayerType;
  visible = true;
  locked = false;
  opacity = 1.0;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  zIndex: number;

  // Text layer properties
  text: string | null = null;
  fontSize = 48;
  fontFamily = "Arial";
  fontWeight: "normal" | "bold" = "normal";
  fontStyle: "normal" | "italic" = "normal";
  textDecoration: TextDecoration = "none";
  underline = false;
  fontColor: string | any = "#000000";
  textAlign: CanvasTextAlign = "left";
  textJustify = false;
  letterSpacing = 0;
  wordSpacing = 0;
  lineSpacing = 0;
  paddingLeft = 0;
  paddingRight = 0;
  textureImage: HTMLImageElement | null = null;
  textureScale = 1.0;
  // Cache cho texture pattern (tránh tạo mới mỗi frame)
  _textureCacheCanvas: HTMLCanvasElement | null = null;
  _textureCacheW = 0;
  _textureCacheH = 0;
  _textureCacheImg: HTMLImageElement | null = null;
  _textureCacheScale = -1;
  x = 0;
  y = 0;

  // Transform
  rotation = 0;
  scaleX = 1;
  scaleY = 1;
  curveBend = 0;

  // Item background properties
  itemBgColor: string | { kind: string; [key: string]: any } | null = null;
  itemBgImage: HTMLImageElement | null = null;
  itemBgPaddingLeft = 0;
  itemBgPaddingRight = 0;
  itemBgPaddingTop = 0;
  itemBgPaddingBottom = 0;
  itemBgRadius = 0;
  // Stroke
  strokeColor: string | { kind: string; [key: string]: any } | null = null;
  strokeImage: HTMLImageElement | null = null;
  strokeWidth = 0;

  // Shadow — string hex hoặc BackgroundFill object (gradient)
  shadowColor: string | { kind: string; [key: string]: any } = "#000000";
  shadowOpacity = 0.5;
  shadowBlur = 4;
  shadowOffsetX = 0;
  shadowOffsetY = 4;
  shadowOuterGlow = false;
  shadowEnabled = false;

  // Inner Shadow — bóng đổ vào bên trong chữ (mask alpha của chính chữ)
  innerShadowColor: string | { kind: string; [key: string]: any } = "#000000";
  innerShadowOpacity = 0.6;
  innerShadowBlur = 5;
  innerShadowOffsetX = 0;
  innerShadowOffsetY = 4;
  innerShadowEnabled = false;

  // Emboss (3D Relief & Lighting)
  embossEnabled = false;
  embossAngle = 90; // độ (0 - 360)
  embossIntensity = 50; // 0 - 100
  embossAmbient = 50; // 0 - 100
  embossHardness = 20; // 0 - 100 (specular hardness)
  embossBevel = 3; // 0 - 100 (độ dày bevel / radius)

  // Perspective (4 corner warp)
  perspectiveEnabled = false;
  // Normalized corner offsets [-1..1] or relative [tl, tr, br, bl]
  perspectivePoints: { tl: { x: number; y: number }; tr: { x: number; y: number }; br: { x: number; y: number }; bl: { x: number; y: number } } = {
    tl: { x: 0, y: 0 },
    tr: { x: 0, y: 0 },
    br: { x: 0, y: 0 },
    bl: { x: 0, y: 0 },
  };

  // 3D Rotate (X Axis & Y Axis in degrees: -180 ~ 180)
  rotate3dX = 0;
  rotate3dY = 0;

  // 3D Text (Extrusion / Depth)
  text3dEnabled = false;
  text3dViewType: "perspective" | "oblique" = "oblique";
  text3dDepth = 15; // 1 - 100
  text3dColorMode: "auto" | "color" = "auto";
  text3dColor: string | { kind: string; [key: string]: any } = "#000000";
  text3dDarken = 30; // 0 - 100 (%)
  text3dRotateX = 0; // -80° ~ 80°
  text3dRotateY = 0; // -80° ~ 80°
  text3dRotateZ = 0; // -180° ~ 180°

  // 3D Text Lighting (Simulate lighting)
  text3dLightingEnabled = false;
  text3dLightAngle = 90; // 0 - 360 (degrees)
  text3dLightIntensity = 80; // 0 - 100
  text3dLightShadow = 40; // 0 - 100
  text3dLightSpecular = 30; // 0 - 100 (Specular Hardness)

  // 3D Shadow (Bóng đổ 3D mặt sàn / nền)
  shadow3dEnabled = false;
  shadow3dColor: string | { kind: string; [key: string]: any } = "#000000";
  shadow3dOpacity = 0.5; // 0% ~ 100% (0 ~ 1)
  shadow3dBlur = 4; // 0 ~ 25
  shadow3dExpand = 0; // 0 ~ 50 (Expand by)
  shadow3dAngle = 135; // 0 ~ 360 degrees (direction of shadow)
  shadow3dDistance = 26; // 0 ~ 100 (length of shadow)

  // Reflection (Phản chiếu bóng gương lật ngược phía dưới)
  reflectionEnabled = false;
  reflectionOffset = 0; // -100 ~ 100 (0 là sát mép chân chữ chính, âm là lấn lên trên chữ, dương là lùi xuống)

  // Cache mask alpha cho inner shadow (chỉ dựng lại khi layout chữ đổi)
  _innerShadowMaskCanvas: HTMLCanvasElement | null = null;
  _innerShadowMaskKey = "";
  _innerShadowMaskBBox: { minX: number; minY: number; maxX: number; maxY: number } | null = null;

  // Image reference nếu là background / image layer
  image?: HTMLImageElement;

  constructor(id: number, name: string, type: LayerType = "normal") {
    this.id = id;
    this.name = name;
    this.type = type;
    this.locked = type === "background";
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d")!;
    this.zIndex = id;
  }

  setSize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  clear(): void {
    // Allow background layer to clear its own content (e.g. for transparent / reload)
    if (this.locked && this.type !== "background") return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawImage(
    image: HTMLImageElement,
    x = 0,
    y = 0,
    width: number | null = null,
    height: number | null = null
  ): void {
    if (this.locked && this.type !== "background") return;

    if (this.type === "background") {
      this.image = image;
    }

    if (width !== null && height !== null) {
      this.ctx.drawImage(image, x, y, width, height);
    } else {
      this.ctx.drawImage(image, x, y);
    }
  }

  drawText(text: string, x: number, y: number): void {
    if (this.locked) return;

    this.text = text ?? "";
    this.x = x;
    this.y = y;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.font = `${this.fontStyle} ${this.fontWeight} ${this.fontSize}px ${this.fontFamily}`;
    this.ctx.fillStyle = this.fontColor;
    this.ctx.textAlign = this.textAlign;

    const lines = String(this.text).split("\n");
    const lineHeight = Math.round(this.fontSize * 1.2 + (this.lineSpacing || 0));
    for (let i = 0; i < lines.length; i++) {
      this.ctx.fillText(lines[i], x, y + i * lineHeight);
    }
  }

  toggleVisibility(): void {
    if (this.type === "background") return;
    this.visible = !this.visible;
  }

  toggleLock(): void {
    if (this.type === "background") return;
    this.locked = !this.locked;
  }

  rename(newName: string): void {
    if (this.type === "background") return;
    this.name = newName;
  }

  setOpacity(opacity: number): void {
    this.opacity = Math.max(0, Math.min(1, opacity));
  }
}

export class LayerManager {
  mainCanvas: HTMLCanvasElement;
  mainCtx: CanvasRenderingContext2D;
  layers: Layer[] = [];
  activeLayerId = 0;
  private nextLayerId = 1;

  constructor(mainCanvas: HTMLCanvasElement) {
    this.mainCanvas = mainCanvas;
    this.mainCtx = mainCanvas.getContext("2d")!;
    this.createBackgroundLayer();
  }

  createBackgroundLayer(): Layer {
    const bgLayer = new Layer(0, "Background", "background");
    bgLayer.setSize(this.mainCanvas.width, this.mainCanvas.height);
    this.layers.push(bgLayer);
    return bgLayer;
  }

  createLayer(name: string, type: LayerType = "normal"): Layer {
    const layer = new Layer(this.nextLayerId++, name, type);
    layer.setSize(this.mainCanvas.width, this.mainCanvas.height);
    layer.zIndex = this.layers.length;
    this.layers.push(layer);
    this.setActiveLayer(layer.id);
    eventBus.emit("layer:changed", this.getLayersList());
    return layer;
  }

  createTextLayer(
    text: string,
    x: number,
    y: number,
    fontSize = 48,
    fontFamily = "Arial",
    color = "#000000"
  ): Layer {
    const safeName = String(text ?? "").replace(/\s+/g, " ").trim();
    const layerName =
      safeName.length > 20
        ? safeName.substring(0, 20) + "..."
        : safeName || "Text";
    const layer = this.createLayer(layerName, "text");

    layer.fontSize = fontSize;
    layer.fontFamily = fontFamily;
    layer.fontColor = color;
    layer.drawText(String(text ?? ""), x, y);

    this.render();
    return layer;
  }

  getLayer(id: number): Layer | undefined {
    return this.layers.find((l) => l.id === id);
  }

  getActiveLayer(): Layer | undefined {
    return this.getLayer(this.activeLayerId);
  }

  getBackgroundLayer(): Layer {
    return this.layers[0];
  }

  setActiveLayer(id: number): boolean {
    const layer = this.getLayer(id);
    if (layer) {
      this.activeLayerId = id;
      eventBus.emit("layer:selected", layer);
      eventBus.emit("layer:changed", this.getLayersList());
      this.render();
      return true;
    }
    return false;
  }

  deleteLayer(id: number): boolean {
    if (id === 0) return false;

    const index = this.layers.findIndex((l) => l.id === id);
    if (index > 0) {
      this.layers.splice(index, 1);
      if (this.activeLayerId === id) {
        const nextActive = this.layers[this.layers.length - 1];
        this.setActiveLayer(nextActive.id);
      } else {
        eventBus.emit("layer:changed", this.getLayersList());
        this.render();
      }
      return true;
    }
    return false;
  }

  moveLayerUp(id: number): boolean {
    if (id === 0) return false;
    const index = this.layers.findIndex((l) => l.id === id);
    if (index > 1 && index < this.layers.length - 1) {
      const layer = this.layers[index];
      const upperLayer = this.layers[index + 1];
      [layer.zIndex, upperLayer.zIndex] = [upperLayer.zIndex, layer.zIndex];
      this.layers[index] = upperLayer;
      this.layers[index + 1] = layer;
      eventBus.emit("layer:changed", this.getLayersList());
      this.render();
      return true;
    }
    return false;
  }

  moveLayerDown(id: number): boolean {
    if (id === 0) return false;
    const index = this.layers.findIndex((l) => l.id === id);
    if (index > 1) {
      const layer = this.layers[index];
      const lowerLayer = this.layers[index - 1];
      [layer.zIndex, lowerLayer.zIndex] = [lowerLayer.zIndex, layer.zIndex];
      this.layers[index] = lowerLayer;
      this.layers[index - 1] = layer;
      eventBus.emit("layer:changed", this.getLayersList());
      this.render();
      return true;
    }
    return false;
  }

  reorderLayer(draggedId: number, targetId: number): boolean {
    if (draggedId === 0 || targetId === 0) return false;
    const draggedIndex = this.layers.findIndex((l) => l.id === draggedId);
    const targetIndex = this.layers.findIndex((l) => l.id === targetId);
    if (draggedIndex !== -1 && targetIndex !== -1) {
      const draggedLayer = this.layers[draggedIndex];
      this.layers.splice(draggedIndex, 1);
      this.layers.splice(targetIndex, 0, draggedLayer);
      this.layers.forEach((layer, idx) => {
        layer.zIndex = idx;
      });
      this.render();
      eventBus.emit("layer:changed", this.getLayersList());
      return true;
    }
    return false;
  }

  toggleLayerLock(id: number): boolean {
    const layer = this.getLayer(id);
    if (layer && layer.type !== "background") {
      layer.toggleLock();
      eventBus.emit("layer:changed", this.getLayersList());
      return true;
    }
    return false;
  }

  toggleLayerVisibility(id: number): boolean {
    const layer = this.getLayer(id);
    if (layer && layer.type !== "background") {
      layer.toggleVisibility();
      this.render();
      eventBus.emit("layer:changed", this.getLayersList());
      return true;
    }
    return false;
  }

  resizeAllLayers(width: number, height: number): void {
    this.layers.forEach((layer) => {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = layer.canvas.width;
      tempCanvas.height = layer.canvas.height;
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx) {
        tempCtx.drawImage(layer.canvas, 0, 0);
      }
      layer.setSize(width, height);
      layer.ctx.drawImage(tempCanvas, 0, 0);
    });
  }

  render(): void {
    this.mainCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
    const sortedLayers = [...this.layers].sort((a, b) => a.zIndex - b.zIndex);

    sortedLayers.forEach((layer) => {
      if (!layer.visible) return;

      this.mainCtx.save();
      this.mainCtx.globalAlpha = layer.opacity;

      if (layer.rotation !== 0 || layer.scaleX !== 1 || layer.scaleY !== 1) {
        const centerX = this.mainCanvas.width / 2;
        const centerY = this.mainCanvas.height / 2;
        this.mainCtx.translate(centerX, centerY);
        this.mainCtx.rotate((layer.rotation * Math.PI) / 180);
        this.mainCtx.scale(layer.scaleX, layer.scaleY);
        this.mainCtx.translate(-centerX, -centerY);
      }

      this.mainCtx.drawImage(layer.canvas, 0, 0);
      this.mainCtx.restore();
    });

    eventBus.emit("canvas:rendered");
  }

  getLayersList(): LayerItemDTO[] {
    return this.layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      type: layer.type,
      visible: layer.visible,
      locked: layer.locked,
      opacity: layer.opacity,
      isActive: layer.id === this.activeLayerId,
    }));
  }
}
