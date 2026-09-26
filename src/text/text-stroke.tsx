/**
 * Text Stroke Module - TSX Real DOM
 * Outline/stroke cho text layer
 */

import { h } from "../ui/jsx";
import { SliderControl } from "../ui/SliderControl";
import { TabBar } from "../ui/TabBar";
import { LayerManager, Layer } from "../core/layer";
import { TextTransform } from "./text-transform";
import { ColorModule } from "../modules/color";

export class TextStrokeModule {
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

  private redrawAndSync(layer: Layer): void {
    this.textTransform.redrawTextLayer(layer);
    this.layerManager.render();
    if (this.textTransform.selectedLayer === layer) {
      this.textTransform.drawSelectionOverlay(layer);
    }
  }

  open(containerGroup: HTMLElement): void {
    if (!containerGroup) return;

    if (!containerGroup.querySelector(".stroke-panel")) {
      containerGroup.dataset._savedInner = containerGroup.innerHTML;
    }

    const layer = this.getTargetLayer();
    const currentTab: "color" | "image" = "color";
    const currentWidth = layer?.strokeWidth ?? 0;

    const panelEl = (
      <div
        class="stroke-panel"
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
    const backBtn = (
      <button
        type="button"
        class="sub-item"
        style={{ marginBottom: "4px" }}
        onClick={() => this.close(containerGroup)}
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
    panelEl.appendChild(backBtn);

    const contentContainer = (
      <div class="stroke-content"></div>
    ) as HTMLElement;

    const renderContent = (tab: "color" | "image") => {
      contentContainer.innerHTML = "";
      if (tab === "color") {
        contentContainer.appendChild(this.renderColorContent(containerGroup));
      } else {
        contentContainer.appendChild(this.renderImageContent(containerGroup));
      }
    };

    const tabBarEl = TabBar({
      tabs: [
        { id: "color", label: "Color" },
        { id: "image", label: "Image" },
      ],
      active: currentTab,
      onChange: (id) => renderContent(id as "color" | "image"),
    });

    panelEl.appendChild(tabBarEl);
    panelEl.appendChild(contentContainer);
    renderContent(currentTab);

    // Width slider
    const widthSlider = SliderControl({
      label: "Stroke width",
      value: currentWidth,
      min: 0,
      max: 50,
      sliderMin: 0,
      sliderMax: 50,
      btnStep: 1,
      onChange: (val) => {
        const l = this.getTargetLayer();
        if (!l) return;
        l.strokeWidth = Math.round(val);
        this.redrawAndSync(l);
      },
    });
    panelEl.appendChild(widthSlider);

    containerGroup.innerHTML = "";
    containerGroup.appendChild(panelEl);
  }

  private renderColorContent(containerGroup: HTMLElement): HTMLElement {
    const layer = this.getTargetLayer();
    const hasColor = !!(layer && layer.strokeColor);

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
          containerGroup.dataset._savedInner_stroke = containerGroup.innerHTML;
          ColorModule.open(containerGroup, {
            layerManager: this.layerManager,
            onColorChange: (color) => {
              const l = this.getTargetLayer();
              if (!l) return;
              l.strokeImage = null;
              if (typeof color === "string") {
                l.strokeColor = color;
              } else if (typeof color === "object" && color !== null) {
                const fill = color as any;
                l.strokeColor = fill.kind === "solid" ? fill.hex : fill;
              }
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
            l.strokeColor = null;
            this.redrawAndSync(l);
            this.open(containerGroup);
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

    return (
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {selectColorBtn}
        {deleteBtn}
      </div>
    ) as HTMLElement;
  }

  private renderImageContent(containerGroup: HTMLElement): HTMLElement {
    const layer = this.getTargetLayer();
    const hasImage = !!(layer && layer.strokeImage);

    const fileInput = (
      <input type="file" accept="image/*" style={{ display: "none" }} />
    ) as HTMLInputElement;

    fileInput.addEventListener("change", (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const l = this.getTargetLayer();
          if (l) {
            l.strokeColor = null;
            l.strokeImage = img;
            this.redrawAndSync(l);
            this.open(containerGroup);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });

    const selectImageBtn = (
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
        onClick={() => fileInput.click()}
      >
        Select Image
      </button>
    );

    const deleteBtn = (
      <button
        type="button"
        style={{
          background: "#2a2a2a",
          border: "1px solid #444",
          borderRadius: "4px",
          color: hasImage ? "#ff4d4d" : "#666",
          padding: "6px 10px",
          cursor: hasImage ? "pointer" : "not-allowed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        disabled={!hasImage}
        onClick={() => {
          const l = this.getTargetLayer();
          if (l) {
            l.strokeImage = null;
            this.redrawAndSync(l);
            this.open(containerGroup);
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

    return (
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {selectImageBtn}
        {fileInput}
        {deleteBtn}
      </div>
    ) as HTMLElement;
  }

  close(containerGroup: HTMLElement): void {
    if (!containerGroup) return;
    if (containerGroup.dataset._savedInner) {
      containerGroup.innerHTML = containerGroup.dataset._savedInner;
      delete containerGroup.dataset._savedInner;
    }
  }
}
