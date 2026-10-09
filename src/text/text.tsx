/**
 * Text Module - TypeScript chuẩn + TSX
 * Tách biệt rõ ràng:
 * 1. Data Layer Logic (createNewTextLayer, updateTextContent, updateTextStyle, moveTextLayer)
 * 2. UI Sub-sidebar Panels Logic (Size, Padding, Style, Relative Position, Rotate, Curve, Opacity, Texture, Color)
 */

import { Layer, LayerManager, TextDecoration } from "../core/layer";
import { eventBus } from "../core/event-bus";
import { mountColorPanel } from "../panels/common/color-panel";
import { mountTexturePanel } from "../panels/common/texture-panel";
import { mountText3DRotatePanel } from "../panels/text/text-3d-rotate-panel";
import { mountText3DPanel } from "../panels/text/text-3d-panel";
import { mountText3DShadowPanel } from "../panels/text/text-3d-shadow-panel";
import { TextTransform } from "./text-transform";
import { mountTextEmbossPanel } from "../panels/text/text-emboss-panel";
import { mountTextPerspectivePanel } from "../panels/text/text-perspective-panel";
import { mountTextReflectionPanel } from "../panels/text/text-reflection-panel";
import { mountTextSizePanel } from "../panels/text/text-size-panel";
import { mountTextPaddingPanel } from "../panels/text/text-padding-panel";
import { mountRelativePositionPanel } from "../panels/common/relative-position-panel";
import { mountOpacityPanel } from "../panels/common/opacity-panel";
import { mountRotatePanel } from "../panels/common/rotate-panel";
import { mountTextFontPanel } from "../panels/text/text-font-panel";
import { mountTextStylePanel } from "../panels/text/text-style-panel";
import { mountTextCurvePanel } from "../panels/text/text-curve-panel";
import { mountItemBackgroundPanel } from "../panels/common/item-background-panel";
import { mountTextAlignPanel } from "../panels/text/text-align-panel";
import { mountTextSpacingPanel } from "../panels/text/text-spacing-panel";
import { mountTextLineSpacingPanel } from "../panels/text/text-line-spacing-panel";
import { mountTextStrokePanel } from "../panels/text/text-stroke-panel";
import { mountTextShadowPanel } from "../panels/text/text-shadow-panel";
import { mountTextInnerShadowPanel } from "../panels/text/text-inner-shadow-panel";

export interface TextStyleOptions {
  fontSize?: number;
  fontFamily?: string;
  fontColor?: string | any;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textDecoration?: TextDecoration;
  underline?: boolean;
}

// ==========================================
// 1. DATA LAYER LOGIC
// ==========================================

export class TextDataService {
  private layerManager: LayerManager;
  private textTransform: TextTransform | null = null;

  constructor(layerManager: LayerManager, textTransform?: TextTransform) {
    this.layerManager = layerManager;
    if (textTransform) {
      this.textTransform = textTransform;
    }
  }

  setTextTransform(textTransform: TextTransform): void {
    this.textTransform = textTransform;
  }

  /**
   * Create new text layer and activate editor
   */
  createNewTextLayer(
    text = "Sample Text",
    x: number | null = null,
    y: number | null = null,
    fontSize = 48,
    fontFamily = "Arial",
    color = "#000000"
  ): Layer {
    const canvas = this.layerManager.mainCanvas;
    const centerX = x !== null ? x : canvas.width / 2;
    const centerY = y !== null ? y : canvas.height / 2;

    const textLayer = this.layerManager.createTextLayer(
      text,
      centerX,
      centerY,
      fontSize,
      fontFamily,
      color
    );

    this.layerManager.render();

    if (this.textTransform) {
      this.textTransform.selectedLayer = textLayer;
      this.layerManager.setActiveLayer(textLayer.id);
      this.layerManager.render();
      this.textTransform.drawSelectionOverlay(textLayer);
      this.textTransform.startTextEditing(textLayer);
    }

    eventBus.emit("text:created", textLayer);
    return textLayer;
  }

  /**
   * Update layer text content
   */
  updateTextContent(textLayer: Layer, newText: string): void {
    if (!textLayer || textLayer.type !== "text") return;

    textLayer.text = newText;
    const safeName = newText.replace(/\s+/g, " ").trim();
    textLayer.name =
      safeName.length > 20 ? safeName.substring(0, 20) + "..." : safeName || "Text";

    if (this.textTransform) {
      this.textTransform.redrawTextLayer(textLayer);
    }
    this.layerManager.render();
    eventBus.emit("layer:changed", this.layerManager.getLayersList());
    // Nội dung text đổi => các mốc snapshot cũ không còn đúng
    eventBus.emit("text:content-changed", { layerId: textLayer.id });
  }

  /**
   * Update style properties (size, font, color, decoration) of text layer
   */
  updateTextStyle(textLayer: Layer, options: TextStyleOptions = {}): void {
    if (!textLayer || textLayer.type !== "text") return;

    if (options.fontSize !== undefined) textLayer.fontSize = options.fontSize;
    if (options.fontFamily !== undefined) textLayer.fontFamily = options.fontFamily;
    if (options.fontColor !== undefined) textLayer.fontColor = options.fontColor;
    if (options.fontWeight !== undefined) textLayer.fontWeight = options.fontWeight;
    if (options.fontStyle !== undefined) textLayer.fontStyle = options.fontStyle;
    if (options.textDecoration !== undefined) {
      textLayer.textDecoration = options.textDecoration;
      textLayer.underline = options.textDecoration === "underline";
    }

    if (this.textTransform) {
      this.textTransform.redrawTextLayer(textLayer);
    }
    this.layerManager.render();
    if (this.textTransform?.selectedLayer === textLayer) {
      this.textTransform.drawSelectionOverlay(textLayer);
    }
  }

  /**
   * Move text layer coordinates
   */
  moveTextLayer(textLayer: Layer, newX: number, newY: number): void {
    if (!textLayer || textLayer.type !== "text") return;

    textLayer.x = newX;
    textLayer.y = newY;

    if (this.textTransform) {
      this.textTransform.redrawTextLayer(textLayer);
    }
    this.layerManager.render();
    if (this.textTransform?.selectedLayer === textLayer) {
      this.textTransform.drawSelectionOverlay(textLayer);
    }
  }
}

// ==========================================
// 2. UI PROPERTY PANELS CONTROLLER
// ==========================================

export class TextUIController {
  private layerManager: LayerManager;
  private textTransform: TextTransform | null = null;
  private dataService: TextDataService;

  constructor(
    layerManager: LayerManager,
    dataService: TextDataService,
    textTransform?: TextTransform
  ) {
    this.layerManager = layerManager;
    this.dataService = dataService;
    if (textTransform) {
      this.textTransform = textTransform;
    }
    this.initEventListeners();
    this.initEventBus();
  }

  setTextTransform(textTransform: TextTransform): void {
    this.textTransform = textTransform;
  }

  private initEventListeners(): void {
    document.addEventListener("click", (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest(
        '[data-sub="text-new"]'
      );
      if (target) {
        this.showTextProperties();
        this.dataService.createNewTextLayer();
      }

      const backBtn = (e.target as HTMLElement | null)?.closest(
        '[data-sub="text-props-back"]'
      );
      if (backBtn) {
        this.hideTextProperties();
      }

      const propItem = (e.target as HTMLElement | null)?.closest("[data-prop]");
      if (propItem) {
        const propType = propItem.getAttribute("data-prop");
        if (propType) {
          this.handlePropertyClick(propType);
        }
      }
    });
  }

  private initEventBus(): void {
    eventBus.on("text:show-properties", () => this.showTextProperties());
    eventBus.on("text:hide-properties", () => this.hideTextProperties());
  }

  showTextProperties(): void {
    document
      .querySelectorAll(".sub-group")
      .forEach((g) => g.classList.add("hidden"));

    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;

    if (textPropsGroup && textPropsGroup.dataset._savedInner) {
      textPropsGroup.innerHTML = textPropsGroup.dataset._savedInner;
      delete textPropsGroup.dataset._savedInner;
    }

    if (textPropsGroup) textPropsGroup.classList.remove("hidden");
  }

  hideTextProperties(): void {
    document
      .querySelectorAll(".sub-group")
      .forEach((g) => g.classList.add("hidden"));

    const textGroup = document.querySelector('.sub-group[data-section="text"]');
    if (textGroup) textGroup.classList.remove("hidden");
  }

  handlePropertyClick(propType: string): void {
    // Lưu HTML gốc của props list đúng MỘT lần, trước khi panel nào ghi đè lên nó.
    // (Trước đây mỗi openXxxPanel() tự lưu, dẫn đến lưu nhầm HTML của panel khác
    //  và nút Back của panel này trả về panel kia.)
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (
      textPropsGroup &&
      !textPropsGroup.dataset._savedInner &&
      !textPropsGroup.querySelector(
        ".size-panel, .preact-size-panel-wrapper, .padding-panel, .preact-padding-panel-wrapper, .font-panel, .preact-font-panel-wrapper, .style-panel, .preact-style-panel-wrapper, .curve-panel, .preact-curve-panel-wrapper, .relative-position-panel, .preact-relative-position-panel-wrapper, .opacity-panel, .preact-opacity-panel-wrapper, .rotate-panel, .preact-rotate-panel-wrapper, .color-panel, .item-bg-panel, .preact-item-bg-panel-wrapper, .text-align-panel, .preact-align-panel-wrapper, .spacing-panel, .preact-spacing-panel-wrapper, .line-spacing-panel, .preact-line-spacing-panel-wrapper, .stroke-panel, .preact-stroke-panel-root, .shadow-panel, .preact-shadow-panel-root, .inner-shadow-panel, .preact-inner-shadow-panel-root, .preact-emboss-panel-wrapper, .preact-perspective-panel-wrapper, .preact-reflection-panel-wrapper, .preact-3d-rotate-panel-wrapper, .preact-3d-text-panel-wrapper, .preact-3d-shadow-panel-wrapper, .preact-texture-panel-wrapper, .texture-panel"
      )
    ) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    switch (propType) {
      case "relative-position":
        this.openRelativePositionPanel();
        break;
      case "size":
        this.openSizePanel();
        break;
      case "padding":
        this.openPaddingPanel();
        break;
      case "color":
        this.openColorPanel();
        break;
      case "texture":
        this.openTexturePanel();
        break;
      case "opacity":
        this.openOpacityPanel();
        break;
      case "rotate":
        this.openRotatePanel();
        break;
      case "style":
        this.openStylePanel();
        break;
      case "curve":
        this.openCurvePanel();
        break;
      case "background":
        this.openBackgroundPanel();
        break;
      case "align":
        this.openAlignPanel();
        break;
      case "spacing":
        this.openSpacingPanel();
        break;
      case "line-spacing":
        this.openLineSpacingPanel();
        break;
      case "stroke":
        this.openStrokePanel();
        break;
      case "shadow":
        this.openShadowPanel();
        break;
      case "inner-shadow":
        this.openInnerShadowPanel();
        break;
      case "emboss":
        this.openEmbossPanel();
        break;
      case "perspective":
        this.openPerspectivePanel();
        break;
      case "3d-rotate":
        this.open3DRotatePanel();
        break;
      case "3d-text":
        this.open3DTextPanel();
        break;
      case "3d-shadow":
        this.open3DShadowPanel();
        break;
      case "reflection":
        this.openReflectionPanel();
        break;
      case "font":
        this.openFontPanel();
        break;
    }
  }

  private getActiveTextLayer(): Layer | undefined {
    let layer = this.textTransform ? this.textTransform.selectedLayer : null;
    if (!layer || layer.id === 0) {
      layer = this.layerManager.getActiveLayer() || null;
      if (layer && layer.id === 0) {
        layer = null;
      }
    }
    return layer?.type === "text" ? layer : undefined;
  }

  private redrawAndSync(layer?: Layer): void {
    const target = layer || this.getActiveTextLayer();
    if (!target) return;
    if (this.textTransform) {
      this.textTransform.redrawTextLayer(target);
    }
    this.layerManager.render();
    if (this.textTransform && this.textTransform.selectedLayer === target) {
      this.textTransform.drawSelectionOverlay(target);
    }
  }

  /**
   * Quay về danh sách property (props list) từ bất kỳ panel nào.
   * Dùng _savedInner đã lưu một lần duy nhất trong handlePropertyClick —
   * luôn là menu gốc, không bao giờ là HTML của panel khác.
   */
  restorePropsList(textPropsGroup: HTMLElement): void {
    if (textPropsGroup.dataset._savedInner) {
      textPropsGroup.innerHTML = textPropsGroup.dataset._savedInner;
      // Giữ lại _savedInner (không delete) để Back từ panel khác vẫn về đúng menu gốc.
    }
  }

  openRelativePositionPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (
      !textPropsGroup.querySelector(".relative-position-panel") &&
      !textPropsGroup.querySelector(".preact-relative-position-panel-wrapper")
    ) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();

    mountRelativePositionPanel(
      textPropsGroup,
      targetLayer,
      {
        layerManager: this.layerManager,
        onPositionChange: () => this.redrawAndSync(),
      },
      () => {
        this.restorePropsList(textPropsGroup);
      }
    );
  }

  openSizePanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (
      !textPropsGroup.querySelector(".size-panel") &&
      !textPropsGroup.querySelector(".preact-size-panel-wrapper")
    ) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();

    mountTextSizePanel(
      textPropsGroup,
      targetLayer,
      {
        getActiveTextLayer: () => this.getActiveTextLayer(),
        redrawAndSync: (layer) => this.redrawAndSync(layer),
      },
      () => {
        this.restorePropsList(textPropsGroup);
      }
    );
  }

  openPaddingPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (
      !textPropsGroup.querySelector(".padding-panel") &&
      !textPropsGroup.querySelector(".preact-padding-panel-wrapper")
    ) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();

    mountTextPaddingPanel(
      textPropsGroup,
      targetLayer,
      {
        getActiveTextLayer: () => this.getActiveTextLayer(),
        redrawAndSync: (layer) => this.redrawAndSync(layer),
      },
      () => {
        this.restorePropsList(textPropsGroup);
      }
    );
  }

  openColorPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (
      !textPropsGroup.querySelector(".color-panel") &&
      !textPropsGroup.querySelector(".preact-color-panel-wrapper")
    ) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const active = this.getActiveTextLayer();
    mountColorPanel(
      textPropsGroup,
      {
        layerManager: this.layerManager,
        targetLayer: active,
        onColorChange: (newColor) => {
          if (active) {
            active.fontColor = newColor;
            this.redrawAndSync(active);
          }
        },
      },
      () => {
        this.restorePropsList(textPropsGroup);
      }
    );
  }

  openTexturePanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (
      !textPropsGroup.querySelector(".texture-panel") &&
      !textPropsGroup.querySelector(".preact-texture-panel-wrapper")
    ) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();

    mountTexturePanel(
      textPropsGroup,
      targetLayer,
      {
        getActiveLayer: () => this.getActiveTextLayer(),
        redrawAndSync: (layer) => this.redrawAndSync(layer),
      },
      () => {
        this.restorePropsList(textPropsGroup);
      }
    );
  }

  openOpacityPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (
      !textPropsGroup.querySelector(".opacity-panel") &&
      !textPropsGroup.querySelector(".preact-opacity-panel-wrapper")
    ) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();

    mountOpacityPanel(
      textPropsGroup,
      targetLayer,
      {
        layerManager: this.layerManager,
        onOpacityChange: () => this.redrawAndSync(),
      },
      () => {
        this.restorePropsList(textPropsGroup);
      }
    );
  }

  openRotatePanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (
      !textPropsGroup.querySelector(".rotate-panel") &&
      !textPropsGroup.querySelector(".preact-rotate-panel-wrapper")
    ) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();

    mountRotatePanel(
      textPropsGroup,
      targetLayer,
      {
        layerManager: this.layerManager,
        onAngleChange: () => this.redrawAndSync(),
      },
      () => {
        this.restorePropsList(textPropsGroup);
      }
    );
  }

  openCurvePanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.querySelector(".curve-panel") && !textPropsGroup.querySelector(".preact-curve-panel-wrapper")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();
    mountTextCurvePanel(
      textPropsGroup,
      targetLayer,
      {
        getActiveTextLayer: () => this.getActiveTextLayer(),
        redrawAndSync: (layer) => this.redrawAndSync(layer),
      },
      () => {
        this.restorePropsList(textPropsGroup);
      }
    );
  }

  openBackgroundPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.querySelector(".item-bg-panel") && !textPropsGroup.querySelector(".preact-item-bg-panel-wrapper")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();
    mountItemBackgroundPanel(
      textPropsGroup,
      targetLayer,
      {
        getActiveLayer: () => this.getActiveTextLayer(),
        redrawAndSync: (layer) => this.redrawAndSync(layer),
        getBounds: (layer) => this.textTransform ? this.textTransform.getTextBounds(layer) : null,
      },
      () => {
        this.restorePropsList(textPropsGroup);
      }
    );
  }

  openAlignPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.querySelector(".text-align-panel") && !textPropsGroup.querySelector(".preact-align-panel-wrapper")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();
    mountTextAlignPanel(
      textPropsGroup,
      targetLayer,
      {
        getActiveTextLayer: () => this.getActiveTextLayer(),
        redrawAndSync: (layer) => this.redrawAndSync(layer),
        getBounds: (layer) => this.textTransform ? this.textTransform.getTextBounds(layer) : null,
      },
      () => {
        this.restorePropsList(textPropsGroup);
      }
    );
  }

  openSpacingPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.querySelector(".spacing-panel") && !textPropsGroup.querySelector(".preact-spacing-panel-wrapper")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();
    mountTextSpacingPanel(
      textPropsGroup,
      targetLayer,
      {
        getActiveTextLayer: () => this.getActiveTextLayer(),
        redrawAndSync: (layer) => this.redrawAndSync(layer),
      },
      () => {
        this.restorePropsList(textPropsGroup);
      }
    );
  }

  openLineSpacingPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.querySelector(".line-spacing-panel") && !textPropsGroup.querySelector(".preact-line-spacing-panel-wrapper")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();
    mountTextLineSpacingPanel(
      textPropsGroup,
      targetLayer,
      {
        getActiveTextLayer: () => this.getActiveTextLayer(),
        redrawAndSync: (layer) => this.redrawAndSync(layer),
      },
      () => {
        this.restorePropsList(textPropsGroup);
      }
    );
  }

  openStrokePanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.querySelector(".stroke-panel") && !textPropsGroup.querySelector(".preact-stroke-panel-root")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();
    mountTextStrokePanel(
      textPropsGroup,
      targetLayer,
      {
        getActiveTextLayer: () => this.getActiveTextLayer(),
        redrawAndSync: (layer) => this.redrawAndSync(layer),
        layerManager: this.layerManager,
      },
      () => {
        this.restorePropsList(textPropsGroup);
      }
    );
  }

  openShadowPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.querySelector(".shadow-panel") && !textPropsGroup.querySelector(".preact-shadow-panel-root")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();
    mountTextShadowPanel(
      textPropsGroup,
      targetLayer,
      {
        getActiveTextLayer: () => this.getActiveTextLayer(),
        redrawAndSync: (layer) => this.redrawAndSync(layer),
        layerManager: this.layerManager,
      },
      () => {
        this.restorePropsList(textPropsGroup);
      }
    );
  }

  openInnerShadowPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.querySelector(".inner-shadow-panel") && !textPropsGroup.querySelector(".preact-inner-shadow-panel-root")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();
    mountTextInnerShadowPanel(
      textPropsGroup,
      targetLayer,
      {
        getActiveTextLayer: () => this.getActiveTextLayer(),
        redrawAndSync: (layer) => this.redrawAndSync(layer),
        layerManager: this.layerManager,
      },
      () => {
        this.restorePropsList(textPropsGroup);
      }
    );
  }

  openEmbossPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.querySelector(".preact-emboss-panel-wrapper")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();
    mountTextEmbossPanel(
      textPropsGroup,
      targetLayer,
      {
        getActiveTextLayer: () => this.getActiveTextLayer(),
        redrawAndSync: (layer) => this.redrawAndSync(layer),
      },
      () => {
        this.restorePropsList(textPropsGroup);
      }
    );
  }

  openPerspectivePanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.querySelector(".preact-perspective-panel-wrapper")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();
    mountTextPerspectivePanel(
      textPropsGroup,
      targetLayer,
      {
        getActiveTextLayer: () => this.getActiveTextLayer(),
        redrawAndSync: (layer) => this.redrawAndSync(layer),
        setPerspectiveMode: (active: boolean) => {
          if (this.textTransform) {
            this.textTransform.isPerspectiveMode = active;
            const l = this.getActiveTextLayer();
            if (l) this.textTransform.drawSelectionOverlay(l);
          }
        },
        resetActiveCorner: () => {
          if (this.textTransform) {
            this.textTransform.activePerspectiveCorner = null;
          }
        },
      },
      () => {
        this.restorePropsList(textPropsGroup);
      }
    );
  }

  open3DRotatePanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.querySelector(".preact-3d-rotate-panel-wrapper")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();
    mountText3DRotatePanel(
      textPropsGroup,
      targetLayer,
      {
        getActiveTextLayer: () => this.getActiveTextLayer(),
        redrawAndSync: (layer) => this.redrawAndSync(layer),
      },
      () => {
        this.restorePropsList(textPropsGroup);
      }
    );
  }

  open3DTextPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.querySelector(".preact-3d-text-panel-wrapper")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();
    mountText3DPanel(
      textPropsGroup,
      targetLayer,
      {
        getActiveTextLayer: () => this.getActiveTextLayer(),
        redrawAndSync: (layer) => this.redrawAndSync(layer),
        layerManager: this.layerManager,
      },
      () => {
        this.restorePropsList(textPropsGroup);
      }
    );
  }

  open3DShadowPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.querySelector(".preact-3d-shadow-panel-wrapper")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();
    mountText3DShadowPanel(
      textPropsGroup,
      targetLayer,
      {
        getActiveTextLayer: () => this.getActiveTextLayer(),
        redrawAndSync: (layer) => this.redrawAndSync(layer),
        layerManager: this.layerManager,
      },
      () => {
        this.restorePropsList(textPropsGroup);
      }
    );
  }

  openReflectionPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.querySelector(".preact-reflection-panel-wrapper")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();
    mountTextReflectionPanel(
      textPropsGroup,
      targetLayer,
      {
        getActiveTextLayer: () => this.getActiveTextLayer(),
        redrawAndSync: (layer) => this.redrawAndSync(layer),
      },
      () => {
        this.restorePropsList(textPropsGroup);
      }
    );
  }

  private openFontPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (
      !textPropsGroup.querySelector(".font-panel") &&
      !textPropsGroup.querySelector(".preact-font-panel-wrapper")
    ) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();

    mountTextFontPanel(
      textPropsGroup,
      targetLayer,
      {
        getTargetLayer: () => this.getActiveTextLayer(),
        redrawAndSync: (layer) => this.redrawAndSync(layer || undefined),
      },
      () => {
        this.restorePropsList(textPropsGroup);
      }
    );
  }

  openStylePanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.querySelector(".style-panel") && !textPropsGroup.querySelector(".preact-style-panel-wrapper")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();
    mountTextStylePanel(
      textPropsGroup,
      targetLayer,
      {
        getActiveTextLayer: () => this.getActiveTextLayer(),
        redrawAndSync: (layer) => this.redrawAndSync(layer),
      },
      () => {
        this.restorePropsList(textPropsGroup);
      }
    );
  }
}

/**
 * Legacy TextHandler compatibility wrapper
 */
export class TextHandler {
  dataService: TextDataService;
  uiController: TextUIController;

  constructor(layerManager: LayerManager, textTransform?: TextTransform) {
    this.dataService = new TextDataService(layerManager, textTransform);
    this.uiController = new TextUIController(
      layerManager,
      this.dataService,
      textTransform
    );

    (window as unknown as { textHandler?: TextHandler }).textHandler = this;
  }

  setTextTransform(textTransform: TextTransform): void {
    this.dataService.setTextTransform(textTransform);
    this.uiController.setTextTransform(textTransform);
  }

  showTextProperties(): void {
    this.uiController.showTextProperties();
  }

  hideTextProperties(): void {
    this.uiController.hideTextProperties();
  }

  createNewTextLayer(
    text = "Sample Text",
    x: number | null = null,
    y: number | null = null,
    fontSize = 48,
    fontFamily = "Arial",
    color = "#000000"
  ): Layer {
    return this.dataService.createNewTextLayer(
      text,
      x,
      y,
      fontSize,
      fontFamily,
      color
    );
  }

  updateTextContent(textLayer: Layer, newText: string): void {
    this.dataService.updateTextContent(textLayer, newText);
  }

  updateTextStyle(textLayer: Layer, styleOptions: TextStyleOptions = {}): void {
    this.dataService.updateTextStyle(textLayer, styleOptions);
  }

  moveTextLayer(textLayer: Layer, newX: number, newY: number): void {
    this.dataService.moveTextLayer(textLayer, newX, newY);
  }
}
