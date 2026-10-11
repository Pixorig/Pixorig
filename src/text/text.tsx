/**
 * Text Module - TypeScript chuẩn + TSX
 * Tách biệt rõ ràng:
 * 1. Data Layer Logic (createNewTextLayer, updateTextContent, updateTextStyle, moveTextLayer)
 * 2. UI Sub-sidebar Panels Logic (Size, Padding, Style, Relative Position, Rotate, Curve, Opacity, Texture, Color)
 */

import { Layer, LayerManager, TextDecoration } from "../core/layer";
import { eventBus } from "../core/event-bus";
import {
  mountWarmRotate3DPanel,
  mountWarmTextSizePanel,
  mountWarmPaddingPanel,
  mountWarmRelativePositionPanel,
  mountWarmRotatePanel,
  mountWarmCurvePanel,
  mountWarmLineSpacingPanel,
  mountWarmReflectionPanel,
  mountWarmPerspectivePanel,
  mountWarmColorPanel,
  mountWarmTexturePanel,
  mountWarmShadowPanel,
  mountWarmInnerShadowPanel,
  mountWarmStrokePanel,
  mountWarmSpacingPanel,
  mountWarmItemBackgroundPanel,
  mountWarmFontPanel,
  mountWarmStylePanel,
  mountWarmAlignPanel,
  mountWarmEmbossPanel,
  mountWarmText3DPanel,
  mountWarmText3DShadowPanel,
} from "@warmjs/ui";
import {
  ColorService,
  MONOCHROME_COLORS,
  type BackgroundFill,
} from "../core/layer/color-service";
import { TextureService } from "../core/layer/texture-service";
import { ItemBackgroundService } from "../core/layer/item-background-service";
import {
  TextShadowService,
  type TextShadowState,
} from "../core/text/text-shadow-service";
import {
  TextInnerShadowService,
  type TextInnerShadowState,
} from "../core/text/text-inner-shadow-service";
import {
  TextStrokeService,
  type TextStrokeState,
} from "../core/text/text-stroke-service";
import { TextFontService } from "../core/text/text-font-service";
import { RotateService } from "../core/layer/rotate-service";
import { PositionService } from "../core/layer/position-service";
import { TextCurveService } from "../core/text/text-curve-service";
import { TextSizeService } from "../core/text/text-size-service";
import { TextPaddingService } from "../core/text/text-padding-service";
import { TextSpacingService } from "../core/text/text-spacing-service";
import { Text3DRotateService } from "../core/text/text-3d-rotate-service";
import {
  TextReflectionService,
  type TextReflectionState,
} from "../core/text/text-reflection-service";
import { TextPerspectiveService } from "../core/text/text-perspective-service";
import { Text3DService } from "../core/text/text-3d-service";
import { Text3DShadowService } from "../core/text/text-3d-shadow-service";
import { TextTransform } from "./text-transform";
import { TextEmbossService } from "../core/text/text-emboss-service";
import { mountWarmOpacityPanel } from "@warmjs/ui";
import { OpacityService } from "../core/layer/opacity-service";
import { TextAlignService } from "../core/text/text-align-service";
import { TextStyleService } from "../core/text/text-style-service";

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
        ".size-panel, .padding-panel, .font-panel, .style-panel, .curve-panel, .relative-position-panel, .opacity-panel, .rotate-panel, .color-panel, .item-bg-panel, .text-align-panel, .spacing-panel, .line-spacing-panel, .stroke-panel, .shadow-panel, .inner-shadow-panel, .texture-panel, .warm-mount, .warm-opacity-panel-wrapper"
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

    if (!textPropsGroup.dataset._savedInner && !textPropsGroup.querySelector(".relative-position-panel") &&
      
      !textPropsGroup.querySelector(".warm-relative-position-panel-wrapper")
    ) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();

    mountWarmRelativePositionPanel(textPropsGroup, {
      onAlign: (type) =>
        PositionService.alignLayer(targetLayer, type, {
          layerManager: this.layerManager,
          onPositionChange: () => this.redrawAndSync(),
        }),
      onBack: () => {
        this.restorePropsList(textPropsGroup);
      },
    });
  }

  openSizePanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.dataset._savedInner && !textPropsGroup.querySelector(".size-panel")
    ) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();

    const sizeCtx = {
      getActiveTextLayer: () => this.getActiveTextLayer(),
      redrawAndSync: (layer?: Layer) => this.redrawAndSync(layer),
    };
    TextSizeService.captureInitialState(targetLayer ?? null);
    mountWarmTextSizePanel(textPropsGroup, {
      initialSize: TextSizeService.getCurrentSize(targetLayer ?? null),
      onSizeChange: (v) => TextSizeService.applySize(v, sizeCtx),
      onResetRequest: () => TextSizeService.resetSize(sizeCtx),
      onBack: () => {
        this.restorePropsList(textPropsGroup);
      },
    });
  }

  openPaddingPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.dataset._savedInner && !textPropsGroup.querySelector(".padding-panel")
    ) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();

    const padCtx = {
      getActiveTextLayer: () => this.getActiveTextLayer(),
      redrawAndSync: (layer?: Layer) => this.redrawAndSync(layer),
    };
    TextPaddingService.captureInitialState(targetLayer);
    const initPad = TextPaddingService.getCurrentPadding(targetLayer);
    mountWarmPaddingPanel(textPropsGroup, {
      initialLeft: initPad.paddingLeft,
      initialRight: initPad.paddingRight,
      onPaddingChange: (side, v) => TextPaddingService.applyPadding(side, v, padCtx),
      onResetRequest: () => {
        const s = TextPaddingService.resetPadding(padCtx);
        return { left: s.paddingLeft, right: s.paddingRight };
      },
      onBack: () => {
        this.restorePropsList(textPropsGroup);
      },
    });
  }

  /** Swatches + preset CSS for WarmJS color pickers (standalone + embedded). */
  private buildWarmColorData(): {
    colorSwatches: { name: string; hex: string; light: boolean }[];
    colorPresets: { name: string; css: string }[];
  } {
    return {
      colorSwatches: MONOCHROME_COLORS.map((c) => ({
        name: c.name,
        hex: c.hex,
        light: ColorService.isLightColor(c.hex),
      })),
      colorPresets: ColorService.getAllPresets().map((g) => ({
        name: g.name,
        css: ColorService.presetToCss(g),
      })),
    };
  }

  openColorPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.dataset._savedInner && !textPropsGroup.querySelector(".color-panel") &&
      
      !textPropsGroup.querySelector(".warm-color-panel-wrapper")
    ) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const active = this.getActiveTextLayer();
    const colorOpts = {
      layerManager: this.layerManager,
      targetLayer: active,
      onColorChange: (newColor: string | BackgroundFill) => {
        if (active) {
          active.fontColor = newColor;
          this.redrawAndSync(active);
        }
      },
    };
    const warmColors = this.buildWarmColorData();
    mountWarmColorPanel(textPropsGroup, {
      swatches: warmColors.colorSwatches,
      presets: warmColors.colorPresets,
      onPickColor: (hex) => ColorService.applyColor(hex, colorOpts),
      onPickGradient: (i) =>
        ColorService.applyGradient(ColorService.getAllPresets()[i], colorOpts),
      onCustomGradient: () => {
        eventBus.emit("gradient:open-custom", {
          targetLayer: active,
          onApply: colorOpts.onColorChange
            ? (gradData: any) =>
                colorOpts.onColorChange!({
                  kind: "custom",
                  data: gradData,
                } as BackgroundFill)
            : undefined,
        });
      },
      onBack: () => {
        this.restorePropsList(textPropsGroup);
      },
    });
  }

  openTexturePanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.dataset._savedInner && !textPropsGroup.querySelector(".texture-panel") &&
      
      !textPropsGroup.querySelector(".warm-texture-panel-wrapper")
    ) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();

    const texCtx = {
      getActiveLayer: () => this.getActiveTextLayer(),
      redrawAndSync: (layer?: Layer) => this.redrawAndSync(layer),
    };
    TextureService.captureInitialState(targetLayer);
    const initTex = TextureService.getCurrentState(targetLayer);
    const mapTex = (s: { hasImage: boolean; textureScale: number }) => ({
      hasImage: s.hasImage,
      scale: s.textureScale,
    });
    mountWarmTexturePanel(textPropsGroup, {
      initialHasImage: initTex.hasImage,
      initialScale: initTex.textureScale,
      onImagePicked: (img) => mapTex(TextureService.setTextureImage(img, texCtx)),
      onClearImage: () => mapTex(TextureService.clearTextureImage(texCtx)),
      onScaleChange: (v) => mapTex(TextureService.setTextureScale(v, texCtx)),
      onResetRequest: () => mapTex(TextureService.resetParameters(texCtx)),
      onBack: () => {
        this.restorePropsList(textPropsGroup);
      },
    });
  }

  openOpacityPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.dataset._savedInner && !textPropsGroup.querySelector(".opacity-panel") &&
      
      !textPropsGroup.querySelector(".warm-opacity-panel-wrapper")
    ) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();

    OpacityService.captureInitialState(targetLayer);
    const opacitySvcOpts = {
      layerManager: this.layerManager,
      onOpacityChange: () => this.redrawAndSync(),
    };
    mountWarmOpacityPanel(textPropsGroup, {
      initialOpacity: OpacityService.getOpacityPercent(targetLayer),
      onOpacityChange: (v) =>
        OpacityService.setOpacity(targetLayer, v, opacitySvcOpts),
      onResetRequest: () =>
        OpacityService.resetOpacity(targetLayer, opacitySvcOpts),
      onBack: () => {
        this.restorePropsList(textPropsGroup);
      },
    });
  }

  openRotatePanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.dataset._savedInner && !textPropsGroup.querySelector(".rotate-panel")
    ) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();

    RotateService.captureInitialState(targetLayer);
    const rotateOpts = {
      layerManager: this.layerManager,
      onAngleChange: () => this.redrawAndSync(),
    };
    mountWarmRotatePanel(textPropsGroup, {
      initialRotation: RotateService.getRotation(targetLayer),
      onRotationChange: (v) => RotateService.setRotation(targetLayer, v, rotateOpts),
      onResetRequest: () => RotateService.resetRotation(targetLayer, rotateOpts),
      onBack: () => {
        this.restorePropsList(textPropsGroup);
      },
    });
  }

  openCurvePanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.dataset._savedInner && !textPropsGroup.querySelector(".curve-panel") && !textPropsGroup.querySelector(".warm-curve-panel-wrapper")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();

    const curveCtx = {
      getActiveTextLayer: () => this.getActiveTextLayer(),
      redrawAndSync: (layer?: Layer) => this.redrawAndSync(layer),
    };
    TextCurveService.captureInitialState(targetLayer);
    mountWarmCurvePanel(textPropsGroup, {
      initialBend: TextCurveService.getCurrentBend(targetLayer),
      onBendChange: (v) => TextCurveService.applyBend(v, curveCtx),
      onResetRequest: () => TextCurveService.resetBend(curveCtx),
      onBack: () => {
        this.restorePropsList(textPropsGroup);
      },
    });
  }

  openBackgroundPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.dataset._savedInner && !textPropsGroup.querySelector(".item-bg-panel") && !textPropsGroup.querySelector(".warm-item-bg-panel-wrapper")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();

    const itemBgCtx = {
      getActiveLayer: () => this.getActiveTextLayer(),
      redrawAndSync: (layer?: Layer) => this.redrawAndSync(layer),
    };
    const mapItemBg = (s: {
      itemBgPaddingLeft: number;
      itemBgPaddingRight: number;
      itemBgPaddingTop: number;
      itemBgPaddingBottom: number;
      itemBgRadius: number;
      itemBgColor: unknown;
      hasImage: boolean;
    }) => ({
      padLeft: s.itemBgPaddingLeft,
      padRight: s.itemBgPaddingRight,
      padTop: s.itemBgPaddingTop,
      padBottom: s.itemBgPaddingBottom,
      radius: s.itemBgRadius,
      hasColor: !!s.itemBgColor,
      hasImage: s.hasImage,
    });
    ItemBackgroundService.captureInitialState(targetLayer);
    const bounds =
      (targetLayer && this.textTransform
        ? this.textTransform.getTextBounds(targetLayer)
        : null) || { width: 100, height: 50 };
    mountWarmItemBackgroundPanel(textPropsGroup, {
      initial: mapItemBg(ItemBackgroundService.getCurrentState(targetLayer)),
      bounds: { width: bounds.width || 100, height: bounds.height || 50 },
      ...this.buildWarmColorData(),
      onPaddingChange: (side, v) => ItemBackgroundService.setPadding(side, v, itemBgCtx),
      onRadiusChange: (v) => ItemBackgroundService.setRadius(v, itemBgCtx),
      onPickColorFill: (fill) => {
        ItemBackgroundService.setColor(fill as any, itemBgCtx);
        return mapItemBg(ItemBackgroundService.getCurrentState(targetLayer));
      },
      onPickGradient: (i) => {
        const p = ColorService.getAllPresets()[i];
        ItemBackgroundService.setColor(
          (p.isCustom
            ? { kind: "custom", data: p.data }
            : { kind: "preset", colors: [...p.colors], angleDeg: p.colors.length > 2 ? 135 : 90 }) as any,
          itemBgCtx
        );
        return mapItemBg(ItemBackgroundService.getCurrentState(targetLayer));
      },
      onCustomGradient: (apply) => {
        eventBus.emit("gradient:open-custom", {
          targetLayer,
          onApply: (gradData: any) => {
            ItemBackgroundService.setColor({ kind: "custom", data: gradData } as any, itemBgCtx);
            apply(mapItemBg(ItemBackgroundService.getCurrentState(targetLayer)));
          },
        });
      },
      onClearColor: () => {
        ItemBackgroundService.clearColor(itemBgCtx);
        return mapItemBg(ItemBackgroundService.getCurrentState(targetLayer));
      },
      onImagePicked: (img) => {
        ItemBackgroundService.setImage(img, itemBgCtx);
        return mapItemBg(ItemBackgroundService.getCurrentState(targetLayer));
      },
      onClearImage: () => {
        ItemBackgroundService.clearImage(itemBgCtx);
        return mapItemBg(ItemBackgroundService.getCurrentState(targetLayer));
      },
      onResetRequest: () => mapItemBg(ItemBackgroundService.resetParameters(itemBgCtx)),
      onBack: () => {
        this.restorePropsList(textPropsGroup);
      },
    });
  }

  openAlignPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.dataset._savedInner && !textPropsGroup.querySelector(".text-align-panel") && !textPropsGroup.querySelector(".warm-align-panel-wrapper")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();

    const alignCtx = {
      getActiveTextLayer: () => this.getActiveTextLayer(),
      redrawAndSync: (layer?: Layer) => this.redrawAndSync(layer),
    };
    const mapAlign = (s: { textAlign: CanvasTextAlign; textJustify: boolean }) => ({
      textAlign: s.textAlign as "left" | "center" | "right" | "start" | "end",
      textJustify: s.textJustify,
    });
    TextAlignService.captureInitialState(targetLayer);
    const initAlign = TextAlignService.getCurrentState(targetLayer);
    mountWarmAlignPanel(textPropsGroup, {
      initialAlign: mapAlign(initAlign).textAlign,
      initialJustify: initAlign.textJustify,
      onAlignChange: (v) => mapAlign(TextAlignService.applyAlign(v, alignCtx)),
      onJustifyToggle: () => mapAlign(TextAlignService.toggleJustify(alignCtx)),
      onResetRequest: () => mapAlign(TextAlignService.resetAlign(alignCtx)),
      onBack: () => {
        this.restorePropsList(textPropsGroup);
      },
    });
  }

  openSpacingPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.dataset._savedInner && !textPropsGroup.querySelector(".spacing-panel") && !textPropsGroup.querySelector(".warm-spacing-panel-wrapper")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();

    const spacingCtx = {
      getActiveTextLayer: () => this.getActiveTextLayer(),
      redrawAndSync: (layer?: Layer) => this.redrawAndSync(layer),
    };
    TextSpacingService.captureSpacingInitial(targetLayer);
    const initSpacing = TextSpacingService.getSpacingState(targetLayer);
    mountWarmSpacingPanel(textPropsGroup, {
      initialLetters: initSpacing.letterSpacing,
      initialWords: initSpacing.wordSpacing,
      onLettersChange: (v) => TextSpacingService.setLetterSpacing(v, spacingCtx),
      onWordsChange: (v) => TextSpacingService.setWordSpacing(v, spacingCtx),
      onResetRequest: () => {
        const s = TextSpacingService.resetSpacing(spacingCtx);
        return { letters: s.letterSpacing, words: s.wordSpacing };
      },
      onBack: () => {
        this.restorePropsList(textPropsGroup);
      },
    });
  }

  openLineSpacingPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.dataset._savedInner && !textPropsGroup.querySelector(".line-spacing-panel") && !textPropsGroup.querySelector(".warm-line-spacing-panel-wrapper")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();

    const lsCtx = {
      getActiveTextLayer: () => this.getActiveTextLayer(),
      redrawAndSync: (layer?: Layer) => this.redrawAndSync(layer),
    };
    TextSpacingService.captureLineSpacingInitial(targetLayer);
    mountWarmLineSpacingPanel(textPropsGroup, {
      initialValue: TextSpacingService.getLineSpacing(targetLayer),
      onChange: (v) => TextSpacingService.setLineSpacing(v, lsCtx),
      onResetRequest: () => TextSpacingService.resetLineSpacing(lsCtx),
      onBack: () => {
        this.restorePropsList(textPropsGroup);
      },
    });
  }

  openStrokePanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.dataset._savedInner && !textPropsGroup.querySelector(".stroke-panel") && !textPropsGroup.querySelector(".warm-stroke-panel-wrapper")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();

    const strokeCtx = {
      getActiveTextLayer: () => this.getActiveTextLayer(),
      redrawAndSync: (layer?: Layer) => this.redrawAndSync(layer),
      layerManager: this.layerManager,
    };
    const mapStroke = (s: TextStrokeState) => ({
      strokeWidth: s.strokeWidth,
      hasColor: !!s.strokeColor,
      hasImage: s.hasImage,
    });
    const setStrokeFill = (fill: string | { kind: string; [key: string]: any }) => {
      TextStrokeService.setColor(fill, strokeCtx);
      return mapStroke(TextStrokeService.getCurrentState(this.getActiveTextLayer()));
    };
    TextStrokeService.captureInitialState(targetLayer);
    const initStroke = TextStrokeService.getCurrentState(targetLayer);
    mountWarmStrokePanel(textPropsGroup, {
      initialWidth: initStroke.strokeWidth,
      initialHasColor: !!initStroke.strokeColor,
      initialHasImage: initStroke.hasImage,
      ...this.buildWarmColorData(),
      onWidthChange: (v) => {
        TextStrokeService.applyStrokeWidth(v, strokeCtx);
        return mapStroke(TextStrokeService.getCurrentState(this.getActiveTextLayer()));
      },
      onResetRequest: () => mapStroke(TextStrokeService.reset(strokeCtx)),
      onImagePicked: (img) => {
        TextStrokeService.setImage(img, strokeCtx);
        return mapStroke(TextStrokeService.getCurrentState(this.getActiveTextLayer()));
      },
      onClearImage: () => {
        TextStrokeService.clearImage(strokeCtx);
        return mapStroke(TextStrokeService.getCurrentState(this.getActiveTextLayer()));
      },
      onPickStrokeColor: (hex) => setStrokeFill(hex),
      onPickStrokeGradient: (i) => {
        const p = ColorService.getAllPresets()[i];
        setStrokeFill(
          p.isCustom
            ? { kind: "custom", data: p.data }
            : { kind: "preset", colors: [...p.colors], angleDeg: p.colors.length > 2 ? 135 : 90 }
        );
        return mapStroke(TextStrokeService.getCurrentState(this.getActiveTextLayer()));
      },
      onCustomStrokeGradient: (apply) => {
        eventBus.emit("gradient:open-custom", {
          targetLayer,
          onApply: (gradData: any) =>
            apply(setStrokeFill({ kind: "custom", data: gradData })),
        });
      },
      onClearColor: () => {
        TextStrokeService.clearColor(strokeCtx);
        return mapStroke(TextStrokeService.getCurrentState(this.getActiveTextLayer()));
      },
      onBack: () => {
        this.restorePropsList(textPropsGroup);
      },
    });
  }

  openShadowPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.dataset._savedInner && !textPropsGroup.querySelector(".shadow-panel") && !textPropsGroup.querySelector(".warm-shadow-panel-wrapper")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();

    const shCtx = {
      getActiveTextLayer: () => this.getActiveTextLayer(),
      redrawAndSync: (layer?: Layer) => this.redrawAndSync(layer),
      layerManager: this.layerManager,
    };
    const mapShadow = (s: TextShadowState) => ({
      enabled: s.enabled,
      opacity: Math.round(s.opacity * 100),
      blur: Math.round(s.blur),
      outerGlow: s.outerGlow,
      offsetX: Math.round(s.offsetX),
      offsetY: Math.round(s.offsetY),
    });
    const setShadowFill = (fill: string | { kind: string; [key: string]: any }) => {
      TextShadowService.setColor(fill, shCtx);
      return mapShadow(TextShadowService.getCurrentState(this.getActiveTextLayer()));
    };
    TextShadowService.captureInitialState(targetLayer);
    mountWarmShadowPanel(textPropsGroup, {
      initial: mapShadow(TextShadowService.getCurrentState(targetLayer)),
      ...this.buildWarmColorData(),
      onOpacityChange: (v) => {
        TextShadowService.setOpacity(v / 100, shCtx);
        return mapShadow(TextShadowService.getCurrentState(this.getActiveTextLayer()));
      },
      onBlurChange: (v) => {
        TextShadowService.setBlur(v, shCtx);
        return mapShadow(TextShadowService.getCurrentState(this.getActiveTextLayer()));
      },
      onToggleGlow: (v) => {
        TextShadowService.setOuterGlow(v, shCtx);
        return mapShadow(TextShadowService.getCurrentState(this.getActiveTextLayer()));
      },
      onOffsetXChange: (v) => {
        TextShadowService.setOffsetX(v, shCtx);
        return mapShadow(TextShadowService.getCurrentState(this.getActiveTextLayer()));
      },
      onOffsetYChange: (v) => {
        TextShadowService.setOffsetY(v, shCtx);
        return mapShadow(TextShadowService.getCurrentState(this.getActiveTextLayer()));
      },
      onClearColor: () => {
        TextShadowService.clearColor(shCtx);
        return mapShadow(TextShadowService.getCurrentState(this.getActiveTextLayer()));
      },
      onResetRequest: () => mapShadow(TextShadowService.reset(shCtx)),
      onPickShadowColor: (hex) => setShadowFill(hex),
      onPickShadowGradient: (i) => {
        const p = ColorService.getAllPresets()[i];
        setShadowFill(
          p.isCustom
            ? { kind: "custom", data: p.data }
            : { kind: "preset", colors: [...p.colors], angleDeg: p.colors.length > 2 ? 135 : 90 }
        );
        return mapShadow(TextShadowService.getCurrentState(this.getActiveTextLayer()));
      },
      onCustomShadowGradient: (apply) => {
        eventBus.emit("gradient:open-custom", {
          targetLayer,
          onApply: (gradData: any) =>
            apply(setShadowFill({ kind: "custom", data: gradData })),
        });
      },
      onBack: () => {
        this.restorePropsList(textPropsGroup);
      },
    });
  }

  openInnerShadowPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.dataset._savedInner && !textPropsGroup.querySelector(".inner-shadow-panel") && !textPropsGroup.querySelector(".warm-inner-shadow-panel-wrapper")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();

    const ishCtx = {
      getActiveTextLayer: () => this.getActiveTextLayer(),
      redrawAndSync: (layer?: Layer) => this.redrawAndSync(layer),
      layerManager: this.layerManager,
    };
    const mapInnerShadow = (s: TextInnerShadowState) => ({
      enabled: s.enabled,
      opacity: Math.round(s.opacity * 100),
      blur: Math.round(s.blur),
      offsetX: Math.round(s.offsetX),
      offsetY: Math.round(s.offsetY),
    });
    const setInnerShadowFill = (fill: string | { kind: string; [key: string]: any }) => {
      TextInnerShadowService.setColor(fill, ishCtx);
      return mapInnerShadow(TextInnerShadowService.getCurrentState(this.getActiveTextLayer()));
    };
    TextInnerShadowService.captureInitialState(targetLayer);
    mountWarmInnerShadowPanel(textPropsGroup, {
      initial: mapInnerShadow(TextInnerShadowService.getCurrentState(targetLayer)),
      ...this.buildWarmColorData(),
      onOpacityChange: (v) => {
        TextInnerShadowService.setOpacity(v / 100, ishCtx);
        return mapInnerShadow(TextInnerShadowService.getCurrentState(this.getActiveTextLayer()));
      },
      onBlurChange: (v) => {
        TextInnerShadowService.setBlur(v, ishCtx);
        return mapInnerShadow(TextInnerShadowService.getCurrentState(this.getActiveTextLayer()));
      },
      onOffsetXChange: (v) => {
        TextInnerShadowService.setOffsetX(v, ishCtx);
        return mapInnerShadow(TextInnerShadowService.getCurrentState(this.getActiveTextLayer()));
      },
      onOffsetYChange: (v) => {
        TextInnerShadowService.setOffsetY(v, ishCtx);
        return mapInnerShadow(TextInnerShadowService.getCurrentState(this.getActiveTextLayer()));
      },
      onClearColor: () => {
        TextInnerShadowService.clearColor(ishCtx);
        return mapInnerShadow(TextInnerShadowService.getCurrentState(this.getActiveTextLayer()));
      },
      onResetRequest: () => mapInnerShadow(TextInnerShadowService.reset(ishCtx)),
      onPickShadowColor: (hex) => setInnerShadowFill(hex),
      onPickShadowGradient: (i) => {
        const p = ColorService.getAllPresets()[i];
        setInnerShadowFill(
          p.isCustom
            ? { kind: "custom", data: p.data }
            : { kind: "preset", colors: [...p.colors], angleDeg: p.colors.length > 2 ? 135 : 90 }
        );
        return mapInnerShadow(TextInnerShadowService.getCurrentState(this.getActiveTextLayer()));
      },
      onCustomShadowGradient: (apply) => {
        eventBus.emit("gradient:open-custom", {
          targetLayer,
          onApply: (gradData: any) =>
            apply(setInnerShadowFill({ kind: "custom", data: gradData })),
        });
      },
      onBack: () => {
        this.restorePropsList(textPropsGroup);
      },
    });
  }

  openEmbossPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.dataset._savedInner && !textPropsGroup.querySelector(".warm-emboss-panel-wrapper")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();

    // Giữ hành vi autoEnable của bản cũ: mở từ menu là bật + chụp snapshot.
    if (targetLayer && !targetLayer.embossEnabled) {
      targetLayer.embossEnabled = true;
    }
    if (targetLayer) {
      TextEmbossService.captureInitialState(targetLayer);
    }
    const embossCtx = {
      getActiveTextLayer: () => this.getActiveTextLayer(),
      redrawAndSync: (layer?: Layer) => this.redrawAndSync(layer),
    };
    const mapEmboss = (s: {
      enabled: boolean;
      angle: number;
      intensity: number;
      ambient: number;
      hardness: number;
      bevel: number;
    }) => ({
      enabled: s.enabled,
      angle: s.angle,
      intensity: s.intensity,
      ambient: s.ambient,
      hardness: s.hardness,
      bevel: s.bevel,
    });
    mountWarmEmbossPanel(textPropsGroup, {
      initial: mapEmboss(TextEmbossService.getState(targetLayer)),
      onToggleEnabled: (v) => mapEmboss(TextEmbossService.setEnabled(v, embossCtx)),
      onAngleChange: (v) => mapEmboss(TextEmbossService.setAngle(v, embossCtx)),
      onIntensityChange: (v) => mapEmboss(TextEmbossService.setIntensity(v, embossCtx)),
      onAmbientChange: (v) => mapEmboss(TextEmbossService.setAmbient(v, embossCtx)),
      onHardnessChange: (v) => mapEmboss(TextEmbossService.setHardness(v, embossCtx)),
      onBevelChange: (v) => mapEmboss(TextEmbossService.setBevel(v, embossCtx)),
      onResetRequest: () => mapEmboss(TextEmbossService.resetEmboss(embossCtx)),
      onBack: () => {
        this.restorePropsList(textPropsGroup);
      },
    });
  }

  openPerspectivePanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.dataset._savedInner && !textPropsGroup.querySelector(".warm-perspective-panel-wrapper")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();

    // Overlay mode bật lúc mở, tắt lúc dispose (Back cũng đi qua dispose).
    const perspCtx = {
      getActiveTextLayer: () => this.getActiveTextLayer(),
      redrawAndSync: (layer?: Layer) => this.redrawAndSync(layer),
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
    };
    if (perspCtx.setPerspectiveMode && this.textTransform) {
      perspCtx.setPerspectiveMode(true);
    }
    TextPerspectiveService.captureInitialState(targetLayer);
    const initP = TextPerspectiveService.getState(targetLayer);
    mountWarmPerspectivePanel(
      textPropsGroup,
      {
        initialEnabled: initP.enabled,
        onToggleEnabled: (v) => ({
          enabled: TextPerspectiveService.setEnabled(v, perspCtx).enabled,
        }),
        onResetPoints: () => ({
          enabled: TextPerspectiveService.resetPoints(perspCtx).enabled,
        }),
        onHeaderReset: () => ({
          enabled: TextPerspectiveService.restoreSnapshot(perspCtx).enabled,
        }),
        onBack: () => {
          this.restorePropsList(textPropsGroup);
        },
        onDispose: () => {
          if (this.textTransform) this.textTransform.isPerspectiveMode = false;
        },
      }
    );
  }

  open3DRotatePanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.dataset._savedInner && !textPropsGroup.querySelector(".warm-3d-rotate-panel-wrapper")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();

    const r3Ctx = {
      getActiveTextLayer: () => this.getActiveTextLayer(),
      redrawAndSync: (layer?: Layer) => this.redrawAndSync(layer),
    };
    if (targetLayer) Text3DRotateService.captureInitialState(targetLayer);
    const init3d = Text3DRotateService.getState(targetLayer);
    mountWarmRotate3DPanel(textPropsGroup, {
      initialX: init3d.rotateX,
      initialY: init3d.rotateY,
      onXChange: (v) => {
        const s = Text3DRotateService.setRotateX(v, r3Ctx);
        return { x: s.rotateX, y: s.rotateY };
      },
      onYChange: (v) => {
        const s = Text3DRotateService.setRotateY(v, r3Ctx);
        return { x: s.rotateX, y: s.rotateY };
      },
      onResetRequest: () => {
        const s = Text3DRotateService.resetRotate(r3Ctx);
        return { x: s.rotateX, y: s.rotateY };
      },
      onBack: () => {
        this.restorePropsList(textPropsGroup);
      },
    });
  }

  open3DTextPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.dataset._savedInner && !textPropsGroup.querySelector(".warm-3d-text-panel-wrapper")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();

    const tdCtx = {
      getActiveTextLayer: () => this.getActiveTextLayer(),
      redrawAndSync: (layer?: Layer) => this.redrawAndSync(layer),
      layerManager: this.layerManager,
    };
    const map3D = (s: {
      enabled: boolean;
      viewType: "perspective" | "oblique";
      depth: number;
      colorMode: "auto" | "color";
      color: unknown;
      darken: number;
      rotateX: number;
      rotateY: number;
      rotateZ: number;
      lightingEnabled: boolean;
      lightAngle: number;
      lightIntensity: number;
      lightShadow: number;
      lightSpecular: number;
    }) => ({ ...s });
    const set3DFill = (fill: string | { kind: string; [key: string]: any }) => {
      Text3DService.setColor(fill, tdCtx);
      return map3D(Text3DService.getState(this.getActiveTextLayer()));
    };
    if (targetLayer) {
      Text3DService.captureInitialState(targetLayer);
    }
    mountWarmText3DPanel(textPropsGroup, {
      initial: map3D(Text3DService.getState(targetLayer)),
      ...this.buildWarmColorData(),
      onViewTypeChange: (v) => map3D(Text3DService.setViewType(v, tdCtx)),
      onDepthChange: (v) => map3D(Text3DService.setDepth(v, tdCtx)),
      onColorModeChange: (v) => map3D(Text3DService.setColorMode(v, tdCtx)),
      onPickColor: (hex) => set3DFill(hex),
      onPickGradient: (i) => {
        const p = ColorService.getAllPresets()[i];
        set3DFill(
          p.isCustom
            ? { kind: "custom", data: p.data }
            : { kind: "preset", colors: [...p.colors], angleDeg: p.colors.length > 2 ? 135 : 90 }
        );
        return map3D(Text3DService.getState(this.getActiveTextLayer()));
      },
      onCustomGradient: (apply) => {
        eventBus.emit("gradient:open-custom", {
          targetLayer,
          onApply: (gradData: any) =>
            apply(set3DFill({ kind: "custom", data: gradData })),
        });
      },
      onClearColor: () => map3D(Text3DService.resetColor(tdCtx)),
      onDarkenChange: (v) => map3D(Text3DService.setDarken(v, tdCtx)),
      onResetRotation: () => map3D(Text3DService.reset3DRotation(tdCtx)),
      onRotateXChange: (v) => map3D(Text3DService.setRotateX(v, tdCtx)),
      onRotateYChange: (v) => map3D(Text3DService.setRotateY(v, tdCtx)),
      onRotateZChange: (v) => map3D(Text3DService.setRotateZ(v, tdCtx)),
      onToggleLighting: (v) => map3D(Text3DService.setLightingEnabled(v, tdCtx)),
      onLightAngleChange: (v) => map3D(Text3DService.setLightAngle(v, tdCtx)),
      onLightIntensityChange: (v) => map3D(Text3DService.setLightIntensity(v, tdCtx)),
      onLightShadowChange: (v) => map3D(Text3DService.setLightShadow(v, tdCtx)),
      onLightSpecularChange: (v) => map3D(Text3DService.setLightSpecular(v, tdCtx)),
      onResetRequest: () => map3D(Text3DService.reset(tdCtx)),
      onBack: () => {
        this.restorePropsList(textPropsGroup);
      },
    });
  }

  open3DShadowPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.dataset._savedInner && !textPropsGroup.querySelector(".warm-3d-shadow-panel-wrapper")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();

    const tdshCtx = {
      getActiveTextLayer: () => this.getActiveTextLayer(),
      redrawAndSync: (layer?: Layer) => this.redrawAndSync(layer),
      layerManager: this.layerManager,
    };
    const map3DShadow = (s: {
      enabled: boolean;
      opacity: number;
      blur: number;
      expand: number;
      angle: number;
      distance: number;
    }) => ({ ...s });
    const set3DShadowFill = (fill: string | { kind: string; [key: string]: any }) => {
      Text3DShadowService.setColor(fill, tdshCtx);
      return map3DShadow(Text3DShadowService.getState(this.getActiveTextLayer()));
    };
    if (targetLayer) {
      Text3DShadowService.captureInitialState(targetLayer);
    }
    mountWarmText3DShadowPanel(textPropsGroup, {
      initial: map3DShadow(Text3DShadowService.getState(targetLayer)),
      ...this.buildWarmColorData(),
      onOpacityChange: (v) => map3DShadow(Text3DShadowService.setOpacity(v, tdshCtx)),
      onBlurChange: (v) => map3DShadow(Text3DShadowService.setBlur(v, tdshCtx)),
      onExpandChange: (v) => map3DShadow(Text3DShadowService.setExpand(v, tdshCtx)),
      onAngleDistanceChange: (a, d) =>
        map3DShadow(Text3DShadowService.setAngleAndDistance(a, d, tdshCtx)),
      onClearColor: () => map3DShadow(Text3DShadowService.resetColor(tdshCtx)),
      onResetRequest: () => map3DShadow(Text3DShadowService.reset(tdshCtx)),
      onPickColor: (hex) => set3DShadowFill(hex),
      onPickGradient: (i) => {
        const p = ColorService.getAllPresets()[i];
        set3DShadowFill(
          p.isCustom
            ? { kind: "custom", data: p.data }
            : { kind: "preset", colors: [...p.colors], angleDeg: p.colors.length > 2 ? 135 : 90 }
        );
        return map3DShadow(Text3DShadowService.getState(this.getActiveTextLayer()));
      },
      onCustomGradient: (apply) => {
        eventBus.emit("gradient:open-custom", {
          targetLayer,
          onApply: (gradData: any) =>
            apply(set3DShadowFill({ kind: "custom", data: gradData })),
        });
      },
      onBack: () => {
        this.restorePropsList(textPropsGroup);
      },
    });
  }

  openReflectionPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.dataset._savedInner && !textPropsGroup.querySelector(".warm-reflection-panel-wrapper")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();

    const reflCtx = {
      getActiveTextLayer: () => this.getActiveTextLayer(),
      redrawAndSync: (layer?: Layer) => this.redrawAndSync(layer),
    };
    const toTriple = (s: TextReflectionState) => ({
      enabled: s.enabled,
      opacity: s.opacity,
      distance: s.distance,
    });
    TextReflectionService.captureInitialState(targetLayer);
    const initR = TextReflectionService.getState(targetLayer);
    mountWarmReflectionPanel(textPropsGroup, {
      initialEnabled: initR.enabled,
      initialOpacity: initR.opacity,
      initialDistance: initR.distance,
      onToggleEnabled: (v) => toTriple(TextReflectionService.setEnabled(v, reflCtx)),
      onOpacityChange: (v) => toTriple(TextReflectionService.setOpacity(v, reflCtx)),
      onDistanceChange: (v) => toTriple(TextReflectionService.setDistance(v, reflCtx)),
      onResetRequest: () => toTriple(TextReflectionService.resetReflection(reflCtx)),
      onBack: () => {
        this.restorePropsList(textPropsGroup);
      },
    });
  }

  private openFontPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.dataset._savedInner && !textPropsGroup.querySelector(".font-panel") &&
      
      !textPropsGroup.querySelector(".warm-font-panel-wrapper")
    ) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();

    const fontCtx = {
      getTargetLayer: () => this.getActiveTextLayer(),
      redrawAndSync: (layer?: Layer | null) => this.redrawAndSync(layer || undefined),
    };
    mountWarmFontPanel(textPropsGroup, {
      initialFont: TextFontService.getCurrentFontFamily(targetLayer),
      initialFonts: TextFontService.getAllFonts(),
      loadCustomFonts: () =>
        TextFontService.initCustomFonts().then(() => TextFontService.getAllFonts()),
      onSelectFont: (name) => TextFontService.applyFontFamily(name, fontCtx),
      onUploadFont: async (file) => {
        const res = await TextFontService.uploadFontFile(file);
        if (!res.success) return res;
        return { ...res, fonts: TextFontService.getAllFonts() };
      },
      onBack: () => {
        this.restorePropsList(textPropsGroup);
      },
    });
  }

  openStylePanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.dataset._savedInner && !textPropsGroup.querySelector(".style-panel") && !textPropsGroup.querySelector(".warm-style-panel-wrapper")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();

    const styleCtx = {
      getActiveTextLayer: () => this.getActiveTextLayer(),
      redrawAndSync: (layer?: Layer) => this.redrawAndSync(layer),
    };
    const mapStyle = (s: { fontWeight: "normal" | "bold"; fontStyle: "normal" | "italic"; textDecoration: string }) => ({
      fontWeight: s.fontWeight,
      fontStyle: s.fontStyle,
      textDecoration: s.textDecoration,
    });
    TextStyleService.captureInitialState(targetLayer);
    const initStyle = TextStyleService.getCurrentStyle(targetLayer);
    mountWarmStylePanel(textPropsGroup, {
      initial: mapStyle(initStyle),
      onToggleBold: () => mapStyle(TextStyleService.toggleBold(styleCtx)),
      onToggleItalic: () => mapStyle(TextStyleService.toggleItalic(styleCtx)),
      onToggleDecoration: (t) => mapStyle(TextStyleService.toggleDecoration(t as any, styleCtx)),
      onClearStyle: () => mapStyle(TextStyleService.clearStyle(styleCtx)),
      onResetRequest: () => mapStyle(TextStyleService.resetStyle(styleCtx)),
      onBack: () => {
        this.restorePropsList(textPropsGroup);
      },
    });
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








