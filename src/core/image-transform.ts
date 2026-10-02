/**
 * Image Transform Module - TypeScript
 * Selection Box / Bounding Box tương tác cho image layer:
 * - Click để chọn (hit-test theo alpha của ảnh, tránh chọn vào vùng trong suốt)
 * - Kéo để di chuyển ảnh
 * - 8 handle resize (4 góc giữ tỉ lệ + 4 cạnh free resize, Shift = free)
 * - Handle xoay phía trên bounding box
 * - Vẽ Selection Overlay trực tiếp lên main canvas (không bị lưu vào layer,
 *   an toàn khi export/save)
 * - Phím tắt: Delete (xóa layer), Escape (bỏ chọn), Arrow keys (di chuyển 1px,
 *   Shift + Arrow = 10px)
 */

import { Layer, LayerManager } from "./layer";
import { eventBus } from "./event-bus";

export type ImageHandleId =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | "rotate";

interface InteractiveItem {
  layer: Layer;
  bounds: { x: number; y: number; width: number; height: number };
}

interface DragState {
  mode: "move" | "resize" | "rotate";
  handle: ImageHandleId | "move";
  startMouse: { x: number; y: number };
  start: {
    x: number;
    y: number;
    w: number;
    h: number;
    rotation: number;
    centerX: number;
    centerY: number;
    startAngle: number;
  };
}

const ROTATE_HANDLE_OFFSET = 26;
const MIN_SIZE = 8;

export class ImageTransform {
  canvas: HTMLCanvasElement;
  layerManager: LayerManager;
  selectedLayer: Layer | null = null;

  private drag: DragState | null = null;
  private lastShift = false;

  private boundPointerDown: (e: PointerEvent) => void;
  private boundPointerMove: (e: PointerEvent) => void;
  private boundPointerUp: (e: PointerEvent) => void;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private unsubscribers: Array<() => void> = [];

  constructor(canvas: HTMLCanvasElement, layerManager: LayerManager) {
    this.canvas = canvas;
    this.layerManager = layerManager;

    this.boundPointerDown = this.handlePointerDown.bind(this);
    this.boundPointerMove = this.handlePointerMove.bind(this);
    this.boundPointerUp = this.handlePointerUp.bind(this);
    this.boundKeyDown = this.handleKeyDown.bind(this);

    this.initEventListeners();
    this.initEventBus();

    (window as unknown as { imageTransform?: ImageTransform }).imageTransform =
      this;
  }

  // ─────────────────────────────────────────────
  // Init
  // ─────────────────────────────────────────────

  private initEventListeners(): void {
    this.canvas.addEventListener("pointerdown", this.boundPointerDown);
    window.addEventListener("pointermove", this.boundPointerMove);
    window.addEventListener("pointerup", this.boundPointerUp);
    window.addEventListener("pointercancel", this.boundPointerUp);
    document.addEventListener("keydown", this.boundKeyDown);
  }

  private initEventBus(): void {
    // Layer bị xóa → bỏ chọn; layer được thay mới (undo/redo) → trỏ lại tham chiếu
    const unsubChanged = eventBus.on("layer:changed", () => {
      if (this.selectedLayer) {
        const live = this.layerManager.layers.find(
          (l) => l.id === this.selectedLayer!.id
        );
        if (!live) {
          this.selectedLayer = null;
          this.layerManager.render();
        } else if (live !== this.selectedLayer) {
          this.selectedLayer = live;
        }
      }
    });

    const unsubResized = eventBus.on("canvas:resized", () => {
      if (this.selectedLayer) {
        this.layerManager.render();
        this.drawSelectionOverlay(this.selectedLayer);
      }
    });

    this.unsubscribers.push(unsubChanged, unsubResized);
  }

  destroy(): void {
    this.canvas.removeEventListener("pointerdown", this.boundPointerDown);
    window.removeEventListener("pointermove", this.boundPointerMove);
    window.removeEventListener("pointerup", this.boundPointerUp);
    window.removeEventListener("pointercancel", this.boundPointerUp);
    document.removeEventListener("keydown", this.boundKeyDown);
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
  }

  // ─────────────────────────────────────────────
  // Coordinates & Bounds
  // ─────────────────────────────────────────────

  private getMousePos(e: MouseEvent | PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  /**
   * Bounding box (AABB) của image layer, bao trùm cả phần ảnh đã xoay.
   */
  getImageLayerBounds(layer: Layer): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const w = Math.max(1, layer.imgWidth || 0);
    const h = Math.max(1, layer.imgHeight || 0);
    const angle = ((layer.imgRotation || 0) * Math.PI) / 180;
    const cx = layer.x + w / 2;
    const cy = layer.y + h / 2;

    if (!angle) {
      return { x: layer.x, y: layer.y, width: w, height: h };
    }

    const cos = Math.abs(Math.cos(angle));
    const sin = Math.abs(Math.sin(angle));
    const aabbW = w * cos + h * sin;
    const aabbH = w * sin + h * cos;
    return {
      x: cx - aabbW / 2,
      y: cy - aabbH / 2,
      width: aabbW,
      height: aabbH,
    };
  }

  /**
   * Vị trí các handle: tính trong hệ toạ độ ảnh chưa xoay rồi xoay quanh tâm.
   */
  private getHandlePoints(
    layer: Layer
  ): Record<ImageHandleId, { x: number; y: number }> {
    const w = Math.max(1, layer.imgWidth || 0);
    const h = Math.max(1, layer.imgHeight || 0);
    const cx = layer.x + w / 2;
    const cy = layer.y + h / 2;
    const hw = w / 2;
    const hh = h / 2;
    const angle = ((layer.imgRotation || 0) * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const local: Array<[ImageHandleId, number, number]> = [
      ["nw", -hw, -hh],
      ["n", 0, -hh],
      ["ne", hw, -hh],
      ["e", hw, 0],
      ["se", hw, hh],
      ["s", 0, hh],
      ["sw", -hw, hh],
      ["w", -hw, 0],
      ["rotate", 0, -hh - ROTATE_HANDLE_OFFSET],
    ];

    const out = {} as Record<ImageHandleId, { x: number; y: number }>;
    for (const [id, lx, ly] of local) {
      out[id] = {
        x: cx + lx * cos - ly * sin,
        y: cy + lx * sin + ly * cos,
      };
    }
    return out;
  }

  // ─────────────────────────────────────────────
  // Hit testing
  // ─────────────────────────────────────────────

  /**
   * Tìm image layer dưới con trỏ (xét theo zIndex từ trên xuống)
   */
  private findImageLayerAt(x: number, y: number): InteractiveItem | null {
    const layers = [...this.layerManager.layers]
      .filter((l) => l.type === "image" && l.visible && !l.locked)
      .sort((a, b) => b.zIndex - a.zIndex);

    for (const layer of layers) {
      const bounds = this.getImageLayerBounds(layer);
      if (
        x >= bounds.x &&
        x <= bounds.x + bounds.width &&
        y >= bounds.y &&
        y <= bounds.y + bounds.height
      ) {
        return { layer, bounds };
      }
    }
    return null;
  }

  /**
   * Kiểm tra điểm có nằm trên pixel đục (alpha > 8) của ảnh không.
   * Nếu không đọc được alpha (ảnh chưa load / CORS) thì coi như trúng.
   */
  private isPointOnImagePixels(layer: Layer, x: number, y: number): boolean {
    const img = layer.image;
    if (!img || !img.complete || !img.naturalWidth) return true;

    const w = Math.max(1, layer.imgWidth || 0);
    const h = Math.max(1, layer.imgHeight || 0);
    const angle = -((layer.imgRotation || 0) * Math.PI) / 180;
    const cx = layer.x + w / 2;
    const cy = layer.y + h / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = x - cx;
    const dy = y - cy;

    // Toạ độ trong hệ ảnh chưa xoay
    const localX = dx * cos - dy * sin + w / 2;
    const localY = dx * sin + dy * cos + h / 2;

    if (localX < 0 || localY < 0 || localX >= w || localY >= h) return false;

    // Đọc alpha trực tiếp từ layer canvas tại tọa độ thực trong canvas
    // (ảnh được vẽ tại layer.x, layer.y với kích thước imgWidth x imgHeight)
    const canvasX = Math.floor(layer.x + localX);
    const canvasY = Math.floor(layer.y + localY);
    try {
      const data = layer.ctx.getImageData(canvasX, canvasY, 1, 1).data;
      return data[3] > 8;
    } catch {
      return true; // CORS-tainted — bỏ qua alpha check
    }
  }

  private findHandleAt(x: number, y: number, layer: Layer): ImageHandleId | null {
    const handles = this.getHandlePoints(layer);
    const radius = 13;

    // Ưu tiên rotate handle nếu trùng
    const order: ImageHandleId[] = [
      "rotate",
      "nw",
      "ne",
      "se",
      "sw",
      "n",
      "e",
      "s",
      "w",
    ];
    for (const id of order) {
      const p = handles[id];
      if ((x - p.x) ** 2 + (y - p.y) ** 2 <= radius * radius) return id;
    }
    return null;
  }

  // ─────────────────────────────────────────────
  // Interaction
  // ─────────────────────────────────────────────

  private handlePointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    const pos = this.getMousePos(e);

    // 1. Handle của layer đang chọn?
    if (this.selectedLayer) {
      const handle = this.findHandleAt(pos.x, pos.y, this.selectedLayer);
      if (handle) {
        this.beginDrag(handle, pos);
        return;
      }
    }

    // 2. Click vào ảnh?
    const hit = this.findImageLayerAt(pos.x, pos.y);
    if (hit) {
      if (
        this.selectedLayer?.id === hit.layer.id ||
        this.isPointOnImagePixels(hit.layer, pos.x, pos.y)
      ) {
        this.selectLayer(hit.layer);
        this.beginDrag("move", pos);
        return;
      }
    }

    // 3. Click ra ngoài → bỏ chọn
    this.deselect();
  }

  private beginDrag(
    handle: ImageHandleId | "move",
    pos: { x: number; y: number }
  ): void {
    const layer = this.selectedLayer;
    if (!layer) return;

    const w = Math.max(1, layer.imgWidth || 0);
    const h = Math.max(1, layer.imgHeight || 0);
    const cx = layer.x + w / 2;
    const cy = layer.y + h / 2;
    const rot = layer.imgRotation || 0;

    this.drag = {
      mode: handle === "rotate" ? "rotate" : handle === "move" ? "move" : "resize",
      handle,
      startMouse: { x: pos.x, y: pos.y },
      start: {
        x: layer.x,
        y: layer.y,
        w,
        h,
        rotation: rot,
        centerX: cx,
        centerY: cy,
        startAngle: Math.atan2(pos.y - cy, pos.x - cx),
      },
    };

    this.canvas.style.cursor = this.cursorForHandle(handle);
  }

  private handlePointerMove(e: PointerEvent): void {
    const pos = this.getMousePos(e);

    // Đang kéo?
    if (this.drag && this.selectedLayer) {
      this.applyDrag(pos);
      return;
    }

    // Chỉ hover khi con trỏ nằm trong canvas
    const rect = this.canvas.getBoundingClientRect();
    const inside =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;

    if (inside) {
      this.canvas.style.cursor = this.computeHoverCursor(pos.x, pos.y);
    } else if (!this.drag) {
      this.canvas.style.cursor = "default";
    }
  }

  private computeHoverCursor(x: number, y: number): string {
    if (this.selectedLayer) {
      const handle = this.findHandleAt(x, y, this.selectedLayer);
      if (handle) return this.cursorForHandle(handle);
    }
    const hit = this.findImageLayerAt(x, y);
    if (hit && this.isPointOnImagePixels(hit.layer, x, y)) {
      return "move";
    }
    return "default";
  }

  private cursorForHandle(handle: ImageHandleId | "move"): string {
    switch (handle) {
      case "rotate":
        return "grab";
      case "n":
      case "s":
        return "ns-resize";
      case "e":
      case "w":
        return "ew-resize";
      case "nw":
      case "se":
        return "nwse-resize";
      case "ne":
      case "sw":
        return "nesw-resize";
      default:
        return "move";
    }
  }

  private applyDrag(pos: { x: number; y: number }): void {
    const layer = this.selectedLayer!;
    const drag = this.drag!;
    const start = drag.start;

    if (drag.mode === "move") {
      const dx = pos.x - drag.startMouse.x;
      const dy = pos.y - drag.startMouse.y;
      layer.x = Math.round(start.x + dx);
      layer.y = Math.round(start.y + dy);
      layer.imgRotation = start.rotation;
    } else if (drag.mode === "resize") {
      this.applyResize(pos);
    } else {
      // Rotate quanh tâm ảnh
      const angle =
        Math.atan2(pos.y - start.centerY, pos.x - start.centerX) -
        start.startAngle;
      let deg = start.rotation + (angle * 180) / Math.PI;
      while (deg > 180) deg -= 360;
      while (deg < -180) deg += 360;
      // Giữ 0° khi gần thẳng (dễ canh chỉnh)
      if (Math.abs(deg) < 2) deg = 0;
      layer.imgRotation = Math.round(deg * 10) / 10;
    }

    this.syncAfterTransform(layer);
  }

  private applyResize(pos: { x: number; y: number }): void {
    const layer = this.selectedLayer!;
    const drag = this.drag!;
    const handle = drag.handle as ImageHandleId; // mode === "resize"
    const start = drag.start;
    const dx = pos.x - drag.startMouse.x;
    const dy = pos.y - drag.startMouse.y;

    // Xoay delta mouse về hệ toạ độ ảnh (chưa xoay)
    const angle = -((start.rotation * Math.PI) / 180);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const ldx = dx * cos - dy * sin;
    const ldy = dx * sin + dy * cos;

    let left = -start.w / 2;
    let top = -start.h / 2;
    let right = start.w / 2;
    let bottom = start.h / 2;

    const corner = handle.length === 2;

    if (handle.includes("w")) left += ldx;
    if (handle.includes("e")) right += ldx;
    if (handle.includes("n")) top += ldy;
    if (handle.includes("s")) bottom += ldy;

    let newW = right - left;
    let newH = bottom - top;

    // Corner: giữ tỉ lệ khung hình (Shift = free resize)
    if (corner && !this.lastShift) {
      const ratio = start.w / start.h;
      if (newW / ratio > newH) {
        newH = newW / ratio;
      } else {
        newW = newH * ratio;
      }
    }

    newW = Math.max(MIN_SIZE, newW);
    newH = Math.max(MIN_SIZE, newH);

    // Cạnh đối diện giữ nguyên → tính tâm mới trong hệ ảnh rồi xoay ra ngoài
    const shiftX = (left + right) / 2;
    const shiftY = (top + bottom) / 2;
    const cosF = Math.cos((start.rotation * Math.PI) / 180);
    const sinF = Math.sin((start.rotation * Math.PI) / 180);
    const newCx = start.centerX + shiftX * cosF - shiftY * sinF;
    const newCy = start.centerY + shiftX * sinF + shiftY * cosF;

    layer.imgWidth = Math.round(newW);
    layer.imgHeight = Math.round(newH);
    layer.imgRotation = start.rotation;
    layer.x = Math.round(newCx - layer.imgWidth / 2);
    layer.y = Math.round(newCy - layer.imgHeight / 2);
  }

  private handlePointerUp(e: PointerEvent): void {
    void e;
    if (this.drag) {
      this.drag = null;
      this.canvas.style.cursor = "default";
      if (this.selectedLayer) {
        eventBus.emit("image:transformed", { layer: this.selectedLayer });
        // Cho phép undo/redo ghi nhận thay đổi sau khi kết thúc thao tác kéo
        eventBus.emit("layer:changed", this.layerManager.getLayersList());
      }
    }
  }

  private syncAfterTransform(layer: Layer): void {
    this.layerManager.redrawImageLayer(layer);
    this.layerManager.render();
    this.drawSelectionOverlay(layer);
  }

  // ─────────────────────────────────────────────
  // Selection & Overlay
  // ─────────────────────────────────────────────

  selectLayer(layer: Layer): void {
    this.selectedLayer = layer;
    this.layerManager.setActiveLayer(layer.id);
    eventBus.emit("image:selected", layer);
    this.layerManager.render();
    this.drawSelectionOverlay(layer);
  }

  deselect(): void {
    if (this.selectedLayer) {
      this.selectedLayer = null;
      this.layerManager.render();
      eventBus.emit("image:deselected");
    }
  }

  /**
   * Vẽ Selection Box / Bounding Box + handles lên main canvas.
   * Gọi sau mỗi lần render nên không bị lưu vào layer canvas (an toàn export).
   */
  drawSelectionOverlay(layer: Layer | null): void {
    if (!layer || layer.type !== "image") return;

    const bounds = this.getImageLayerBounds(layer);
    const ctx = this.layerManager.mainCtx;
    const handles = this.getHandlePoints(layer);
    const isSelected = this.selectedLayer?.id === layer.id;

    ctx.save();

    // 1. Bounding box
    ctx.strokeStyle = "#00f260";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.setLineDash([]);

    if (isSelected) {
      // 2. 8 resize handles (ô vuông trắng viền xanh)
      const drawSquareHandle = (p: { x: number; y: number }) => {
        const s = 8;
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#00f260";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.rect(p.x - s / 2, p.y - s / 2, s, s);
        ctx.fill();
        ctx.stroke();
      };

      (
        ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as ImageHandleId[]
      ).forEach((id) => drawSquareHandle(handles[id]));

      // 3. Rotate handle: đường nối + vòng tròn
      const rotateP = handles["rotate"];
      const topP = handles["n"];
      ctx.strokeStyle = "#00f260";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(topP.x, topP.y);
      ctx.lineTo(rotateP.x, rotateP.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(rotateP.x, rotateP.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#00f260";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 4. Nhãn kích thước (W × H · rotation)
    const label = `${Math.round(layer.imgWidth)} × ${Math.round(layer.imgHeight)}${
      layer.imgRotation ? ` · ${Math.round(layer.imgRotation)}°` : ""
    }`;
    ctx.font = "11px sans-serif";
    const labelW = ctx.measureText(label).width + 10;
    const labelX = bounds.x + bounds.width / 2 - labelW / 2;
    const labelY = bounds.y + bounds.height + 6;
    const r = 3;
    const lh = 16;

    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.beginPath();
    ctx.moveTo(labelX + r, labelY);
    ctx.lineTo(labelX + labelW - r, labelY);
    ctx.arcTo(labelX + labelW, labelY, labelX + labelW, labelY + r, r);
    ctx.lineTo(labelX + labelW, labelY + lh - r);
    ctx.arcTo(labelX + labelW, labelY + lh, labelX + labelW - r, labelY + lh, r);
    ctx.lineTo(labelX + r, labelY + lh);
    ctx.arcTo(labelX, labelY + lh, labelX, labelY + lh - r, r);
    ctx.lineTo(labelX, labelY + r);
    ctx.arcTo(labelX, labelY, labelX + r, labelY, r);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#00f260";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, bounds.x + bounds.width / 2, labelY + lh / 2);

    ctx.restore();
  }

  // ─────────────────────────────────────────────
  // Keyboard
  // ─────────────────────────────────────────────

  private handleKeyDown(e: KeyboardEvent): void {
    this.lastShift = e.shiftKey;

    if (!this.selectedLayer || this.selectedLayer.type !== "image") return;

    const active = document.activeElement;
    const tag = active ? active.tagName : "";
    if (
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      (active && (active as HTMLElement).isContentEditable)
    ) {
      return;
    }

    const layer = this.selectedLayer;

    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      const id = layer.id;
      if (id !== 0) {
        this.selectedLayer = null;
        this.layerManager.deleteLayer(id);
        this.layerManager.render();
      }
      return;
    }

    if (e.key === "Escape") {
      this.deselect();
      return;
    }

    const step = e.shiftKey ? 10 : 1;
    let handled = true;
    switch (e.key) {
      case "ArrowLeft":
        layer.x -= step;
        break;
      case "ArrowRight":
        layer.x += step;
        break;
      case "ArrowUp":
        layer.y -= step;
        break;
      case "ArrowDown":
        layer.y += step;
        break;
      default:
        handled = false;
    }

    if (handled) {
      e.preventDefault();
      this.syncAfterTransform(layer);
      eventBus.emit("image:transformed", { layer });
    }
  }
}
