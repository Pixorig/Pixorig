/**
 * Text Align Module - TSX Real DOM
 * Quản lý căn lề chữ (Text Align):
 * - Cố định: Left, Center, Right
 * - Theo hướng ngôn ngữ (LTR / RTL): Start, End
 * - Tính năng bổ sung: Justify (Bật / Tắt căn đều 2 bên)
 */

import { h } from "../ui/jsx";
import { PanelHeader } from "../ui/PanelHeader";
import { LayerManager, Layer } from "../core/layer";
import { TextTransform, resolveEffectiveAlign } from "./text-transform";

export interface TextAlignOptions {
  layerManager: LayerManager;
  textTransform: TextTransform;
}

export class TextAlignModule {
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
      if (active && active.id !== 0) {
        layer = active;
      }
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

  open(containerGroup: HTMLElement): void {
    if (!containerGroup) return;

    if (!containerGroup.querySelector(".text-align-panel")) {
      containerGroup.dataset._savedInner = containerGroup.innerHTML;
    }

    const layer = this.getTargetLayer();
    const currentAlign: CanvasTextAlign = layer?.textAlign || "left";
    const isJustified = !!layer?.textJustify;

    const panelEl = (
      <div
        class="text-align-panel"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          userSelect: "none",
          padding: "12px 8px",
        }}
      ></div>
    ) as HTMLElement;

    const applyAlign = (align: CanvasTextAlign) => {
      const target = this.getTargetLayer();
      if (!target) return;
      if (target.textAlign === align) return;

      const bounds = this.textTransform.getTextBounds(target);
      if (bounds) {
        const textW = bounds.textWidth;
        const textStr = target.text || "";
        const oldEff = resolveEffectiveAlign(target.textAlign, textStr);
        const newEff = resolveEffectiveAlign(align, textStr);

        let x0 = target.x;
        if (oldEff === "center") {
          x0 = target.x - textW / 2;
        } else if (oldEff === "right") {
          x0 = target.x - textW;
        }

        if (newEff === "center") {
          target.x = x0 + textW / 2;
        } else if (newEff === "right") {
          target.x = x0 + textW;
        } else {
          target.x = x0;
        }
      }

      target.textAlign = align;
      this.redrawAndSync(target);
      this.open(containerGroup);
    };

    // Back Button
    const backBtn = PanelHeader({
      title: "Text Align",
      onBack: () => this.close(containerGroup),
      onReset: () => {
        const target = this.getTargetLayer();
        if (target) {
          target.textJustify = false;
          applyAlign("left");
        }
      },
    });
    panelEl.appendChild(backBtn);

    const toggleJustify = () => {
      const target = this.getTargetLayer();
      if (!target) return;
      target.textJustify = !target.textJustify;
      this.redrawAndSync(target);
      this.open(containerGroup);
    };

    // Helper tạo nút align
    const makeAlignBtn = (
      alignValue: CanvasTextAlign,
      label: string,
      iconSvg: Element
    ) => {
      const isActive = currentAlign === alignValue;
      return (
        <button
          type="button"
          style={{
            flex: "1",
            padding: "10px 6px",
            background: isActive ? "#00f260" : "#2a2a2a",
            border: `1px solid ${isActive ? "#00f260" : "#444"}`,
            borderRadius: "6px",
            color: isActive ? "#000" : "#fff",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            fontSize: "11px",
            fontWeight: isActive ? "bold" : "normal",
            transition: "all 0.15s ease",
          }}
          onClick={() => applyAlign(alignValue)}
        >
          {iconSvg}
          <span>{label}</span>
        </button>
      );
    };

    // --- Section 1: Fixed Alignment [Left, Center, Right] ---
    const fixedSection = (
      <div style={{ display: "flex", gap: "8px" }}>
        {makeAlignBtn(
          "left",
          "Left",
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M3 4h18v2H3V4zm0 5h12v2H3V9zm0 5h18v2H3v-2zm0 5h12v2H3v-2z"
            />
          </svg>
        )}
        {makeAlignBtn(
          "center",
          "Center",
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M3 4h18v2H3V4zm3 5h12v2H6V9zm-3 5h18v2H3v-2zm3 5h12v2H6v-2z"
            />
          </svg>
        )}
        {makeAlignBtn(
          "right",
          "Right",
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M3 4h18v2H3V4zm6 5h12v2H9V9zm-6 5h18v2H3v-2zm6 5h12v2H9v-2z"
            />
          </svg>
        )}
      </div>
    );
    panelEl.appendChild(fixedSection);

    // --- Section 2: Directional Alignment [Start, End] ---
    const directionalSection = (
      <div style={{ display: "flex", gap: "8px" }}>
        {makeAlignBtn(
          "start",
          "Start",
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M3 4h2v16H3V4zm5 3h13v2H8V7zm0 5h9v2H8v-2zm0 5h13v2H8v-2z"
            />
          </svg>
        )}
        {makeAlignBtn(
          "end",
          "End",
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M19 4h2v16h-2V4zM3 7h13v2H3V7zm4 5h9v2H7v-2zm-4 5h13v2H3v-2z"
            />
          </svg>
        )}
      </div>
    );
    panelEl.appendChild(directionalSection);

    // --- Section 3: Justify Toggle ---
    const justifyCard = (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 12px",
          background: isJustified ? "rgba(0, 242, 96, 0.08)" : "#242424",
          border: `1px solid ${isJustified ? "#00f260" : "#383838"}`,
          borderRadius: "8px",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        onClick={toggleJustify}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <svg viewBox="0 0 24 24" width="20" height="20" style={{ color: isJustified ? "#00f260" : "#fff" }}>
            <path
              fill="currentColor"
              d="M3 4h18v2H3V4zm0 5h18v2H3V9zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"
            />
          </svg>
          <span style={{ fontSize: "12px", fontWeight: "bold", color: isJustified ? "#00f260" : "#fff" }}>
            Justify
          </span>
        </div>

        {/* Toggle Switch Pill */}
        <div
          style={{
            width: "38px",
            height: "22px",
            borderRadius: "11px",
            background: isJustified ? "#00f260" : "#3a3a3a",
            position: "relative",
            transition: "background 0.2s ease",
          }}
        >
          <div
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              background: isJustified ? "#000" : "#888",
              position: "absolute",
              top: "2px",
              left: isJustified ? "18px" : "2px",
              transition: "left 0.2s ease, background 0.2s ease",
            }}
          />
        </div>
      </div>
    );
    panelEl.appendChild(justifyCard);

    containerGroup.innerHTML = "";
    containerGroup.appendChild(panelEl);
  }

  close(containerGroup: HTMLElement): void {
    if (!containerGroup) return;
    if (containerGroup.dataset._savedInner) {
      containerGroup.innerHTML = containerGroup.dataset._savedInner;
      delete containerGroup.dataset._savedInner;
    }
  }
}
