/**
 * Relative Position Module - TypeScript + TSX
 * Aligns elements relative to canvas
 */

import { h } from "../ui/jsx";
import { PanelHeader } from "../ui/PanelHeader";
import { eventBus } from "../core/event-bus";
import { Layer, LayerManager } from "../core/layer";

export type PositionAlignment =
  | "left"
  | "center-h"
  | "right"
  | "top"
  | "center-v"
  | "bottom";

export interface RelativePositionOptions {
  layerManager?: LayerManager;
  canvas?: HTMLCanvasElement | null;
  targetLayer?: Layer | null;
  onPositionChange?: (type: PositionAlignment, layer: Layer) => void;
  onClose?: () => void;
}

let savedInnerHTML: string | null = null;

export const RelativePositionModule = {
  /**
   * Opens Relative Position sub-panel inside a container
   * @param containerGroup - Container element
   * @param options - Additional options
   */
  open(
    containerGroup: HTMLElement | null,
    options: RelativePositionOptions = {}
  ): void {
    if (!containerGroup) return;

    const { onClose, layerManager } = options;

    let targetLayer = options.targetLayer;
    if (!targetLayer && layerManager) {
      targetLayer = layerManager.getActiveLayer();
      if (targetLayer && targetLayer.id === 0) targetLayer = undefined;
    }

    if (!containerGroup.querySelector(".relative-position-panel")) {
      savedInnerHTML = containerGroup.innerHTML;
    }

    // Panel này chỉ là các nút align hành động một lần (kéo-thả theo căn)
    // nên không có nút Reset — tránh bấm nhầm liên tiếp gây hiệu ứng khó lường.
    const header = PanelHeader({
      title: "Relative Position",
      showReset: false,
      onBack: () => {
        this.close(containerGroup);
        if (onClose) onClose();
      },
      onReset: () => {},
    });

    const btnStyle = {
      flex: "1",
      padding: "12px 8px",
      background: "#2a2a2a",
      border: "1px solid #444",
      borderRadius: "6px",
      color: "#fff",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    };

    const panelEl = (
      <div
        class="relative-position-panel"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          userSelect: "none",
          padding: "12px 8px",
        }}
      >
        {header}

        <label style={{ fontSize: "11px", color: "#999", display: "block" }}>
          Horizontal Alignment
        </label>
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          {/* 1. Align Left (|<-) */}
          <button
            type="button"
            id="rel-align-left"
            title="Align Left"
            style={btnStyle}
            onClick={() => this.updatePosition("left", options)}
          >
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path
                fill="currentColor"
                d="M4 4h2v16H4V4zm6 7h10v2H10v3l-5-4 5-4v3z"
              />
            </svg>
          </button>

          {/* 2. Align Center Horizontal (>|<) */}
          <button
            type="button"
            id="rel-align-center-h"
            title="Align Center Horizontal"
            style={btnStyle}
            onClick={() => this.updatePosition("center-h", options)}
          >
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path
                fill="currentColor"
                d="M11 2h2v4h-2V2zm0 16h2v4h-2v-4zm-4-7V8l-5 4 5 4v-3h10v3l5-4-5-4v3H7z"
              />
            </svg>
          </button>

          {/* 3. Align Right (->|) */}
          <button
            type="button"
            id="rel-align-right"
            title="Align Right"
            style={btnStyle}
            onClick={() => this.updatePosition("right", options)}
          >
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path
                fill="currentColor"
                d="M18 4h2v16h-2V4zm-4 7H4v2h10v3l5-4-5-4v3z"
              />
            </svg>
          </button>
        </div>

        <label
          style={{
            fontSize: "11px",
            color: "#999",
            display: "block",
            marginTop: "8px",
          }}
        >
          Vertical Alignment
        </label>
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          {/* 4. Align Top ( | \n v \n _ ) */}
          <button
            type="button"
            id="rel-align-top"
            title="Align Top"
            style={btnStyle}
            onClick={() => this.updatePosition("top", options)}
          >
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path
                fill="currentColor"
                d="M4 4h16v2H4V4zm7 6v10h2V10h3l-4-5-4 5h3z"
              />
            </svg>
          </button>

          {/* 5. Align Center Vertical (v \n _ \n ^) */}
          <button
            type="button"
            id="rel-align-center-v"
            title="Align Center Vertical"
            style={btnStyle}
            onClick={() => this.updatePosition("center-v", options)}
          >
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path
                fill="currentColor"
                d="M2 11h4v2H2v-2zm16 0h4v2h-4v-2zm-7-4h3l-4-5-4 5h3v10H6l4 5 4-5h-3V7z"
              />
            </svg>
          </button>

          {/* 6. Align Bottom ( _ \n ^ \n | ) */}
          <button
            type="button"
            id="rel-align-bottom"
            title="Align Bottom"
            style={btnStyle}
            onClick={() => this.updatePosition("bottom", options)}
          >
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path
                fill="currentColor"
                d="M4 18h16v2H4v-2zm7-4V4h2v10h3l-4 5-4-5h3z"
              />
            </svg>
          </button>
        </div>
      </div>
    ) as HTMLElement;

    containerGroup.innerHTML = "";
    containerGroup.appendChild(panelEl);
  },

  close(containerGroup: HTMLElement | null): void {
    if (!containerGroup) return;
    if (savedInnerHTML !== null) {
      containerGroup.innerHTML = savedInnerHTML;
      savedInnerHTML = null;
    }
  },

  updatePosition(
    type: PositionAlignment,
    options: RelativePositionOptions = {}
  ): void {
    const { layerManager, onPositionChange } = options;
    const canvas =
      options.canvas || (document.getElementById("canvas") as HTMLCanvasElement | null);
    if (!canvas) return;

    let targetLayer = options.targetLayer;
    if (!targetLayer && layerManager) {
      targetLayer = layerManager.getActiveLayer();
      if (targetLayer && targetLayer.id === 0) {
        targetLayer = undefined;
      }
    }

    if (!targetLayer) return;

    const W = canvas.width;
    const H = canvas.height;

    if (targetLayer.type === "text") {
      // Calculate text width with current font
      const ctx = targetLayer.ctx;
      ctx.font = `${targetLayer.fontStyle} ${targetLayer.fontWeight} ${targetLayer.fontSize}px ${targetLayer.fontFamily}`;
      const lines = String(targetLayer.text || "").split("\n");
      let maxLineWidth = 0;
      for (const line of lines) {
        const w = ctx.measureText(line).width;
        if (w > maxLineWidth) maxLineWidth = w;
      }
      const textWidth = maxLineWidth;

      switch (type) {
        case "left":
          targetLayer.x = 0;
          if (targetLayer.textAlign === "center") targetLayer.x += textWidth / 2;
          else if (targetLayer.textAlign === "right") targetLayer.x += textWidth;
          break;
        case "center-h":
          targetLayer.x = W / 2;
          if (targetLayer.textAlign === "left") targetLayer.x -= textWidth / 2;
          else if (targetLayer.textAlign === "right") targetLayer.x += textWidth / 2;
          break;
        case "right":
          targetLayer.x = W;
          if (targetLayer.textAlign === "left") targetLayer.x -= textWidth;
          else if (targetLayer.textAlign === "center") targetLayer.x -= textWidth / 2;
          break;
        case "top":
          targetLayer.y = targetLayer.fontSize;
          break;
        case "center-v":
          targetLayer.y = (H + targetLayer.fontSize) / 2;
          break;
        case "bottom":
          targetLayer.y = H - 10;
          break;
      }

      if (targetLayer.text !== null) {
        targetLayer.drawText(targetLayer.text, targetLayer.x, targetLayer.y);
      }
    } else {
      const layerW = targetLayer.canvas.width || 100;
      const layerH = targetLayer.canvas.height || 100;

      switch (type) {
        case "left":
          targetLayer.x = 0;
          break;
        case "center-h":
          targetLayer.x = (W - layerW) / 2;
          break;
        case "right":
          targetLayer.x = W - layerW;
          break;
        case "top":
          targetLayer.y = 0;
          break;
        case "center-v":
          targetLayer.y = (H - layerH) / 2;
          break;
        case "bottom":
          targetLayer.y = H - layerH;
          break;
      }
    }

    if (layerManager) {
      layerManager.render();
    }

    eventBus.emit("layer:position-changed", {
      layer: targetLayer,
      type,
      x: targetLayer.x,
      y: targetLayer.y,
    });

    if (onPositionChange) {
      onPositionChange(type, targetLayer);
    }
  },
};
