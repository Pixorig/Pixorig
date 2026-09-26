/**
 * Topbar Actions & History Stack Module - TSX Real DOM
 * Cung cấp:
 * - Snapshot-based Undo / Redo history stack cho layers
 * - More menu dropdown:
 *   + View (Fullscreen / Fit view)
 *   + Open Project (.trp): Đọc file JSON và rehydrate layers vào LayerManager
 *   + Save as Project (.trp): Serialize layers, text data, canvas size và tải file .trp
 *   + Shortcuts popup: Bảng phím tắt
 *   + About popup: Thông tin ứng dụng, phiên bản, giấy phép
 * - Settings popup: Cấu hình kích thước canvas, màu nền, giao diện (theme), ngôn ngữ
 */

import { h } from "../ui/jsx";
import { showPopup, showDropdown } from "../ui/Popup";
import { LayerManager, Layer, LayerType, TextDecoration } from "./layer";
import { eventBus } from "./event-bus";

export interface SerializedLayerData {
  id: number;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number;
  zIndex: number;
  dataUrl?: string; // Raster content snapshot
  // Text layer specific properties
  text?: string | null;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textDecoration?: TextDecoration;
  underline?: boolean;
  fontColor?: string;
  textAlign?: CanvasTextAlign;
  textJustify?: boolean;
  paddingLeft?: number;
  paddingRight?: number;
  x?: number;
  y?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  curveBend?: number;
}

export interface ProjectData {
  version: string;
  name: string;
  width: number;
  height: number;
  activeLayerId: number;
  layers: SerializedLayerData[];
  savedAt: string;
}

export interface HistorySnapshot {
  width: number;
  height: number;
  activeLayerId: number;
  layers: SerializedLayerData[];
}

export class BarActions {
  private layerManager: LayerManager;
  private undoStack: HistorySnapshot[] = [];
  private redoStack: HistorySnapshot[] = [];
  private isApplyingHistory = false;
  private maxHistorySize = 30;

  constructor(layerManager: LayerManager) {
    this.layerManager = layerManager;
    this.initHistoryTracker();
  }

  setLayerManager(lm: LayerManager): void {
    this.layerManager = lm;
  }

  // ─────────────────────────────────────────────────────────────
  // 1. History Stack (Undo / Redo)
  // ─────────────────────────────────────────────────────────────

  private initHistoryTracker(): void {
    // Tự động lưu snapshot khởi đầu
    setTimeout(() => {
      this.pushSnapshot();
    }, 100);

    // Lắng nghe các thay đổi từ eventBus để ghi nhận snapshot
    eventBus.on("layer:changed", () => {
      if (!this.isApplyingHistory) {
        this.pushSnapshot();
      }
    });

    eventBus.on("canvas:resized", () => {
      if (!this.isApplyingHistory) {
        this.pushSnapshot();
      }
    });

    eventBus.on("background:changed", () => {
      if (!this.isApplyingHistory) {
        this.pushSnapshot();
      }
    });
  }

  private serializeCurrentState(): HistorySnapshot {
    const canvas = this.layerManager.mainCanvas;
    const layers: SerializedLayerData[] = this.layerManager.layers.map((layer) => {
      return {
        id: layer.id,
        name: layer.name,
        type: layer.type,
        visible: layer.visible,
        locked: layer.locked,
        opacity: layer.opacity,
        zIndex: layer.zIndex,
        dataUrl: layer.canvas.toDataURL("image/png"),
        text: layer.text,
        fontSize: layer.fontSize,
        fontFamily: layer.fontFamily,
        fontWeight: layer.fontWeight,
        fontStyle: layer.fontStyle,
        textDecoration: layer.textDecoration,
        underline: layer.underline,
        fontColor: layer.fontColor,
        textAlign: layer.textAlign,
        textJustify: layer.textJustify,
        paddingLeft: layer.paddingLeft,
        paddingRight: layer.paddingRight,
        x: layer.x,
        y: layer.y,
        rotation: layer.rotation,
        scaleX: layer.scaleX,
        scaleY: layer.scaleY,
        curveBend: layer.curveBend,
      };
    });

    return {
      width: canvas.width,
      height: canvas.height,
      activeLayerId: this.layerManager.activeLayerId,
      layers,
    };
  }

  public pushSnapshot(): void {
    if (this.isApplyingHistory) return;
    const snapshot = this.serializeCurrentState();

    // Kiểm tra trùng lặp với snapshot trên cùng
    if (this.undoStack.length > 0) {
      const top = this.undoStack[this.undoStack.length - 1];
      if (
        top.layers.length === snapshot.layers.length &&
        top.width === snapshot.width &&
        top.height === snapshot.height &&
        JSON.stringify(top.layers.map((l) => l.id)) ===
          JSON.stringify(snapshot.layers.map((l) => l.id))
      ) {
        // Có thể cùng số lượng, kiểm tra sơ lược
      }
    }

    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
    // Khi có hành động mới thì xóa redo stack
    this.redoStack = [];
    eventBus.emit("history:changed", {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    });
  }

  public canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public undo(): void {
    if (!this.canUndo()) return;
    const current = this.undoStack.pop()!;
    this.redoStack.push(current);

    const previous = this.undoStack[this.undoStack.length - 1];
    if (previous) {
      this.applySnapshot(previous);
    }
    eventBus.emit("history:changed", {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    });
  }

  public redo(): void {
    if (!this.canRedo()) return;
    const next = this.redoStack.pop()!;
    this.undoStack.push(next);
    this.applySnapshot(next);

    eventBus.emit("history:changed", {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    });
  }

  private async applySnapshot(snapshot: HistorySnapshot): Promise<void> {
    this.isApplyingHistory = true;
    try {
      const canvas = this.layerManager.mainCanvas;
      canvas.width = snapshot.width;
      canvas.height = snapshot.height;

      // Xóa các layers hiện tại
      this.layerManager.layers = [];

      // Phục hồi từng layer
      for (const sLayer of snapshot.layers) {
        const layer = new Layer(sLayer.id, sLayer.name, sLayer.type);
        layer.setSize(snapshot.width, snapshot.height);
        layer.visible = sLayer.visible;
        layer.locked = sLayer.locked;
        layer.opacity = sLayer.opacity;
        layer.zIndex = sLayer.zIndex;

        // Text properties
        if (sLayer.text !== undefined) layer.text = sLayer.text;
        if (sLayer.fontSize !== undefined) layer.fontSize = sLayer.fontSize;
        if (sLayer.fontFamily !== undefined) layer.fontFamily = sLayer.fontFamily;
        if (sLayer.fontWeight !== undefined) layer.fontWeight = sLayer.fontWeight;
        if (sLayer.fontStyle !== undefined) layer.fontStyle = sLayer.fontStyle;
        if (sLayer.textDecoration !== undefined)
          layer.textDecoration = sLayer.textDecoration;
        if (sLayer.underline !== undefined) layer.underline = sLayer.underline;
        if (sLayer.fontColor !== undefined) layer.fontColor = sLayer.fontColor;
        if (sLayer.textAlign !== undefined) layer.textAlign = sLayer.textAlign;
        if (sLayer.textJustify !== undefined) layer.textJustify = sLayer.textJustify;
        if (sLayer.paddingLeft !== undefined) layer.paddingLeft = sLayer.paddingLeft;
        if (sLayer.paddingRight !== undefined) layer.paddingRight = sLayer.paddingRight;
        if (sLayer.x !== undefined) layer.x = sLayer.x;
        if (sLayer.y !== undefined) layer.y = sLayer.y;
        if (sLayer.rotation !== undefined) layer.rotation = sLayer.rotation;
        if (sLayer.scaleX !== undefined) layer.scaleX = sLayer.scaleX;
        if (sLayer.scaleY !== undefined) layer.scaleY = sLayer.scaleY;
        if (sLayer.curveBend !== undefined) layer.curveBend = sLayer.curveBend;

        // Vẽ lại raster data nếu có
        if (sLayer.dataUrl) {
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
              layer.ctx.drawImage(img, 0, 0);
              if (layer.type === "background") {
                layer.image = img;
              }
              resolve();
            };
            img.onerror = () => resolve();
            img.src = sLayer.dataUrl!;
          });
        }

        this.layerManager.layers.push(layer);
      }

      this.layerManager.activeLayerId = snapshot.activeLayerId;
      this.layerManager.render();
      eventBus.emit("layer:changed", this.layerManager.getLayersList());
    } finally {
      this.isApplyingHistory = false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Project Serialization (.trp format)
  // ─────────────────────────────────────────────────────────────

  public saveProject(): void {
    const snapshot = this.serializeCurrentState();
    const project: ProjectData = {
      version: "1.0.0",
      name: "Pixorig Project",
      width: snapshot.width,
      height: snapshot.height,
      activeLayerId: snapshot.activeLayerId,
      layers: snapshot.layers,
      savedAt: new Date().toISOString(),
    };

    const jsonStr = JSON.stringify(project, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `project-${Date.now()}.trp`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public openProject(file?: File): void {
    const readAndLoad = (f: File) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const project: ProjectData = JSON.parse(content);
          if (!project.layers || !Array.isArray(project.layers)) {
            throw new Error("Invalid .trp project file structure");
          }

          await this.applySnapshot({
            width: project.width || 1200,
            height: project.height || 600,
            activeLayerId: project.activeLayerId || 0,
            layers: project.layers,
          });

          // Thêm snapshot mới vào undo stack
          this.pushSnapshot();
        } catch (err: any) {
          alert("Error opening project file: " + (err?.message || String(err)));
        }
      };
      reader.readAsText(f);
    };

    if (file) {
      readAndLoad(file);
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".trp,application/json";
    input.style.display = "none";
    input.addEventListener("change", () => {
      const selected = input.files?.[0];
      if (selected) {
        readAndLoad(selected);
      }
    });
    document.body.appendChild(input);
    input.click();
    setTimeout(() => {
      document.body.removeChild(input);
    }, 1000);
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Topbar More Menu & Dialogs
  // ─────────────────────────────────────────────────────────────

  public openMoreMenu(triggerEl: HTMLElement): void {
    showDropdown(triggerEl, {
      items: [
        {
          label: "View Options",
          action: "more-view",
          icon: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>',
        },
        {
          label: "Open Project (.trp)",
          action: "more-open",
          icon: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>',
        },
        {
          label: "Save as Project (.trp)",
          action: "more-save-project",
          icon: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>',
        },
        {
          label: "Shortcuts",
          action: "more-shortcuts",
          icon: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM9 8h2v8H9zm4 0h2v8h-2z"/></svg>',
        },
        {
          label: "GitHub",
          action: "more-github",
          icon: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 2C6.475 2 2 6.475 2 12c0 4.425 2.875 8.175 6.85 9.5.5.075.675-.2.675-.475v-1.7c-2.75.6-3.325-1.3-3.325-1.3-.45-1.125-1.1-1.425-1.1-1.425-.9-.6.075-.6.075-.6 1 .075 1.525 1.025 1.525 1.025.9 1.525 2.35 1.075 2.925.825.075-.65.35-1.075.625-1.325-2.2-.25-4.5-1.1-4.5-4.9 0-1.075.375-1.95 1.025-2.625-.1-.25-.45-1.275.1-2.65 0 0 .825-.275 2.7 1.025.8-.225 1.65-.325 2.5-.325s1.7.1 2.5.325c1.875-1.3 2.7-1.025 2.7-1.025.55 1.375.2 2.4.1 2.65.65.675 1.025 1.55 1.025 2.625 0 3.8-2.3 4.65-4.5 4.9.35.3.675.925.675 1.85v2.725c0 .275.175.55.675.475C19.125 20.175 22 16.425 22 12c0-5.525-4.475-10-10-10"/></svg>',
        },
        {
          label: "About",
          action: "more-about",
          icon: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
        },
      ],
      onItemClick: (item) => {
        if (item.action === "more-view") {
          this.openViewModal();
        } else if (item.action === "more-open") {
          this.openProject();
        } else if (item.action === "more-save-project") {
          this.saveProject();
        } else if (item.action === "more-shortcuts") {
          this.openShortcutsModal();
        } else if (item.action === "more-github") {
          window.open("https://github.com/Pixorig/Pixorig", "_blank");
        } else if (item.action === "more-about") {
          this.openAboutModal();
        }
      },
    });
  }

  public openViewModal(): void {
    const fullscreenBtn = (
      <button
        type="button"
        style={{
          padding: "10px 16px",
          background: "#1e1e1e",
          border: "1px solid #555",
          borderRadius: "6px",
          color: "#fff",
          cursor: "pointer",
          fontSize: "13px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path
            fill="currentColor"
            d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"
          />
        </svg>
        <span>Toggle Fullscreen</span>
      </button>
    ) as HTMLElement;

    const fitViewBtn = (
      <button
        type="button"
        style={{
          padding: "10px 16px",
          background: "#1e1e1e",
          border: "1px solid #555",
          borderRadius: "6px",
          color: "#fff",
          cursor: "pointer",
          fontSize: "13px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path
            fill="currentColor"
            d="M15 3l2.3 2.3-2.89 2.87 1.42 1.42L18.7 6.7 21 9V3h-6zM3 9l2.3-2.3 2.87 2.89 1.42-1.42L6.7 5.3 9 3H3v6zm6 12l-2.3-2.3 2.89-2.87-1.42-1.42L5.3 17.3 3 15v6h6zm12-6l-2.3 2.3-2.87-2.89-1.42 1.42 2.89 2.87L15 21h6v-6z"
          />
        </svg>
        <span>Fit Canvas to Viewport</span>
      </button>
    ) as HTMLElement;

    fullscreenBtn.addEventListener("click", () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    fitViewBtn.addEventListener("click", () => {
      const canvasArea = document.getElementById("canvas-area");
      const canvas = this.layerManager.mainCanvas;
      if (canvasArea && canvas) {
        const padding = 40;
        const availW = canvasArea.clientWidth - padding;
        const availH = canvasArea.clientHeight - padding;
        const scale = Math.min(availW / canvas.width, availH / canvas.height, 1);
        canvas.style.transform = `scale(${scale})`;
        canvas.style.transformOrigin = "center center";
      }
    });

    const content = (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <p style={{ color: "#aaa", fontSize: "13px", margin: "0 0 4px" }}>
          Choose a viewport layout option:
        </p>
        {fullscreenBtn}
        {fitViewBtn}
      </div>
    ) as HTMLElement;

    showPopup({
      title: "View Options",
      width: "360px",
      content,
    });
  }

  public openShortcutsModal(): void {
    const shortcuts = [
      { key: "Ctrl + Z", desc: "Undo action" },
      { key: "Ctrl + Y / Ctrl + Shift + Z", desc: "Redo action" },
      { key: "Delete / Backspace", desc: "Delete active layer" },
      { key: "Ctrl + S", desc: "Save project (.trp)" },
      { key: "Ctrl + O", desc: "Open project (.trp)" },
      { key: "Escape", desc: "Deselect layer / Close modal" },
      { key: "Arrow keys", desc: "Nudge active layer 1px" },
      { key: "Shift + Arrow keys", desc: "Nudge active layer 10px" },
    ];

    const rows = shortcuts.map((s) => (
      <tr style={{ borderBottom: "1px solid #333" }}>
        <td
          style={{
            padding: "8px 10px",
            fontFamily: "monospace",
            color: "#4da6ff",
            fontSize: "13px",
            whiteSpace: "nowrap",
          }}
        >
          {s.key}
        </td>
        <td style={{ padding: "8px 10px", color: "#ccc", fontSize: "13px" }}>
          {s.desc}
        </td>
      </tr>
    ));

    const content = (
      <div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #444", textAlign: "left" }}>
              <th style={{ padding: "8px 10px", color: "#888", fontSize: "12px" }}>
                Shortcut
              </th>
              <th style={{ padding: "8px 10px", color: "#888", fontSize: "12px" }}>
                Description
              </th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    ) as HTMLElement;

    showPopup({
      title: "Keyboard Shortcuts",
      width: "480px",
      content,
    });
  }

  public openAboutModal(): void {
    const content = (
      <div style={{ textAlign: "center", padding: "12px 0" }}>
        <h2 style={{ fontSize: "22px", margin: "0 0 6px", color: "#fff" }}>
          Pixorig
        </h2>
        <p style={{ color: "#aaa", margin: "0 0 16px", fontSize: "13px" }}>
          Modern Browser-based Image & Typography Editor
        </p>
        <p
          style={{
            color: "#ccc",
            fontSize: "13px",
            lineHeight: "1.6",
            margin: "0 0 16px",
            textAlign: "left",
          }}
        >
          Pixorig is designed to deliver fast, local-first image and typography
          manipulation with stacked canvas layers, real DOM rendering, and WASM
          filters.
        </p>
        <div
          style={{
            background: "#181818",
            borderRadius: "6px",
            padding: "12px",
            textAlign: "left",
            fontSize: "12px",
            color: "#999",
            marginBottom: "16px",
          }}
        >
          <p style={{ margin: "0 0 6px" }}>
            <strong>Version:</strong> 2.0.0 (TypeScript / TSX Native)
          </p>
          <p style={{ margin: "0 0 6px" }}>
            <strong>License:</strong> Apache License Version 2.0
          </p>
          <p style={{ margin: "0" }}>
            <strong>Developer:</strong> Sao Tin Developers
          </p>
        </div>
        <p style={{ color: "#888", fontSize: "13px", margin: "0" }}>
          Have fun creating with Pixorig! :)
        </p>
      </div>
    ) as HTMLElement;

    showPopup({
      title: "About Pixorig",
      width: "420px",
      content,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Settings Popup
  // ─────────────────────────────────────────────────────────────

  public openSettingsModal(): void {
    const canvas = this.layerManager.mainCanvas;
    const currentW = canvas.width;
    const currentH = canvas.height;

    const widthInput = (
      <input
        type="number"
        value={String(currentW)}
        min="1"
        style={{
          flex: "1",
          background: "#1e1e1e",
          border: "1px solid #555",
          borderRadius: "4px",
          padding: "6px 8px",
          color: "#e0e0e0",
          fontSize: "13px",
        }}
      />
    ) as HTMLInputElement;

    const heightInput = (
      <input
        type="number"
        value={String(currentH)}
        min="1"
        style={{
          flex: "1",
          background: "#1e1e1e",
          border: "1px solid #555",
          borderRadius: "4px",
          padding: "6px 8px",
          color: "#e0e0e0",
          fontSize: "13px",
        }}
      />
    ) as HTMLInputElement;

    const bgColorInput = (
      <input
        type="color"
        value="#1e1e1e"
        style={{
          width: "100%",
          height: "36px",
          background: "#1e1e1e",
          border: "1px solid #555",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      />
    ) as HTMLInputElement;

    const themeSelect = (
      <select
        style={{
          width: "100%",
          background: "#1e1e1e",
          border: "1px solid #555",
          borderRadius: "4px",
          padding: "6px 8px",
          color: "#e0e0e0",
          fontSize: "13px",
        }}
      >
        <option value="dark">Dark (default)</option>
        <option value="light">Light</option>
      </select>
    ) as HTMLSelectElement;

    const langSelect = (
      <select
        style={{
          width: "100%",
          background: "#1e1e1e",
          border: "1px solid #555",
          borderRadius: "4px",
          padding: "6px 8px",
          color: "#e0e0e0",
          fontSize: "13px",
        }}
      >
        <option value="en">English</option>
        <option value="vi">Tiếng Việt</option>
      </select>
    ) as HTMLSelectElement;

    const saveBtn = (
      <button
        type="button"
        style={{
          padding: "8px 16px",
          background: "#094771",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: "600",
          alignSelf: "flex-end",
        }}
      >
        Save Settings
      </button>
    ) as HTMLButtonElement;

    const content = (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label
            style={{
              color: "#ccc",
              fontSize: "13px",
              display: "block",
              marginBottom: "4px",
            }}
          >
            Canvas Size
          </label>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {widthInput}
            <span style={{ color: "#777" }}>×</span>
            {heightInput}
          </div>
        </div>

        <div>
          <label
            style={{
              color: "#ccc",
              fontSize: "13px",
              display: "block",
              marginBottom: "4px",
            }}
          >
            Canvas Background Color
          </label>
          {bgColorInput}
        </div>

        <div>
          <label
            style={{
              color: "#ccc",
              fontSize: "13px",
              display: "block",
              marginBottom: "4px",
            }}
          >
            Theme
          </label>
          {themeSelect}
        </div>

        <div>
          <label
            style={{
              color: "#ccc",
              fontSize: "13px",
              display: "block",
              marginBottom: "4px",
            }}
          >
            Language
          </label>
          {langSelect}
        </div>

        {saveBtn}
      </div>
    ) as HTMLElement;

    const popup = showPopup({
      title: "Settings",
      width: "440px",
      content,
    });

    saveBtn.addEventListener("click", () => {
      const newW = parseInt(widthInput.value, 10);
      const newH = parseInt(heightInput.value, 10);
      if (newW > 0 && newH > 0 && (newW !== currentW || newH !== currentH)) {
        canvas.width = newW;
        canvas.height = newH;
        this.layerManager.resizeAllLayers(newW, newH);
        this.layerManager.render();
        eventBus.emit("canvas:resized", { width: newW, height: newH });
      }

      // Đổi theme
      if (themeSelect.value === "light") {
        document.body.classList.add("theme-light");
      } else {
        document.body.classList.remove("theme-light");
      }

      popup.close();
    });
  }
}
