/**
 * Gradient Module - TypeScript + TSX Real DOM
 * Custom Linear & Radial Mesh Gradients management
 */

import { h } from "../ui/jsx";
import { showPopup, PopupInstance } from "../ui/Popup";
import { LayerManager, Layer } from "../core/layer";
import { TextTransform } from "../text/text-transform";
import { ColorModule } from "./color";
import { eventBus } from "../core/event-bus";
import { TabBar } from "../ui/TabBar";

export interface LinearStop {
  offset: number;
  color: string;
  radius?: number;
}

export interface MeshPoint {
  x: number;
  y: number;
  color: string;
  radius?: number;
}

export interface GradientCustomData {
  type: "linear" | "radial";
  stops?: LinearStop[];
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  meshPoints?: MeshPoint[];
}

export interface GradientModuleOptions {
  layerManager?: LayerManager;
  textTransform?: TextTransform;
  targetLayer?: Layer | null;
  onApply?: (data: GradientCustomData) => void;
}

export class GradientService {
  private type: "linear" | "radial" = "linear";

  private stops1D: LinearStop[] = [
    { offset: 0, color: "#ff0000", radius: 0.1 },
    { offset: 1, color: "#0000ff", radius: 0.1 },
  ];
  private selectedStop1DIdx = 0;
  private startPoint = { x: 0.1, y: 0.5 };
  private endPoint = { x: 0.9, y: 0.5 };

  private meshPoints: MeshPoint[] = [
    { x: 0.2, y: 0.2, color: "#ff0000", radius: 1.0 },
    { x: 0.8, y: 0.2, color: "#0000ff", radius: 1.0 },
    { x: 0.5, y: 0.8, color: "#00ff00", radius: 1.0 },
  ];
  private selectedMeshIdx = 0;

  private currentPopup: PopupInstance | null = null;
  private options: GradientModuleOptions = {};

  open(options: GradientModuleOptions = {}): void {
    this.options = options;

    const popupContent = (
      <div
        class="grad-editor-container"
        style={{ display: "flex", flexDirection: "column", gap: "16px" }}
      >
        {/* 1. Type selector */}
        {TabBar({
          tabs: [
            { id: "linear", label: "Linear (S ➔ E)" },
            { id: "radial", label: "Circular (Radial Mesh)" },
          ],
          active: this.type,
          onChange: (id) => {
            this.type = id as "linear" | "radial";
            this.syncTypeTabs();
            this.updateUI();
          },
        })}

        {/* 2. Interactive Canvas Area */}
        <div
          id="grad-canvas-wrapper"
          style={{
            position: "relative",
            height: "180px",
            background: "#111",
            borderRadius: "8px",
            border: "1px solid #555",
            overflow: "hidden",
            userSelect: "none",
          }}
        >
          <canvas
            id="grad-preview-canvas"
            style={{ width: "100%", height: "100%", display: "block" }}
          ></canvas>
          <div id="grad-handles-container"></div>
        </div>

        {/* 3. Linear-only Color Stops distribution bar */}
        <div
          id="cg-linear-distribution"
          style={{
            display: this.type === "linear" ? "flex" : "none",
            flexDirection: "column",
            position: "relative",
          }}
        >
          <div
            class="grad-slider-container"
            style={{ position: "relative", height: "30px", userSelect: "none" }}
          >
            <div
              id="grad-bar"
              style={{
                position: "absolute",
                top: "4px",
                left: "10px",
                right: "10px",
                height: "16px",
                borderRadius: "4px",
                border: "1px solid #555",
                boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)",
              }}
            ></div>
            <div
              id="grad-stops-container"
              style={{
                position: "absolute",
                top: "0",
                left: "0",
                right: "0",
                height: "24px",
              }}
            ></div>
          </div>
        </div>

        {/* 4. Stop controls */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            type="button"
            id="cg-btn-add"
            class="top-btn"
            style={{ border: "1px solid #444", padding: "6px 12px" }}
            onClick={() => this.handleAddStop()}
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            <span id="cg-add-text">
              {this.type === "linear" ? "Add Stop" : "Add Point"}
            </span>
          </button>
          <button
            type="button"
            id="cg-btn-remove"
            class="top-btn"
            style={{ border: "1px solid #444", padding: "6px 12px" }}
            onClick={() => this.handleRemoveStop()}
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M19 13H5v-2h14v2z" />
            </svg>
            <span id="cg-remove-text">
              {this.type === "linear" ? "Remove Stop" : "Remove Point"}
            </span>
          </button>
          <button
            type="button"
            id="cg-btn-reverse"
            class="top-btn"
            style={{ border: "1px solid #444", padding: "6px 12px" }}
            onClick={() => this.handleReverse()}
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path
                fill="currentColor"
                d="M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z"
              />
            </svg>
            <span>Reverse</span>
          </button>
        </div>

        {/* 5. Config panel for active selection */}
        <div
          id="cg-stop-config"
          style={{
            background: "#222",
            padding: "12px",
            borderRadius: "6px",
            border: "1px solid #444",
          }}
        >
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
            <div style={{ flex: "1" }}>
              <label
                style={{
                  fontSize: "11px",
                  color: "#999",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Color
              </label>
              <input
                type="color"
                id="cg-stop-color"
                value="#ffffff"
                style={{
                  width: "100%",
                  height: "32px",
                  border: "1px solid #555",
                  borderRadius: "4px",
                  background: "#1e1e1e",
                  cursor: "pointer",
                  padding: "2px",
                }}
                onInput={(e: Event) => {
                  const val = (e.target as HTMLInputElement).value;
                  if (this.type === "linear") {
                    if (this.stops1D[this.selectedStop1DIdx]) {
                      this.stops1D[this.selectedStop1DIdx].color = val;
                    }
                  } else {
                    if (this.meshPoints[this.selectedMeshIdx]) {
                      this.meshPoints[this.selectedMeshIdx].color = val;
                    }
                  }
                  this.updateUI();
                }}
              />
            </div>
            <div
              id="cg-coords-display"
              style={{
                display: this.type === "radial" ? "flex" : "none",
                flex: "1",
                flexDirection: "column",
              }}
            >
              <label
                style={{
                  fontSize: "11px",
                  color: "#999",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Coordinates
              </label>
              <div
                id="cg-coords-val"
                style={{
                  fontFamily: "monospace",
                  fontSize: "12px",
                  color: "#ccc",
                  background: "#1e1e1e",
                  padding: "6px 8px",
                  borderRadius: "4px",
                  border: "1px solid #555",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                X: --, Y: --
              </div>
            </div>
          </div>
          {/* Spread slider */}
          <div style={{ marginTop: "12px" }} id="cg-spread-container">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "11px",
                color: "#999",
                marginBottom: "4px",
              }}
            >
              <span>Spread / Radius (%)</span>
              <span id="cg-spread-val">10%</span>
            </div>
            <input
              type="range"
              id="cg-spread-range"
              min="10"
              max="250"
              value="10"
              style={{ width: "100%" }}
              onInput={(e: Event) => {
                const val = parseInt((e.target as HTMLInputElement).value, 10);
                const spreadValEl = document.getElementById("cg-spread-val");
                if (spreadValEl) spreadValEl.textContent = `${val}%`;

                if (this.type === "linear") {
                  if (this.stops1D[this.selectedStop1DIdx]) {
                    this.stops1D[this.selectedStop1DIdx].radius = val / 100;
                  }
                } else {
                  if (this.meshPoints[this.selectedMeshIdx]) {
                    this.meshPoints[this.selectedMeshIdx].radius = val / 100;
                  }
                }
                this.updateUI();
              }}
            />
          </div>
        </div>

        {/* 6. Bottom action */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            id="cg-apply-btn"
            style={{
              padding: "8px 14px",
              background: "#094771",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
            }}
            onClick={() => this.handleApply()}
          >
            ✓ Apply
          </button>
          <button
            type="button"
            id="cg-cancel-btn"
            style={{
              padding: "8px 14px",
              background: "#555",
              color: "#ccc",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "13px",
            }}
            onClick={() => this.close()}
          >
            Cancel
          </button>
        </div>
      </div>
    ) as HTMLElement;

    this.currentPopup = showPopup({
      title: "Gradient Editor",
      width: "540px",
      content: popupContent,
    });

    setTimeout(() => {
      this.syncTypeTabs();
      this.updateUI();
    }, 50);
  }

  close(): void {
    if (this.currentPopup) {
      this.currentPopup.close();
      this.currentPopup = null;
    }
  }

  private syncTypeTabs(): void {
    const linearDist = document.getElementById("cg-linear-distribution");
    const coordsDisplay = document.getElementById("cg-coords-display");
    if (linearDist) linearDist.style.display = this.type === "linear" ? "flex" : "none";
    if (coordsDisplay) coordsDisplay.style.display = this.type === "radial" ? "flex" : "none";

    const addText = document.getElementById("cg-add-text");
    const removeText = document.getElementById("cg-remove-text");
    if (addText) addText.textContent = this.type === "linear" ? "Add Stop" : "Add Point";
    if (removeText) removeText.textContent = this.type === "linear" ? "Remove Stop" : "Remove Point";
  }

  private handleAddStop(): void {
    if (this.type === "linear") {
      if (this.stops1D.length >= 8) return;
      const last = this.stops1D[this.stops1D.length - 1];
      const offset = Math.min(1, last ? last.offset + 0.1 : 0.5);
      this.stops1D.push({ offset, color: "#ffffff", radius: 0.1 });
      this.stops1D.sort((a, b) => a.offset - b.offset);
      this.selectedStop1DIdx = this.stops1D.findIndex((s) => s.offset === offset);
    } else {
      if (this.meshPoints.length >= 10) return;
      const rx = 0.3 + Math.random() * 0.4;
      const ry = 0.3 + Math.random() * 0.4;
      const randColor =
        "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
      this.meshPoints.push({ x: rx, y: ry, color: randColor, radius: 1.0 });
      this.selectedMeshIdx = this.meshPoints.length - 1;
    }
    this.updateUI();
  }

  private handleRemoveStop(): void {
    if (this.type === "linear") {
      if (this.stops1D.length <= 2) return;
      this.stops1D.splice(this.selectedStop1DIdx, 1);
      this.selectedStop1DIdx = Math.max(0, this.selectedStop1DIdx - 1);
    } else {
      if (this.meshPoints.length <= 1) return;
      this.meshPoints.splice(this.selectedMeshIdx, 1);
      this.selectedMeshIdx = Math.max(0, this.selectedMeshIdx - 1);
    }
    this.updateUI();
  }

  private handleReverse(): void {
    if (this.type === "linear") {
      this.stops1D.forEach((s) => (s.offset = 1 - s.offset));
      this.stops1D.reverse();
    } else {
      const colors = this.meshPoints.map((p) => p.color).reverse();
      this.meshPoints.forEach((p, idx) => (p.color = colors[idx]));
    }
    this.updateUI();
  }

  private getProcessedLinearStops(): LinearStop[] {
    if (this.stops1D.length < 2) return this.stops1D;
    const sorted = [...this.stops1D].sort((a, b) => a.offset - b.offset);
    const result: LinearStop[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      const r = current.radius !== undefined ? current.radius : 1.0;

      if (r > 1.0) {
        if (i > 0) {
          const prev = sorted[i - 1];
          const gap = current.offset - prev.offset;
          const pushRatio = Math.min(0.45, (r - 1.0) * 0.25);
          result.push({
            offset: current.offset - gap * pushRatio,
            color: current.color,
          });
        }
        result.push({ offset: current.offset, color: current.color });
        if (i < sorted.length - 1) {
          const next = sorted[i + 1];
          const gap = next.offset - current.offset;
          const pushRatio = Math.min(0.45, (r - 1.0) * 0.25);
          result.push({
            offset: current.offset + gap * pushRatio,
            color: current.color,
          });
        }
      } else {
        result.push({ offset: current.offset, color: current.color });
      }
    }
    return result;
  }

  private updateUI(): void {
    const canvas2d = document.getElementById("grad-preview-canvas") as HTMLCanvasElement | null;
    const wrapper = document.getElementById("grad-canvas-wrapper") as HTMLElement | null;
    if (!canvas2d || !wrapper) return;

    canvas2d.width = wrapper.clientWidth || 500;
    canvas2d.height = wrapper.clientHeight || 180;
    const ctx2d = canvas2d.getContext("2d");
    if (!ctx2d) return;

    const handlesContainer = document.getElementById("grad-handles-container");
    if (handlesContainer) handlesContainer.innerHTML = "";

    if (this.type === "linear") {
      const x1 = this.startPoint.x * canvas2d.width;
      const y1 = this.startPoint.y * canvas2d.height;
      const x2 = this.endPoint.x * canvas2d.width;
      const y2 = this.endPoint.y * canvas2d.height;

      const grad = ctx2d.createLinearGradient(x1, y1, x2, y2);
      const processedStops = this.getProcessedLinearStops();
      processedStops.forEach((s) => grad.addColorStop(s.offset, s.color));
      ctx2d.fillStyle = grad;
      ctx2d.fillRect(0, 0, canvas2d.width, canvas2d.height);

      ctx2d.beginPath();
      ctx2d.moveTo(x1, y1);
      ctx2d.lineTo(x2, y2);
      ctx2d.strokeStyle = "rgba(255,255,255,0.4)";
      ctx2d.setLineDash([4, 4]);
      ctx2d.stroke();
      ctx2d.setLineDash([]);

      const points = [
        { label: "S", pt: this.startPoint, color: "#00ffff" },
        { label: "E", pt: this.endPoint, color: "#ff00ff" },
      ];

      points.forEach((p) => {
        const handle = document.createElement("div");
        handle.className = "grad-handle-2d";
        handle.style.position = "absolute";
        handle.style.width = "24px";
        handle.style.height = "24px";
        handle.style.borderRadius = "50%";
        handle.style.display = "flex";
        handle.style.alignItems = "center";
        handle.style.justifyContent = "center";
        handle.style.fontSize = "11px";
        handle.style.fontWeight = "bold";
        handle.style.color = "#000";
        handle.style.cursor = "pointer";
        handle.style.border = "2px solid #fff";
        handle.style.left = `calc(${p.pt.x * 100}% - 12px)`;
        handle.style.top = `calc(${p.pt.y * 100}% - 12px)`;
        handle.style.backgroundColor = p.color;
        handle.textContent = p.label;

        handle.addEventListener("mousedown", (e) => {
          e.preventDefault();
          const rect = wrapper.getBoundingClientRect();

          const onMouseMove = (moveEv: MouseEvent) => {
            p.pt.x = Math.max(0, Math.min(1, (moveEv.clientX - rect.left) / rect.width));
            p.pt.y = Math.max(0, Math.min(1, (moveEv.clientY - rect.top) / rect.height));
            this.updateUI();
          };
          const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
          };
          document.addEventListener("mousemove", onMouseMove);
          document.addEventListener("mouseup", onMouseUp);
        });

        if (handlesContainer) handlesContainer.appendChild(handle);
      });

      const bar = document.getElementById("grad-bar");
      if (bar) {
        const stopStrs = this.stops1D.map((s) => `${s.color} ${s.offset * 100}%`).join(", ");
        bar.style.background = `linear-gradient(to right, ${stopStrs})`;
      }

      const stopsContainer = document.getElementById("grad-stops-container");
      if (stopsContainer) {
        stopsContainer.innerHTML = "";
        this.stops1D.forEach((stop, idx) => {
          const marker = document.createElement("div");
          marker.className = `grad-marker ${idx === this.selectedStop1DIdx ? "active" : ""}`;
          marker.style.position = "absolute";
          marker.style.width = "16px";
          marker.style.height = "16px";
          marker.style.borderRadius = "50%";
          marker.style.border = idx === this.selectedStop1DIdx ? "2px solid #fff" : "1px solid #333";
          marker.style.boxShadow = "0 1px 3px rgba(0,0,0,0.6)";
          marker.style.cursor = "pointer";
          marker.style.left = `calc(${stop.offset * 100}% - 8px)`;
          marker.style.background = stop.color;

          marker.addEventListener("mousedown", (e) => {
            this.selectedStop1DIdx = idx;
            this.updateUI();
            e.preventDefault();

            const startX = e.clientX;
            const initialOffset = stop.offset;
            const rect = stopsContainer.getBoundingClientRect();

            const onMouseMove = (moveEv: MouseEvent) => {
              const dx = moveEv.clientX - startX;
              const newOffset = Math.max(0, Math.min(1, initialOffset + dx / rect.width));
              stop.offset = newOffset;

              const current = this.stops1D[this.selectedStop1DIdx];
              this.stops1D.sort((a, b) => a.offset - b.offset);
              this.selectedStop1DIdx = this.stops1D.indexOf(current);

              this.updateUI();
            };
            const onMouseUp = () => {
              document.removeEventListener("mousemove", onMouseMove);
              document.removeEventListener("mouseup", onMouseUp);
            };
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
          });

          stopsContainer.appendChild(marker);
        });
      }

      const current = this.stops1D[this.selectedStop1DIdx];
      if (current) {
        const colorInput = document.getElementById("cg-stop-color") as HTMLInputElement | null;
        if (colorInput) colorInput.value = current.color;
        const radiusPercent = Math.round((current.radius || 0.1) * 100);
        const range = document.getElementById("cg-spread-range") as HTMLInputElement | null;
        if (range) range.value = String(radiusPercent);
        const valEl = document.getElementById("cg-spread-val");
        if (valEl) valEl.textContent = `${radiusPercent}%`;
      }
    } else {
      ctx2d.fillStyle = "#000";
      ctx2d.fillRect(0, 0, canvas2d.width, canvas2d.height);
      ctx2d.globalCompositeOperation = "screen";

      this.meshPoints.forEach((stop) => {
        const x = stop.x * canvas2d.width;
        const y = stop.y * canvas2d.height;
        const baseRadius = Math.max(canvas2d.width, canvas2d.height) * 0.8;
        const r = baseRadius * (stop.radius || 0.8);

        const radGrad = ctx2d.createRadialGradient(x, y, 0, x, y, r);
        radGrad.addColorStop(0, stop.color);
        radGrad.addColorStop(1, "transparent");

        ctx2d.fillStyle = radGrad;
        ctx2d.fillRect(0, 0, canvas2d.width, canvas2d.height);
      });
      ctx2d.globalCompositeOperation = "source-over";

      this.meshPoints.forEach((stop, idx) => {
        const handle = document.createElement("div");
        handle.className = `grad-handle-2d ${idx === this.selectedMeshIdx ? "active" : ""}`;
        handle.style.position = "absolute";
        handle.style.width = "24px";
        handle.style.height = "24px";
        handle.style.borderRadius = "50%";
        handle.style.display = "flex";
        handle.style.alignItems = "center";
        handle.style.justifyContent = "center";
        handle.style.fontSize = "11px";
        handle.style.fontWeight = "bold";
        handle.style.color = "#000";
        handle.style.cursor = "pointer";
        handle.style.border = idx === this.selectedMeshIdx ? "2px solid #fff" : "1px solid #999";
        handle.style.left = `calc(${stop.x * 100}% - 12px)`;
        handle.style.top = `calc(${stop.y * 100}% - 12px)`;
        handle.style.backgroundColor = stop.color;
        handle.textContent = String(idx + 1);

        handle.addEventListener("mousedown", (e) => {
          this.selectedMeshIdx = idx;
          this.updateUI();
          e.preventDefault();
          const rect = wrapper.getBoundingClientRect();

          const onMouseMove = (moveEv: MouseEvent) => {
            stop.x = Math.max(0, Math.min(1, (moveEv.clientX - rect.left) / rect.width));
            stop.y = Math.max(0, Math.min(1, (moveEv.clientY - rect.top) / rect.height));
            this.updateUI();
          };
          const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
          };
          document.addEventListener("mousemove", onMouseMove);
          document.addEventListener("mouseup", onMouseUp);
        });

        if (handlesContainer) handlesContainer.appendChild(handle);
      });

      const current = this.meshPoints[this.selectedMeshIdx];
      if (current) {
        const colorInput = document.getElementById("cg-stop-color") as HTMLInputElement | null;
        if (colorInput) colorInput.value = current.color;
        const coordsVal = document.getElementById("cg-coords-val");
        if (coordsVal) {
          coordsVal.textContent = `X: ${Math.round(current.x * 100)}%, Y: ${Math.round(
            current.y * 100
          )}%`;
        }
        const radiusPercent = Math.round((current.radius || 0.8) * 100);
        const range = document.getElementById("cg-spread-range") as HTMLInputElement | null;
        if (range) range.value = String(radiusPercent);
        const valEl = document.getElementById("cg-spread-val");
        if (valEl) valEl.textContent = `${radiusPercent}%`;
      }
    }
  }

  private handleApply(): void {
    let gradData: GradientCustomData;

    if (this.type === "linear") {
      gradData = {
        type: "linear",
        stops: this.getProcessedLinearStops(),
        startPoint: { x: this.startPoint.x, y: this.startPoint.y },
        endPoint: { x: this.endPoint.x, y: this.endPoint.y },
      };
    } else {
      gradData = {
        type: "radial",
        meshPoints: this.meshPoints.map((p) => ({
          x: p.x,
          y: p.y,
          color: p.color,
          radius: p.radius,
        })),
      };
    }

    const { layerManager, textTransform, onApply } = this.options;
    let targetLayer: Layer | null = this.options.targetLayer !== undefined
      ? this.options.targetLayer
      : (textTransform ? textTransform.selectedLayer : null);

    if (!targetLayer) {
      if (layerManager) {
        const active = layerManager.getActiveLayer();
        if (active && active.id !== 0) targetLayer = active;
      }
    }

    if (targetLayer && targetLayer.type === "text" && targetLayer.id !== 0) {
      targetLayer.fontColor = {
        kind: "custom",
        data: JSON.parse(JSON.stringify(gradData)),
      };
      if (textTransform) {
        textTransform.redrawTextLayer(targetLayer);
      }
      if (layerManager) {
        layerManager.render();
      }
      if (textTransform && textTransform.selectedLayer === targetLayer) {
        textTransform.drawSelectionOverlay(targetLayer);
      }
    } else if (layerManager) {
      const bg = layerManager.getBackgroundLayer();
      const canvas = layerManager.mainCanvas;
      if (bg && canvas) {
        ColorModule.renderBackgroundFill(bg.ctx, canvas.width, canvas.height, {
          kind: "custom",
          data: gradData,
        });
        ColorModule.lastBackground = {
          kind: "custom",
          data: gradData,
        };
        layerManager.render();
        eventBus.emit("background:changed", ColorModule.lastBackground);
      }
    }

    ColorModule.addGradientPreset(
      gradData,
      this.type === "linear" ? "Linear Custom" : "Radial Custom"
    );

    if (onApply) onApply(gradData);

    this.close();
  }
}

export const GradientModule = new GradientService();
