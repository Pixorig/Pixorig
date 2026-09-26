/**
 * Text Spacing Module - TSX Real DOM
 * Quản lý khoảng cách ký tự (Letters) và khoảng cách từ (Words)
 */

import { h } from "../ui/jsx";
import { LayerManager, Layer } from "../core/layer";
import { TextTransform } from "./text-transform";
import { SliderControl } from "../ui/SliderControl";
import { TabBar } from "../ui/TabBar";

type SpacingTab = "letters" | "words";

export class TextSpacingModule {
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

  open(containerGroup: HTMLElement): void {
    if (!containerGroup) return;

    if (!containerGroup.querySelector(".spacing-panel")) {
      containerGroup.dataset._savedInner = containerGroup.innerHTML;
    }

    const layer = this.getTargetLayer();
    const currentLetters = layer?.letterSpacing ?? 0;
    const currentWords = layer?.wordSpacing ?? 0;

    const panelEl = (
      <div
        class="spacing-panel"
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
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5" />
          <path d="M11 18l-6-6 6-6" />
        </svg>
        <span>Back</span>
      </button>
    );
    panelEl.appendChild(backBtn);

    let activeTab: SpacingTab = "letters";

    const sliderWrapper = (
      <div style={{ marginTop: "4px" }}></div>
    ) as HTMLElement;

    const renderSlider = (tab: SpacingTab) => {
      sliderWrapper.innerHTML = "";
      const isLetters = tab === "letters";
      const currentVal = isLetters ? currentLetters : currentWords;

      const sliderEl = SliderControl({
        label: "Spacing",
        value: currentVal,
        min: -30,
        max: 100,
        sliderMin: -30,
        sliderMax: 100,
        btnStep: 1,
        onChange: (val) => {
          const target = this.getTargetLayer();
          if (!target) return;
          if (isLetters) {
            target.letterSpacing = val;
          } else {
            target.wordSpacing = val;
          }
          this.redrawAndSync(target);
        },
      });

      sliderWrapper.appendChild(sliderEl);
    };

    const tabBarEl = TabBar<SpacingTab>({
      tabs: [
        { id: "letters", label: "Letters" },
        { id: "words", label: "Words" },
      ],
      active: activeTab,
      onChange: (id) => {
        activeTab = id;
        renderSlider(id);
      },
    });

    panelEl.appendChild(tabBarEl);
    panelEl.appendChild(sliderWrapper);
    renderSlider(activeTab);

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
