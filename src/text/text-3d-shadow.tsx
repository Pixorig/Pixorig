/**
 * Text 3D Shadow Module - TSX Real DOM
 * Controls for 3D Ground/Floor Shadow:
 * - [Select Color] [Xóa]
 * - Interactive drag control for direction
 * - Opacity: <slider-control> (0% ~ 100%)
 * - Blur radius: <slider-control> (0 ~ 25)
 * - Expand by: <slider-control> (0 ~ 50)
 */

import { h } from "../ui/jsx";
import { PanelHeader } from "../ui/PanelHeader";
import { SliderControl } from "../ui/SliderControl";
import { LayerManager, Layer } from "../core/layer";
import { TextTransform } from "./text-transform";
import { ColorModule } from "../modules/color";
import { captureSnapshot, getSnapshot } from "../core/panel-state-store";

export class Text3DShadowModule {
  private layerManager: LayerManager;
  private textTransform: TextTransform;

  constructor(layerManager: LayerManager, textTransform: TextTransform) {
    this.layerManager = layerManager;
    this.textTransform = textTransform;
  }

  private getTargetLayer(): Layer | null {
    let layer = this.textTransform.selectedLayer;
    if (!layer || layer.id === 0) {
      const active = this.layerManager.getActiveLayer();
      if (active && active.id !== 0) layer = active;
    }
    return layer?.type === "text" ? layer : null;
  }

  private redrawAndSync(layer?: Layer | null): void {
    const target = layer || this.getTargetLayer();
    if (!target) return;
    this.textTransform.redrawTextLayer(target);
    this.layerManager.render();
    if (this.textTransform.selectedLayer === target) {
      this.textTransform.drawSelectionOverlay(target);
    }
  }

  private drawShadowControl(canvas: HTMLCanvasElement, layer: Layer | null): void {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.min(centerX, centerY) - 20;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw center circle (text position)
    ctx.fillStyle = "#3a3a3a";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#00f260";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw shadow direction line and handle
    if (layer?.shadow3dEnabled) {
      const angle = ((layer.shadow3dAngle ?? 135) * Math.PI) / 180;
      const distance = ((layer.shadow3dDistance ?? 26) / 100) * maxRadius;

      const handleX = centerX + Math.cos(angle) * distance;
      const handleY = centerY + Math.sin(angle) * distance;

      // Draw line from center to handle
      ctx.strokeStyle = "#00f260";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(handleX, handleY);
      ctx.stroke();

      // Draw handle
      ctx.fillStyle = "#00f260";
      ctx.beginPath();
      ctx.arc(handleX, handleY, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw text label
    ctx.fillStyle = "#999";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Drag to set shadow direction", centerX, canvas.height - 5);
  }

  private handleShadowDrag(
    canvas: HTMLCanvasElement,
    layer: Layer,
    mouseX: number,
    mouseY: number
  ): void {
    const rect = canvas.getBoundingClientRect();
    const x = mouseX - rect.left;
    const y = mouseY - rect.top;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.min(centerX, centerY) - 20;

    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // Update layer properties
    layer.shadow3dAngle = ((angle * 180) / Math.PI + 360) % 360;
    layer.shadow3dDistance = Math.min(100, (Math.min(distance, maxRadius) / maxRadius) * 100);
    layer.shadow3dEnabled = true;

    this.drawShadowControl(canvas, layer);
    this.redrawAndSync(layer);
  }

  open(containerGroup: HTMLElement, opts: { captureSnapshotValues?: boolean } = {}): void {
    if (!containerGroup) return;

    if (!containerGroup.querySelector(".text-3d-shadow-panel")) {
      containerGroup.dataset._savedInner = containerGroup.innerHTML;
    }

    // Ghi mốc THAM SỐ LÚC MỞ PANEL (giống Shadow): opacity, blur, expand,
    // angle, distance. Reset phục hồi các giá trị này — KHÔNG tắt hiệu ứng,
    // KHÔNG đụng màu (màu có nút xóa riêng). Chỉ ghi khi mở TỪ MENU;
    // re-render nội bộ (sau Reset) không ghi đè mốc.
    if (opts.captureSnapshotValues !== false) {
      const layer = this.getTargetLayer();
      if (layer) {
        captureSnapshot("3d-shadow", layer.id, {
          shadow3dOpacity: layer.shadow3dOpacity ?? 0.5,
          shadow3dBlur: layer.shadow3dBlur ?? 4,
          shadow3dExpand: layer.shadow3dExpand ?? 0,
          shadow3dAngle: layer.shadow3dAngle ?? 135,
          shadow3dDistance: layer.shadow3dDistance ?? 26,
        });
      }
    }

    const renderUI = () => {
      containerGroup.innerHTML = "";
      const layer = this.getTargetLayer();

      const panel = (
        <div
          class="text-3d-shadow-panel"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            userSelect: "none",
            padding: "12px 8px",
          }}
        ></div>
      ) as HTMLElement;

      // Back button
      // Reset = phục hồi THAM SỐ về mốc lúc mở panel gần nhất (giống Shadow):
      // opacity, blur, expand, angle, distance. Không tắt hiệu ứng, không đụng màu.
      const backBtn = PanelHeader({
        title: "3D Shadow",
        onBack: () => this.close(containerGroup),
        onReset: () => {
          const l = this.getTargetLayer();
          if (l) {
            const snap = getSnapshot("3d-shadow", l.id);
            l.shadow3dOpacity = snap ? Number(snap.shadow3dOpacity) : 0.5;
            l.shadow3dBlur = snap ? Number(snap.shadow3dBlur) : 4;
            l.shadow3dExpand = snap ? Number(snap.shadow3dExpand) : 0;
            l.shadow3dAngle = snap ? Number(snap.shadow3dAngle) : 135;
            l.shadow3dDistance = snap ? Number(snap.shadow3dDistance) : 26;
            this.redrawAndSync(l);
            // Re-render để slider + canvas hướng bóng hiển thị lại giá trị mốc,
            // KHÔNG ghi đè mốc
            this.open(containerGroup, { captureSnapshotValues: false });
          }
        },
      });
      panel.appendChild(backBtn);

      // Color row: [Select Color] [Xóa]
      const hasColor = !!layer?.shadow3dEnabled;
      const selectColorBtn = (
        <button
          type="button"
          style={{
            flex: "1",
            background: "#2a2a2a",
            border: "1px solid #444",
            borderRadius: "4px",
            color: "#fff",
            padding: "6px 10px",
            cursor: "pointer",
            fontSize: "12px",
          }}
          onClick={() => {
            containerGroup.dataset._savedInner_3d_shadow = containerGroup.innerHTML;
            ColorModule.open(containerGroup, {
              layerManager: this.layerManager,
              onColorChange: (color) => {
                const l = this.getTargetLayer();
                if (!l) return;
                if (typeof color === "string") {
                  l.shadow3dColor = color;
                } else if (typeof color === "object" && color !== null) {
                  const fill = color as any;
                  if (fill.kind === "solid") {
                    l.shadow3dColor = fill.hex;
                  } else {
                    l.shadow3dColor = fill;
                  }
                }
                l.shadow3dEnabled = true;
                this.redrawAndSync(l);
              },
              onClose: () => {
                this.open(containerGroup);
              },
            });
          }}
        >
          Select Color
        </button>
      );

      const deleteBtn = (
        <button
          type="button"
          style={{
            background: "#2a2a2a",
            border: "1px solid #444",
            borderRadius: "4px",
            color: hasColor ? "#ff4d4d" : "#666",
            padding: "6px 10px",
            cursor: hasColor ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          disabled={!hasColor}
          onClick={() => {
            const l = this.getTargetLayer();
            if (l) {
              l.shadow3dEnabled = false;
              this.redrawAndSync(l);
              renderUI();
            }
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path
              fill="currentColor"
              d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
            />
          </svg>
        </button>
      );

      const colorRow = (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {selectColorBtn}
          {deleteBtn}
        </div>
      ) as HTMLElement;
      panel.appendChild(colorRow);

      // Interactive shadow direction control
      const shadowControlCanvas = (
        <canvas
          width="200"
          height="200"
          style={{
            width: "200px",
            height: "200px",
            background: "#2a2a2a",
            borderRadius: "8px",
            cursor: "crosshair",
            margin: "8px auto",
            display: "block",
          }}
        ></canvas>
      ) as HTMLCanvasElement;

      this.drawShadowControl(shadowControlCanvas, layer);

      let dragging = false;

      shadowControlCanvas.addEventListener("mousedown", (e) => {
        const l = this.getTargetLayer();
        if (!l) return;
        dragging = true;
        l.shadow3dEnabled = true;
        this.handleShadowDrag(shadowControlCanvas, l, e.clientX, e.clientY);
      });

      shadowControlCanvas.addEventListener("mousemove", (e) => {
        if (!dragging) return;
        const l = this.getTargetLayer();
        if (!l) return;
        this.handleShadowDrag(shadowControlCanvas, l, e.clientX, e.clientY);
      });

      const stopDrag = () => {
        dragging = false;
      };

      shadowControlCanvas.addEventListener("mouseup", stopDrag);
      shadowControlCanvas.addEventListener("mouseleave", stopDrag);

      panel.appendChild(shadowControlCanvas);

      // Opacity slider: 0% ~ 100%
      const currentOpacity = Math.round((layer?.shadow3dOpacity ?? 0.5) * 100);
      const opacitySlider = SliderControl({
        label: "Opacity",
        value: currentOpacity,
        min: 0,
        max: 100,
        sliderMin: 0,
        sliderMax: 100,
        step: 1,
        unit: "%",
        onChange: (val) => {
          const l = this.getTargetLayer();
          if (!l) return;
          l.shadow3dOpacity = val / 100;
          l.shadow3dEnabled = true;
          this.redrawAndSync(l);
        },
      });
      panel.appendChild(opacitySlider);

      // Blur radius slider: 0 ~ 25
      const currentBlur = layer?.shadow3dBlur ?? 4;
      const blurSlider = SliderControl({
        label: "Blur radius",
        value: currentBlur,
        min: 0,
        max: 25,
        sliderMin: 0,
        sliderMax: 25,
        step: 1,
        onChange: (val) => {
          const l = this.getTargetLayer();
          if (!l) return;
          l.shadow3dBlur = Math.round(val);
          l.shadow3dEnabled = true;
          this.redrawAndSync(l);
        },
      });
      panel.appendChild(blurSlider);

      // Expand by slider: 0 ~ 50
      const currentExpand = layer?.shadow3dExpand ?? 0;
      const expandSlider = SliderControl({
        label: "Expand by",
        value: currentExpand,
        min: 0,
        max: 50,
        sliderMin: 0,
        sliderMax: 50,
        step: 1,
        onChange: (val) => {
          const l = this.getTargetLayer();
          if (!l) return;
          l.shadow3dExpand = Math.round(val);
          l.shadow3dEnabled = true;
          this.redrawAndSync(l);
        },
      });
      panel.appendChild(expandSlider);

      containerGroup.appendChild(panel);
    };

    renderUI();
  }

  close(containerGroup: HTMLElement): void {
    if (!containerGroup) return;
    if (containerGroup.dataset._savedInner) {
      containerGroup.innerHTML = containerGroup.dataset._savedInner;
      delete containerGroup.dataset._savedInner;
    }
  }
}
