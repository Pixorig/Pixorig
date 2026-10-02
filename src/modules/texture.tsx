/**
 * Texture Module - TSX Real DOM
 * Manages surface texture pattern and scale for Layer
 */

import { h } from "../ui/jsx";
import { PanelHeader } from "../ui/PanelHeader";
import { SliderControl } from "../ui/SliderControl";
import { LayerManager, Layer } from "../core/layer";
import { TextTransform } from "../text/text-transform";

export class TextureModule {
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

  open(containerGroup: HTMLElement): void {
    if (!containerGroup) return;

    if (!containerGroup.querySelector(".texture-panel")) {
      containerGroup.dataset._savedInner = containerGroup.innerHTML;
    }

    const targetLayer = this.getTargetLayer();
    const hasImage = !!(targetLayer && targetLayer.textureImage);
    const scalePercent = targetLayer?.textureScale
      ? Math.round(targetLayer.textureScale * 100)
      : 100;

    const fileInput = (
      <input
        type="file"
        id="texture-file-input"
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
          const layer = this.getTargetLayer();
          if (layer) {
            layer.textureImage = img;
            layer._textureCacheCanvas = null; // Invalidate cache
            this.textTransform.redrawTextLayer(layer);
            this.layerManager.render();
            this.open(containerGroup); // Re-render panel
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });

    const uploadBtn = (
      <button
        id="texture-upload-btn"
        style={{
          flex: "1",
          background: "#2a2a2a",
          border: "1px solid #444",
          borderRadius: "4px",
          color: "#fff",
          padding: "6px 10px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          fontSize: "12px",
        }}
        onClick={() => fileInput.click()}
      >
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path
            fill="currentColor"
            d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"
          />
        </svg>
        <span>Upload</span>
      </button>
    );

    const deleteBtn = (
      <button
        id="texture-delete-btn"
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
          gap: "4px",
          fontSize: "12px",
        }}
        disabled={!hasImage}
        onClick={() => {
          const layer = this.getTargetLayer();
          if (layer) {
            layer.textureImage = null;
            layer._textureCacheCanvas = null; // Invalidate cache
            this.textTransform.redrawTextLayer(layer);
            this.layerManager.render();
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

    const backBtn = PanelHeader({
      title: "Texture",
      onBack: () => this.close(containerGroup),
      onReset: () => {
        const layer = this.getTargetLayer();
        if (layer) {
          layer.textureImage = null;
          layer.textureScale = 1;
          layer._textureCacheCanvas = null;
          this.textTransform.redrawTextLayer(layer);
          this.layerManager.render();
          this.open(containerGroup);
        }
      },
    });

    const sliderControlEl = SliderControl({
      label: "Scale",
      value: scalePercent,
      min: 10,
      max: 200,
      btnStep: 5,
      unit: "%",
      onChange: (val) => {
        const layer = this.getTargetLayer();
        if (layer) {
          layer.textureScale = val / 100;
          this.textTransform.redrawTextLayer(layer);
          this.layerManager.render();
        }
      },
    });

    const panelEl = (
      <div
        class="texture-panel"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          userSelect: "none",
          padding: "12px 8px",
        }}
      >
        {backBtn}
        <div style={{ display: "flex", gap: "8px" }}>
          {uploadBtn}
          {fileInput}
          {deleteBtn}
        </div>
        {hasImage && sliderControlEl}
      </div>
    );

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
