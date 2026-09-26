/**
 * Color Module - TypeScript + TSX
 * Manages solid (Monochrome) and Gradient colors for Background & Text Layers
 */

import { h } from "../ui/jsx";
import { eventBus } from "../core/event-bus";
import { Layer, LayerManager } from "../core/layer";
import { TabBar } from "../ui/TabBar";

export interface ColorSwatchItem {
  name: string;
  hex: string;
}

export interface PresetGradientItem {
  name: string;
  colors: string[];
  isCustom?: boolean;
  data?: any;
}

export interface GradientFillPreset {
  kind: "preset";
  colors: string[];
  angleDeg: number;
}

export interface GradientFillCustom {
  kind: "custom";
  data: any;
}

export interface SolidFill {
  kind: "solid";
  hex: string;
}

export type BackgroundFill = SolidFill | GradientFillPreset | GradientFillCustom;

export interface ColorModuleOptions {
  layerManager?: LayerManager;
  canvas?: HTMLCanvasElement | null;
  targetLayer?: Layer | null;
  onColorChange?: (color: string | BackgroundFill) => void;
  onClose?: () => void;
}

const MONOCHROME_COLORS: ColorSwatchItem[] = [
  { name: "White", hex: "#ffffff" },
  { name: "Light Gray", hex: "#d9d9d9" },
  { name: "Gray", hex: "#808080" },
  { name: "Dark Gray", hex: "#404040" },
  { name: "Black", hex: "#000000" },
  { name: "Red", hex: "#ff0000" },
  { name: "Dark Red", hex: "#8b0000" },
  { name: "Maroon", hex: "#800000" },
  { name: "Orange", hex: "#ffa500" },
  { name: "Dark Orange", hex: "#cc5500" },
  { name: "Yellow", hex: "#ffff00" },
  { name: "Olive", hex: "#808000" },
  { name: "Lime", hex: "#00ff00" },
  { name: "Green", hex: "#008000" },
  { name: "Dark Green", hex: "#006400" },
  { name: "Cyan", hex: "#00ffff" },
  { name: "Teal", hex: "#008080" },
  { name: "Blue", hex: "#0000ff" },
  { name: "Navy", hex: "#000080" },
  { name: "Indigo", hex: "#4b0082" },
  { name: "Purple", hex: "#800080" },
  { name: "Magenta", hex: "#ff00ff" },
  { name: "Pink", hex: "#ffc0cb" },
  { name: "Brown", hex: "#a52a2a" },
];

const BUILT_IN_PRESETS: PresetGradientItem[] = [
  { name: "Sunset", colors: ["#ff7e5f", "#feb47b"] },
  { name: "Ocean", colors: ["#2193b0", "#6dd5ed"] },
  { name: "Forest", colors: ["#134e5e", "#71b280"] },
  { name: "Lavender", colors: ["#c471ed", "#f7797d"] },
  { name: "Peach", colors: ["#f093fb", "#f5576c"] },
  { name: "Midnight", colors: ["#0f0c29", "#302b63", "#24243e"] },
  { name: "Neon", colors: ["#00f260", "#0575e6"] },
  { name: "Golden", colors: ["#f7971e", "#ffd200"] },
  { name: "Grayscale", colors: ["#bdc3c7", "#2c3e50"] },
  {
    name: "Rainbow",
    colors: [
      "#ff0000",
      "#ffff00",
      "#00ff00",
      "#00ffff",
      "#0000ff",
      "#ff00ff",
    ],
  },
  { name: "Fire", colors: ["#ff4b1f", "#ff9068"] },
  { name: "Ice", colors: ["#00b4db", "#0083b0"] },
  { name: "Mint", colors: ["#11998e", "#38ef7d"] },
  { name: "Twilight", colors: ["#a8edea", "#fed6e3"] },
  { name: "Coral", colors: ["#fc5c7d", "#6a82fb"] },
];

class ColorService {
  private customPresets: PresetGradientItem[] = [];
  private currentTab: "monochrome" | "gradient" = "monochrome";
  private isOpen = false;
  private savedHTML = "";
  lastBackground: BackgroundFill | null = null;
  private currentContainer: HTMLElement | null = null;
  private currentOptions: ColorModuleOptions = {};

  constructor() {
    this.loadCustomGradients();
  }

  private loadCustomGradients(): void {
    try {
      const saved = localStorage.getItem("pixorig_custom_gradients");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) this.customPresets = parsed;
      }
    } catch {
      // ignore
    }
  }

  private saveCustomGradients(): void {
    try {
      localStorage.setItem(
        "pixorig_custom_gradients",
        JSON.stringify(this.customPresets)
      );
    } catch {
      // ignore
    }
  }

  getAllPresets(): PresetGradientItem[] {
    return [...this.customPresets, ...BUILT_IN_PRESETS];
  }

  getGradientEndpointsForCssAngle(
    angleDeg: number,
    W: number,
    H: number
  ): { x1: number; y1: number; x2: number; y2: number } {
    const theta = (angleDeg * Math.PI) / 180;
    const dx = Math.sin(theta);
    const dy = -Math.cos(theta);
    const cx = W / 2;
    const cy = H / 2;

    const points: Array<{ x: number; y: number; t: number }> = [];
    const pushIfValid = (x: number, y: number, t: number) => {
      if (x >= 0 && x <= W && y >= 0 && y <= H) {
        points.push({ x, y, t });
      }
    };

    if (dx !== 0) {
      const t0 = (0 - cx) / dx;
      pushIfValid(0, cy + t0 * dy, t0);
      const tW = (W - cx) / dx;
      pushIfValid(W, cy + tW * dy, tW);
    }

    if (dy !== 0) {
      const t0 = (0 - cy) / dy;
      pushIfValid(cx + t0 * dx, 0, t0);
      const tH = (H - cy) / dy;
      pushIfValid(cx + tH * dx, H, tH);
    }

    if (points.length < 2) {
      return { x1: 0, y1: 0, x2: W, y2: H };
    }

    points.sort((a, b) => a.t - b.t);
    const p1 = points[0];
    const p2 = points[points.length - 1];
    return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
  }

  renderBackgroundFill(
    bgCtx: CanvasRenderingContext2D,
    W: number,
    H: number,
    fill: BackgroundFill
  ): void {
    if (!fill) return;

    bgCtx.clearRect(0, 0, W, H);

    if (fill.kind === "solid") {
      bgCtx.fillStyle = fill.hex;
      bgCtx.fillRect(0, 0, W, H);
      return;
    }

    if (fill.kind === "preset") {
      const { x1, y1, x2, y2 } = this.getGradientEndpointsForCssAngle(
        fill.angleDeg,
        W,
        H
      );
      const gradient = bgCtx.createLinearGradient(x1, y1, x2, y2);
      const step = 1 / (fill.colors.length - 1);
      fill.colors.forEach((c, i) => gradient.addColorStop(i * step, c));
      bgCtx.fillStyle = gradient;
      bgCtx.fillRect(0, 0, W, H);
      return;
    }

    if (fill.kind === "custom") {
      const gradData = fill.data;
      if (gradData.type === "linear") {
        const x1 = gradData.startPoint.x * W;
        const y1 = gradData.startPoint.y * H;
        const x2 = gradData.endPoint.x * W;
        const y2 = gradData.endPoint.y * H;

        const grad = bgCtx.createLinearGradient(x1, y1, x2, y2);
        gradData.stops.forEach((s: any) => grad.addColorStop(s.offset, s.color));
        bgCtx.fillStyle = grad;
        bgCtx.fillRect(0, 0, W, H);
      } else if (Array.isArray(gradData.meshPoints)) {
        bgCtx.fillStyle = "#000";
        bgCtx.fillRect(0, 0, W, H);
        bgCtx.globalCompositeOperation = "screen";
        gradData.meshPoints.forEach((stop: any) => {
          const x = stop.x * W;
          const y = stop.y * H;
          const baseRadius = Math.max(W, H) * 0.8;
          const r = baseRadius * (stop.radius !== undefined ? stop.radius : 1.0);

          const radGrad = bgCtx.createRadialGradient(x, y, 0, x, y, r);
          radGrad.addColorStop(0, stop.color);
          radGrad.addColorStop(1, "transparent");

          bgCtx.fillStyle = radGrad;
          bgCtx.fillRect(0, 0, W, H);
        });
        bgCtx.globalCompositeOperation = "source-over";
      }
    }
  }

  isLightColor(hex: string): boolean {
    const c = hex.replace("#", "");
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 160;
  }

  private renderMonochromeContent(): HTMLElement {
    const wrap = (<div class="color-monochrome-wrap"></div>) as HTMLElement;

    const title = (
      <div
        style={{
          marginTop: "4px",
          fontSize: "11px",
          color: "#999",
          marginBottom: "6px",
        }}
      >
        Custom Color
      </div>
    );
    wrap.appendChild(title);

    const grid = (<div class="color-grid"></div>) as HTMLElement;

    // + Button for custom color picker
    const plusBtn = (
      <button
        type="button"
        class="color-swatch color-plus"
        id="mono-plus-btn"
        title="Custom color picker"
        onClick={() => {
          const input = document.createElement("input");
          input.type = "color";
          input.value = "#ffffff";
          input.addEventListener("input", () => {
            this.applyColor(input.value);
          });
          input.click();
        }}
      >
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path
            fill="currentColor"
            d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
          />
        </svg>
      </button>
    );
    grid.appendChild(plusBtn);

    MONOCHROME_COLORS.forEach((c) => {
      const swatch = (
        <button
          type="button"
          class="color-swatch"
          data-color={c.hex}
          title={c.name}
          style={{
            background: c.hex,
            border: this.isLightColor(c.hex) ? "1px solid #666" : "none",
          }}
          onClick={() => {
            this.applyColor(c.hex);
          }}
        ></button>
      );
      grid.appendChild(swatch);
    });

    wrap.appendChild(grid);
    return wrap;
  }

  private renderGradientContent(): HTMLElement {
    const wrap = (<div class="color-gradient-wrap"></div>) as HTMLElement;

    const titleCustom = (
      <div style={{ fontSize: "11px", color: "#999", marginBottom: "6px" }}>
        Custom Gradient
      </div>
    );
    wrap.appendChild(titleCustom);

    const plusBtn = (
      <button
        type="button"
        class="gradient-preset"
        id="gradient-plus-btn"
        title="Create custom gradient"
        onClick={() => {
          eventBus.emit("gradient:open-custom", {
            targetLayer: this.currentOptions.targetLayer,
            onApply: this.currentOptions.onColorChange
              ? (gradData: any) => {
                  if (this.currentOptions.onColorChange) {
                    this.currentOptions.onColorChange({ kind: "custom", data: gradData });
                  }
                }
              : undefined,
          });
        }}
      >
        <span
          class="gradient-plus-icon"
          style={{
            width: "36px",
            height: "24px",
            borderRadius: "4px",
            border: "1px solid #555",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#333",
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path
              fill="currentColor"
              d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
            />
          </svg>
        </span>
        <span class="gradient-name" style={{ color: "#999" }}>
          Custom...
        </span>
      </button>
    );
    wrap.appendChild(plusBtn);

    const titlePresets = (
      <div
        style={{
          marginTop: "8px",
          fontSize: "11px",
          color: "#999",
          marginBottom: "6px",
        }}
      >
        Presets
      </div>
    );
    wrap.appendChild(titlePresets);

    const grid = (<div class="gradient-grid"></div>) as HTMLElement;

    this.getAllPresets().forEach((g) => {
      let bgStyle = "";
      if (g.isCustom && g.data) {
        if (g.data.type === "linear") {
          const dx = g.data.endPoint.x - g.data.startPoint.x;
          const dy = g.data.endPoint.y - g.data.startPoint.y;
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          const cssAngle = angle + 90;
          const stopStrs = g.data.stops
            .map((s: any) => `${s.color} ${Math.round(s.offset * 100)}%`)
            .join(", ");
          bgStyle = `linear-gradient(${Math.round(cssAngle)}deg, ${stopStrs})`;
        } else if (Array.isArray(g.data.meshPoints)) {
          const bgImages = g.data.meshPoints.map((p: any) => {
            const x = Math.round(p.x * 100);
            const y = Math.round(p.y * 100);
            const r = Math.round((p.radius !== undefined ? p.radius : 1.0) * 80);
            return `radial-gradient(circle at ${x}% ${y}%, ${p.color} 0%, transparent ${r}%)`;
          });
          bgStyle = bgImages.join(", ");
        }
      } else {
        const dir = g.colors.length > 2 ? "135deg" : "to right";
        const stops = g.colors.join(", ");
        bgStyle = `linear-gradient(${dir}, ${stops})`;
      }

      const presetBtn = (
        <button
          type="button"
          class="gradient-preset"
          title={g.name}
          onClick={() => {
            this.applyGradient(g);
          }}
        >
          <span
            class="gradient-preview"
            style={{
              background: bgStyle,
              backgroundColor: "#000",
            }}
          ></span>
          <span class="gradient-name">{g.name}</span>
        </button>
      );

      grid.appendChild(presetBtn);
    });

    wrap.appendChild(grid);
    return wrap;
  }

  private renderUI(): void {
    const container = this.currentContainer;
    if (!container) return;

    container.innerHTML = "";

    const backBtn = (
      <button
        type="button"
        id="color-back-btn"
        class="sub-item"
        style={{ marginBottom: "4px" }}
        onClick={() => this.close()}
      >
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path
            fill="currentColor"
            d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
          />
        </svg>
        <span>Back</span>
      </button>
    );

    const backDiv = <div class="color-back">{backBtn}</div>;

    const tabsDiv = TabBar({
      tabs: [
        { id: "monochrome", label: "Monochrome" },
        { id: "gradient", label: "Gradient" },
      ],
      active: this.currentTab,
      onChange: (id) => {
        this.currentTab = id as "monochrome" | "gradient";
        this.renderUI();
      },
    });
    (tabsDiv as HTMLElement).className = "color-tabs";

    const contentDiv = (
      <div class="color-content" style={{ flex: "1", overflowY: "auto" }}>
        {this.currentTab === "monochrome"
          ? this.renderMonochromeContent()
          : this.renderGradientContent()}
      </div>
    ) as HTMLElement;

    container.appendChild(backDiv);
    container.appendChild(tabsDiv);
    container.appendChild(contentDiv);
  }

  applyColor(hex: string): void {
    const { layerManager, onColorChange } = this.currentOptions;

    // If onColorChange is provided without explicit targetLayer, delegate entirely to callback
    if (onColorChange && !this.currentOptions.targetLayer) {
      onColorChange(hex);
      return;
    }

    let targetLayer = this.currentOptions.targetLayer;
    if (targetLayer === undefined && layerManager) {
      targetLayer = layerManager.getActiveLayer();
    }

    if (targetLayer && targetLayer.type === "text" && targetLayer.id !== 0) {
      targetLayer.fontColor = hex;
      if (targetLayer.text !== null) {
        targetLayer.drawText(targetLayer.text, targetLayer.x, targetLayer.y);
      }
      if (layerManager) layerManager.render();
      eventBus.emit("layer:color-changed", { layer: targetLayer, color: hex });
      if (onColorChange) onColorChange(hex);
      return;
    }

    const canvas =
      this.currentOptions.canvas ||
      (layerManager ? layerManager.mainCanvas : null) ||
      (document.getElementById("canvas") as HTMLCanvasElement | null);
    this.lastBackground = { kind: "solid", hex };

    if (layerManager) {
      const bg = layerManager.getBackgroundLayer();
      if (bg && canvas) {
        this.renderBackgroundFill(bg.ctx, canvas.width, canvas.height, this.lastBackground);
        layerManager.render();
        eventBus.emit("background:changed", this.lastBackground);
      }
    } else if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = hex;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }

    if (onColorChange) onColorChange(this.lastBackground);
  }

  applyGradient(preset: PresetGradientItem): void {
    const { layerManager, onColorChange } = this.currentOptions;

    const angleDeg = preset.colors.length > 2 ? 135 : 90;
    const gradFill: BackgroundFill = preset.isCustom
      ? { kind: "custom", data: preset.data }
      : { kind: "preset", colors: [...preset.colors], angleDeg };

    // If onColorChange is provided without explicit targetLayer, delegate entirely to callback
    if (onColorChange && !this.currentOptions.targetLayer) {
      onColorChange(gradFill);
      return;
    }

    let targetLayer = this.currentOptions.targetLayer;
    if (targetLayer === undefined && layerManager) {
      targetLayer = layerManager.getActiveLayer();
    }

    if (targetLayer && targetLayer.type === "text" && targetLayer.id !== 0) {
      targetLayer.fontColor = gradFill;
      if (targetLayer.text !== null) {
        targetLayer.drawText(targetLayer.text, targetLayer.x, targetLayer.y);
      }
      if (layerManager) layerManager.render();
      eventBus.emit("layer:color-changed", { layer: targetLayer, color: gradFill });
      if (onColorChange) onColorChange(gradFill);
      return;
    }

    const canvas =
      this.currentOptions.canvas ||
      (layerManager ? layerManager.mainCanvas : null) ||
      (document.getElementById("canvas") as HTMLCanvasElement | null);
    this.lastBackground = gradFill;

    if (layerManager && canvas) {
      const bg = layerManager.getBackgroundLayer();
      if (bg) {
        this.renderBackgroundFill(bg.ctx, canvas.width, canvas.height, gradFill);
        layerManager.render();
        eventBus.emit("background:changed", gradFill);
      }
    }

    if (onColorChange) onColorChange(gradFill);
  }

  open(
    container?: HTMLElement | null,
    options: ColorModuleOptions = {}
  ): void {
    const targetContainer =
      container || (document.getElementById("sub-sidebar") as HTMLElement | null);
    if (!targetContainer) return;

    this.currentContainer = targetContainer;
    this.currentOptions = options;
    this.currentTab = "monochrome";

    if (!targetContainer.querySelector(".color-tabs")) {
      this.savedHTML = targetContainer.innerHTML;
    }

    this.isOpen = true;
    this.renderUI();
  }

  close(): void {
    this.isOpen = false;
    if (this.currentContainer && this.savedHTML) {
      this.currentContainer.innerHTML = this.savedHTML;
      this.savedHTML = "";
    }
    if (this.currentOptions.onClose) {
      this.currentOptions.onClose();
    }
  }

  createGradientFillForCtx(
    ctx: CanvasRenderingContext2D,
    bounds: { x: number; y: number; width: number; height: number } | null,
    fill: BackgroundFill
  ): CanvasGradient | null {
    if (!fill || !bounds) return null;
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width || 100;
    const h = bounds.height || 50;

    if (fill.kind === "preset") {
      const { x1, y1, x2, y2 } = this.getGradientEndpointsForCssAngle(
        fill.angleDeg,
        w,
        h
      );
      const gradient = ctx.createLinearGradient(x + x1, y + y1, x + x2, y + y2);
      const step = 1 / (fill.colors.length - 1);
      fill.colors.forEach((c, i) => gradient.addColorStop(i * step, c));
      return gradient;
    }

    if (fill.kind === "custom") {
      const gradData = fill.data;
      if (gradData.type === "linear") {
        const x1 = x + gradData.startPoint.x * w;
        const y1 = y + gradData.startPoint.y * h;
        const x2 = x + gradData.endPoint.x * w;
        const y2 = y + gradData.endPoint.y * h;
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        gradData.stops.forEach((s: any) => grad.addColorStop(s.offset, s.color));
        return grad;
      }
    }
    return null;
  }

  createMeshPatternForBounds(
    ctx: CanvasRenderingContext2D,
    bounds: { x: number; y: number; width: number; height: number } | null,
    fill: BackgroundFill
  ): CanvasPattern | null {
    if (!fill || !bounds) return null;
    const w = Math.max(1, Math.round(bounds.width));
    const h = Math.max(1, Math.round(bounds.height));
    const offCanvas = document.createElement("canvas");
    offCanvas.width = w;
    offCanvas.height = h;
    const offCtx = offCanvas.getContext("2d");
    if (!offCtx) return null;
    this.renderBackgroundFill(offCtx, w, h, fill);

    const pattern = ctx.createPattern(offCanvas, "no-repeat");
    if (pattern && typeof DOMMatrix !== "undefined") {
      const matrix = new DOMMatrix().translate(bounds.x, bounds.y);
      pattern.setTransform(matrix);
    }
    return pattern;
  }

  addGradientPreset(gradData: any, name?: string): void {
    this.customPresets.unshift({
      name: name || "Custom",
      isCustom: true,
      colors: [],
      data: JSON.parse(JSON.stringify(gradData)),
    });
    if (this.customPresets.length > 10) this.customPresets.pop();
    this.saveCustomGradients();
    if (this.isOpen && this.currentTab === "gradient") {
      this.renderUI();
    }
  }

  isActive(): boolean {
    return this.isOpen;
  }
}

export const ColorModule = new ColorService();
