/**
 * Text Module - TypeScript chuẩn + TSX
 * Tách biệt rõ ràng:
 * 1. Data Layer Logic (createNewTextLayer, updateTextContent, updateTextStyle, moveTextLayer)
 * 2. UI Sub-sidebar Panels Logic (Size, Padding, Style, Relative Position, Rotate, Curve, Opacity, Texture, Color)
 */

import { h } from "../ui/jsx";
import { Layer, LayerManager, TextDecoration } from "../core/layer";
import { eventBus } from "../core/event-bus";
import { SliderControl } from "../ui/SliderControl";
import { RelativePositionModule } from "../modules/relative-position";
import { RotateModule } from "../modules/rotate";
import { OpacityModule } from "../modules/opacity";
import { ColorModule } from "../modules/color";
import { CurveModule } from "../modules/curve";
import { TextureModule } from "../modules/texture";
import { ItemBackgroundModule } from "../modules/item-background";
import { TextAlignModule } from "./text-align";
import { TextSpacingModule } from "./text-spacing";
import { TextLineSpacingModule } from "./text-line-spacing";
import { TextStrokeModule } from "./text-stroke";
import { TextShadowModule } from "./text-shadow";
import { TextInnerShadowModule } from "./text-inner-shadow";
import { TextEmbossModule } from "./text-emboss";
import { TextPerspectiveModule } from "./text-perspective";
import { Text3DRotateModule } from "./text-3d-rotate";
import { Text3DModule } from "./text-3d";
import { Text3DShadowModule } from "./text-3d-shadow";
import { TextReflectionModule } from "./text-reflection";
import { TextTransform } from "./text-transform";

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
  private curveModule: CurveModule | null = null;
  private textureModule: TextureModule | null = null;
  private itemBackgroundModule: ItemBackgroundModule | null = null;
  private textAlignModule: TextAlignModule | null = null;
  private textSpacingModule: TextSpacingModule | null = null;
  private textLineSpacingModule: TextLineSpacingModule | null = null;
  private textStrokeModule: TextStrokeModule | null = null;
  private textShadowModule: TextShadowModule | null = null;
  private textInnerShadowModule: TextInnerShadowModule | null = null;
  private textEmbossModule: TextEmbossModule | null = null;
  private textPerspectiveModule: TextPerspectiveModule | null = null;
  private text3DRotateModule: Text3DRotateModule | null = null;
  private text3DModule: Text3DModule | null = null;
  private text3DShadowModule: Text3DShadowModule | null = null;
  private textReflectionModule: TextReflectionModule | null = null;

  constructor(
    layerManager: LayerManager,
    dataService: TextDataService,
    textTransform?: TextTransform
  ) {
    this.layerManager = layerManager;
    this.dataService = dataService;
    if (textTransform) {
      this.textTransform = textTransform;
      this.curveModule = new CurveModule(layerManager, textTransform);
      this.textureModule = new TextureModule(layerManager, textTransform);
      this.itemBackgroundModule = new ItemBackgroundModule(layerManager, textTransform);
      this.textAlignModule = new TextAlignModule(layerManager, textTransform);
      this.textSpacingModule = new TextSpacingModule(layerManager, textTransform);
      this.textLineSpacingModule = new TextLineSpacingModule(layerManager, textTransform);
      this.textStrokeModule = new TextStrokeModule(layerManager, textTransform);
      this.textShadowModule = new TextShadowModule(layerManager, textTransform);
      this.textInnerShadowModule = new TextInnerShadowModule(layerManager, textTransform);
      this.textEmbossModule = new TextEmbossModule(layerManager, textTransform);
      this.textPerspectiveModule = new TextPerspectiveModule(layerManager, textTransform);
      this.text3DRotateModule = new Text3DRotateModule(layerManager, textTransform);
      this.text3DModule = new Text3DModule(layerManager, textTransform);
      this.text3DShadowModule = new Text3DShadowModule(layerManager, textTransform);
      this.textReflectionModule = new TextReflectionModule(layerManager, textTransform);
    }
    this.initEventListeners();
    this.initEventBus();
  }

  setTextTransform(textTransform: TextTransform): void {
    this.textTransform = textTransform;
    this.curveModule = new CurveModule(this.layerManager, textTransform);
    this.textureModule = new TextureModule(this.layerManager, textTransform);
    this.itemBackgroundModule = new ItemBackgroundModule(this.layerManager, textTransform);
    this.textAlignModule = new TextAlignModule(this.layerManager, textTransform);
    this.textSpacingModule = new TextSpacingModule(this.layerManager, textTransform);
    this.textLineSpacingModule = new TextLineSpacingModule(this.layerManager, textTransform);
    this.textStrokeModule = new TextStrokeModule(this.layerManager, textTransform);
    this.textShadowModule = new TextShadowModule(this.layerManager, textTransform);
    this.textInnerShadowModule = new TextInnerShadowModule(this.layerManager, textTransform);
    this.textEmbossModule = new TextEmbossModule(this.layerManager, textTransform);
    this.textPerspectiveModule = new TextPerspectiveModule(this.layerManager, textTransform);
    this.text3DRotateModule = new Text3DRotateModule(this.layerManager, textTransform);
    this.text3DModule = new Text3DModule(this.layerManager, textTransform);
    this.text3DShadowModule = new Text3DShadowModule(this.layerManager, textTransform);
    this.textReflectionModule = new TextReflectionModule(this.layerManager, textTransform);
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

  openRelativePositionPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (textPropsGroup) {
      RelativePositionModule.open(textPropsGroup, {
        layerManager: this.layerManager,
        targetLayer: this.getActiveTextLayer(),
        onPositionChange: () => this.redrawAndSync(),
      });
    }
  }

  openSizePanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.querySelector(".size-panel")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();
    const currentSize = targetLayer?.fontSize ? Math.round(targetLayer.fontSize) : 48;

    const panelEl = (
      <div
        class="size-panel"
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
        id="size-back-btn"
        class="sub-item"
        style={{ marginBottom: "4px" }}
        onClick={() => {
          if (textPropsGroup.dataset._savedInner) {
            textPropsGroup.innerHTML = textPropsGroup.dataset._savedInner;
            delete textPropsGroup.dataset._savedInner;
          }
        }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5" />
          <path d="M11 18l-6-6 6-6" />
        </svg>
        <span>Back</span>
      </button>
    );
    panelEl.appendChild(backBtn);

    const sliderControlEl = SliderControl({
      label: "Size",
      value: currentSize,
      min: 1,
      max: 1000,
      sliderMin: 2,
      sliderMax: 300,
      btnStep: 1,
      onChange: (newSize) => {
        const active = this.getActiveTextLayer();
        if (active) {
          active.fontSize = newSize;
          this.redrawAndSync(active);
        }
      },
    });

    panelEl.appendChild(sliderControlEl);
    textPropsGroup.innerHTML = "";
    textPropsGroup.appendChild(panelEl);
  }

  openPaddingPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.querySelector(".padding-panel")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();
    const currentLeft = targetLayer?.paddingLeft ? Math.round(targetLayer.paddingLeft) : 0;
    const currentRight = targetLayer?.paddingRight ? Math.round(targetLayer.paddingRight) : 0;

    const panelEl = (
      <div
        class="padding-panel"
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
        id="padding-back-btn"
        class="sub-item"
        style={{ marginBottom: "4px" }}
        onClick={() => {
          if (textPropsGroup.dataset._savedInner) {
            textPropsGroup.innerHTML = textPropsGroup.dataset._savedInner;
            delete textPropsGroup.dataset._savedInner;
          }
        }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5" />
          <path d="M11 18l-6-6 6-6" />
        </svg>
        <span>Back</span>
      </button>
    );
    panelEl.appendChild(backBtn);

    const updatePadding = (side: "left" | "right", val: number) => {
      const active = this.getActiveTextLayer();
      if (active) {
        if (side === "left") active.paddingLeft = Math.round(val);
        else active.paddingRight = Math.round(val);
        this.redrawAndSync(active);
      }
    };

    const leftSliderEl = SliderControl({
      label: "left padding",
      value: currentLeft,
      min: -1000,
      max: 1000,
      sliderMin: -20,
      sliderMax: 100,
      btnStep: 1,
      onChange: (val) => updatePadding("left", val),
    });

    const rightSliderEl = SliderControl({
      label: "right padding",
      value: currentRight,
      min: -1000,
      max: 1000,
      sliderMin: -20,
      sliderMax: 100,
      btnStep: 1,
      onChange: (val) => updatePadding("right", val),
    });

    panelEl.appendChild(leftSliderEl);
    panelEl.appendChild(rightSliderEl);
    textPropsGroup.innerHTML = "";
    textPropsGroup.appendChild(panelEl);
  }

  openColorPanel(): void {
    const active = this.getActiveTextLayer();
    ColorModule.open(null, {
      layerManager: this.layerManager,
      targetLayer: active,
      onColorChange: (newColor) => {
        if (active) {
          active.fontColor = newColor;
          this.redrawAndSync(active);
        }
      },
    });
  }

  openTexturePanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (textPropsGroup && this.textureModule) {
      this.textureModule.open(textPropsGroup);
    }
  }

  openOpacityPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (textPropsGroup) {
      OpacityModule.open(textPropsGroup, {
        layerManager: this.layerManager,
        targetLayer: this.getActiveTextLayer(),
        onOpacityChange: () => this.redrawAndSync(),
      });
    }
  }

  openRotatePanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (textPropsGroup) {
      RotateModule.open(textPropsGroup, {
        layerManager: this.layerManager,
        targetLayer: this.getActiveTextLayer(),
        onAngleChange: () => this.redrawAndSync(),
      });
    }
  }

  openCurvePanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (textPropsGroup && this.curveModule) {
      this.curveModule.open(textPropsGroup);
    }
  }

  openBackgroundPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (textPropsGroup && this.itemBackgroundModule) {
      this.itemBackgroundModule.open(textPropsGroup);
    }
  }

  openAlignPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (textPropsGroup && this.textAlignModule) {
      this.textAlignModule.open(textPropsGroup);
    }
  }

  openSpacingPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (textPropsGroup && this.textSpacingModule) {
      this.textSpacingModule.open(textPropsGroup);
    }
  }

  openLineSpacingPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (textPropsGroup && this.textLineSpacingModule) {
      this.textLineSpacingModule.open(textPropsGroup);
    }
  }

  openStrokePanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (textPropsGroup && this.textStrokeModule) {
      this.textStrokeModule.open(textPropsGroup);
    }
  }

  openShadowPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (textPropsGroup && this.textShadowModule) {
      this.textShadowModule.open(textPropsGroup);
    }
  }

  openInnerShadowPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (textPropsGroup && this.textInnerShadowModule) {
      this.textInnerShadowModule.open(textPropsGroup);
    }
  }

  openEmbossPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (textPropsGroup && this.textEmbossModule) {
      this.textEmbossModule.open(textPropsGroup);
    }
  }

  openPerspectivePanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (textPropsGroup && this.textPerspectiveModule) {
      this.textPerspectiveModule.open(textPropsGroup);
    }
  }

  open3DRotatePanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (textPropsGroup && this.text3DRotateModule) {
      this.text3DRotateModule.open(textPropsGroup);
    }
  }

  open3DTextPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (textPropsGroup && this.text3DModule) {
      this.text3DModule.open(textPropsGroup);
    }
  }

  open3DShadowPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (textPropsGroup && this.text3DShadowModule) {
      this.text3DShadowModule.open(textPropsGroup);
    }
  }

  openReflectionPanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (textPropsGroup && this.textReflectionModule) {
      this.textReflectionModule.open(textPropsGroup);
    }
  }

  openStylePanel(): void {
    const textPropsGroup = document.querySelector(
      '.sub-group[data-section="text-props"]'
    ) as HTMLElement | null;
    if (!textPropsGroup) return;

    if (!textPropsGroup.querySelector(".style-panel")) {
      textPropsGroup.dataset._savedInner = textPropsGroup.innerHTML;
    }

    const targetLayer = this.getActiveTextLayer();
    const isBold = targetLayer?.fontWeight === "bold";
    const isItalic = targetLayer?.fontStyle === "italic";
    const currentDec: TextDecoration =
      targetLayer?.textDecoration || (targetLayer?.underline ? "underline" : "none");

    const panelEl = (
      <div
        class="style-panel"
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
        id="style-back-btn"
        class="sub-item"
        style={{ marginBottom: "4px" }}
        onClick={() => {
          if (textPropsGroup.dataset._savedInner) {
            textPropsGroup.innerHTML = textPropsGroup.dataset._savedInner;
            delete textPropsGroup.dataset._savedInner;
          }
        }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5" />
          <path d="M11 18l-6-6 6-6" />
        </svg>
        <span>Back</span>
      </button>
    );
    panelEl.appendChild(backBtn);

    const btnGrid = (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "8px",
        }}
      ></div>
    ) as HTMLElement;

    const makeBtn = (
      id: string,
      label: Node | string,
      title: string,
      isActive: boolean,
      onClick: () => void,
      spanFour = false
    ) => {
      const btn = (
        <button
          type="button"
          id={id}
          title={title}
          style={{
            padding: "10px 4px",
            background: isActive ? "#00f260" : "#2a2a2a",
            border: `1px solid ${isActive ? "#00f260" : "#444"}`,
            borderRadius: "6px",
            color: isActive ? "#000" : "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "15px",
            fontWeight: "bold",
            gridColumn: spanFour ? "span 4" : "auto",
          }}
          onClick={onClick}
        ></button>
      ) as HTMLButtonElement;

      if (typeof label === "string") {
        btn.textContent = label;
      } else {
        btn.appendChild(label);
      }
      return btn;
    };

    const toggleDecoration = (type: TextDecoration) => {
      const active = this.getActiveTextLayer();
      if (active) {
        active.textDecoration = active.textDecoration === type ? "none" : type;
        active.underline = active.textDecoration === "underline";
        this.redrawAndSync(active);
        this.openStylePanel();
      }
    };

    btnGrid.appendChild(
      makeBtn("style-bold-btn", "B", "Bold (In đậm)", isBold, () => {
        const active = this.getActiveTextLayer();
        if (active) {
          active.fontWeight = active.fontWeight === "bold" ? "normal" : "bold";
          this.redrawAndSync(active);
          this.openStylePanel();
        }
      })
    );

    btnGrid.appendChild(
      makeBtn(
        "style-italic-btn",
        (<i>I</i>) as HTMLElement,
        "Italic (In nghiêng)",
        isItalic,
        () => {
          const active = this.getActiveTextLayer();
          if (active) {
            active.fontStyle = active.fontStyle === "italic" ? "normal" : "italic";
            this.redrawAndSync(active);
            this.openStylePanel();
          }
        }
      )
    );

    btnGrid.appendChild(
      makeBtn(
        "style-underline-btn",
        (<u>U</u>) as HTMLElement,
        "Underline (Gạch chân)",
        currentDec === "underline",
        () => toggleDecoration("underline")
      )
    );

    btnGrid.appendChild(
      makeBtn(
        "style-double-btn",
        (
          <span style={{ borderBottom: "3px double currentColor", paddingBottom: "2px" }}>
            O
          </span>
        ) as HTMLElement,
        "Double Underline (Gạch đôi)",
        currentDec === "double-underline",
        () => toggleDecoration("double-underline")
      )
    );

    btnGrid.appendChild(
      makeBtn(
        "style-strike-btn",
        (<s>S</s>) as HTMLElement,
        "Strikethrough (Gạch ngang chữ)",
        currentDec === "strikethrough",
        () => toggleDecoration("strikethrough")
      )
    );

    btnGrid.appendChild(
      makeBtn(
        "style-dashed-btn",
        (<span style={{ borderBottom: "2px dashed currentColor" }}>H</span>) as HTMLElement,
        "Dashed Underline (Gạch chân đứt nét)",
        currentDec === "dashed-underline",
        () => toggleDecoration("dashed-underline")
      )
    );

    btnGrid.appendChild(
      makeBtn(
        "style-wavy-btn",
        (<span style={{ textDecoration: "wavy underline" }}>W</span>) as HTMLElement,
        "Wavy Underline (Gạch sóng)",
        currentDec === "wavy-underline",
        () => toggleDecoration("wavy-underline")
      )
    );

    btnGrid.appendChild(
      makeBtn(
        "style-dotted-btn",
        (<span style={{ borderBottom: "2px dotted currentColor" }}>T</span>) as HTMLElement,
        "Dotted Underline (Gạch dấu chấm)",
        currentDec === "dotted-underline",
        () => toggleDecoration("dotted-underline")
      )
    );

    const trashSvg = (
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path
          fill="currentColor"
          d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
        />
      </svg>
    ) as unknown as SVGElement;

    btnGrid.appendChild(
      makeBtn(
        "style-reset-btn",
        trashSvg,
        "Clear Style (Xóa Style)",
        false,
        () => {
          const active = this.getActiveTextLayer();
          if (active) {
            active.fontWeight = "normal";
            active.fontStyle = "normal";
            active.textDecoration = "none";
            active.underline = false;
            this.redrawAndSync(active);
            this.openStylePanel();
          }
        },
        true
      )
    );

    panelEl.appendChild(btnGrid);
    textPropsGroup.innerHTML = "";
    textPropsGroup.appendChild(panelEl);
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
