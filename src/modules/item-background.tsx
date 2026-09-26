/**
 * Item Background Module - TSX Real DOM
 * Manages background (Color / Image) for element layers (text, shape, etc.)
 * Includes 4-way padding and border-radius
 */

import { h } from "../ui/jsx";
import { SliderControl } from "../ui/SliderControl";
import { TabBar } from "../ui/TabBar";
import { LayerManager, Layer } from "../core/layer";
import { TextTransform, TextBounds } from "../text/text-transform";
import { ColorModule } from "./color";

export class ItemBackgroundModule {
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
    return layer ?? null;
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

  private getBounds(): TextBounds | null {
    const layer = this.getTargetLayer();
    if (!layer) return null;
    return this.textTransform.getTextBounds(layer);
  }

  open(containerGroup: HTMLElement): void {
    if (!containerGroup) return;

    if (!containerGroup.querySelector(".item-bg-panel")) {
      containerGroup.dataset._savedInner = containerGroup.innerHTML;
    }

    const currentTab: "color" | "image" = "color";

    const panelEl = (
      <div
        class="item-bg-panel"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          userSelect: "none",
          padding: "12px 8px",
        }}
      ></div>
    ) as HTMLElement;

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
      <div class="item-bg-content"></div>
    ) as HTMLElement;

    const renderContent = (tab: "color" | "image") => {
      contentContainer.innerHTML = "";
      if (tab === "color") {
        contentContainer.appendChild(this.renderColorContent(containerGroup));
      } else {
        contentContainer.appendChild(this.renderImageContent(containerGroup));
      }
    };

    // Tabs: Color | Image
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

    // Padding sliders + Radius
    panelEl.appendChild(this.renderPaddingAndRadius(containerGroup));

    containerGroup.innerHTML = "";
    containerGroup.appendChild(panelEl);

    // Initial content
    renderContent(currentTab);
  }

  private renderColorContent(containerGroup: HTMLElement): HTMLElement {
    const layer = this.getTargetLayer();
    const hasColor = !!(layer && layer.itemBgColor);

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
          const textPropsGroup = containerGroup;
          textPropsGroup.dataset._savedInner_bg = textPropsGroup.innerHTML;

          ColorModule.open(textPropsGroup, {
            layerManager: this.layerManager,
            onColorChange: (color) => {
              const l = this.getTargetLayer();
              if (!l) return;
              // Clear image when color is set
              l.itemBgImage = null;
              if (typeof color === "string") {
                l.itemBgColor = color;
              } else if (typeof color === "object" && color !== null) {
                const fill = color as any;
                if (fill.kind === "solid") {
                  l.itemBgColor = fill.hex;
                } else {
                  l.itemBgColor = fill;
                }
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
            l.itemBgColor = null;
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
    const hasImage = !!(layer && layer.itemBgImage);

    const fileInput = (
      <input
        type="file"
        accept="image/*"
        style={{ display: "none" }}
      />
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
            // Clear color when image is set
            l.itemBgColor = null;
            l.itemBgImage = img;
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
            l.itemBgImage = null;
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

  private renderPaddingAndRadius(_containerGroup: HTMLElement): HTMLElement {
    const layer = this.getTargetLayer();
    const bounds = this.getBounds();

    // Padding value 0 = bounding box edge (no extra space)
    // Negative = shrink inward (min: -50% of BB dimension)
    // Positive = expand outward (max: +150% of BB dimension)
    const bbW = bounds ? bounds.width : 100;
    const bbH = bounds ? bounds.height : 50;

    const hMin = -Math.floor(bbW * 0.5);
    const hMax = Math.ceil(bbW * 1.5);
    const vMin = -Math.floor(bbH * 0.5);
    const vMax = Math.ceil(bbH * 1.5);

    const currentLeft = layer?.itemBgPaddingLeft ?? 0;
    const currentRight = layer?.itemBgPaddingRight ?? 0;
    const currentTop = layer?.itemBgPaddingTop ?? 0;
    const currentBottom = layer?.itemBgPaddingBottom ?? 0;
    const currentRadius = layer?.itemBgRadius ?? 0;

    const updatePadding = (side: string, val: number) => {
      const l = this.getTargetLayer();
      if (!l) return;
      switch (side) {
        case "left": l.itemBgPaddingLeft = Math.round(val); break;
        case "right": l.itemBgPaddingRight = Math.round(val); break;
        case "top": l.itemBgPaddingTop = Math.round(val); break;
        case "bottom": l.itemBgPaddingBottom = Math.round(val); break;
      }
      this.redrawAndSync(l);
    };

    const leftSlider = SliderControl({
      label: "Left padding",
      value: currentLeft,
      min: hMin,
      max: hMax,
      sliderMin: hMin,
      sliderMax: hMax,
      btnStep: 1,
      onChange: (val) => updatePadding("left", val),
    });

    const rightSlider = SliderControl({
      label: "Right padding",
      value: currentRight,
      min: hMin,
      max: hMax,
      sliderMin: hMin,
      sliderMax: hMax,
      btnStep: 1,
      onChange: (val) => updatePadding("right", val),
    });

    const topSlider = SliderControl({
      label: "Top padding",
      value: currentTop,
      min: vMin,
      max: vMax,
      sliderMin: vMin,
      sliderMax: vMax,
      btnStep: 1,
      onChange: (val) => updatePadding("top", val),
    });

    const bottomSlider = SliderControl({
      label: "Bottom padding",
      value: currentBottom,
      min: vMin,
      max: vMax,
      sliderMin: vMin,
      sliderMax: vMax,
      btnStep: 1,
      onChange: (val) => updatePadding("bottom", val),
    });

    const radiusSlider = SliderControl({
      label: "Radius",
      value: currentRadius,
      min: 0,
      max: 100,
      sliderMin: 0,
      sliderMax: 100,
      btnStep: 1,
      onChange: (val) => {
        const l = this.getTargetLayer();
        if (l) {
          l.itemBgRadius = Math.round(val);
          this.redrawAndSync(l);
        }
      },
    });

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {leftSlider}
        {rightSlider}
        {topSlider}
        {bottomSlider}
        {radiusSlider}
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
