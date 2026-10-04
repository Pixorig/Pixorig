/** @jsx h */
import { h, render } from "preact";
import { useState, useRef } from "preact/hooks";
import type { Layer } from "../../core/layer";
import {
  ItemBackgroundService,
  type ItemBackgroundContext,
  type ItemBackgroundState,
} from "../../core/layer/item-background-service";
import { PreactPanelHeader } from "../../ui/base/panel-header";
import { PreactTabBar } from "../../ui/base/tab-bar";
import { SliderControlGroup } from "../../ui/base/slider-control-group";
import { ColorModule } from "../../modules/color";

interface ItemBackgroundPanelProps {
  initialState: ItemBackgroundState;
  context: ItemBackgroundContext;
  bounds: { width: number; height: number };
  containerGroup: HTMLElement;
  onBack: () => void;
  onRefreshPanel: () => void;
}

export function ItemBackgroundPanel({
  initialState,
  context,
  bounds,
  containerGroup,
  onBack,
  onRefreshPanel,
}: ItemBackgroundPanelProps) {
  const [bgState, setBgState] = useState<ItemBackgroundState>(initialState);
  const [activeTab, setActiveTab] = useState<"color" | "image">("color");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const bbW = bounds.width || 100;
  const bbH = bounds.height || 50;
  const hMin = -Math.floor(bbW * 0.5);
  const hMax = Math.ceil(bbW * 1.5);
  const vMin = -Math.floor(bbH * 0.5);
  const vMax = Math.ceil(bbH * 1.5);

  const handleReset = () => {
    const next = ItemBackgroundService.resetParameters(context);
    setBgState(next);
  };

  const handlePaddingChange = (
    side: "left" | "right" | "top" | "bottom",
    val: number
  ) => {
    ItemBackgroundService.setPadding(side, val, context);
    setBgState((prev) => {
      switch (side) {
        case "left": return { ...prev, itemBgPaddingLeft: Math.round(val) };
        case "right": return { ...prev, itemBgPaddingRight: Math.round(val) };
        case "top": return { ...prev, itemBgPaddingTop: Math.round(val) };
        case "bottom": return { ...prev, itemBgPaddingBottom: Math.round(val) };
      }
    });
  };

  const handleRadiusChange = (val: number) => {
    ItemBackgroundService.setRadius(val, context);
    setBgState((prev) => ({ ...prev, itemBgRadius: Math.round(val) }));
  };

  const handleOpenColorPicker = () => {
    containerGroup.dataset._savedInner_bg = containerGroup.innerHTML;
    ColorModule.open(containerGroup, {
      onColorChange: (color) => {
        let finalColor: any = color;
        if (typeof color === "object" && color !== null && "kind" in color && color.kind === "solid") {
          finalColor = color.hex;
        }
        ItemBackgroundService.setColor(finalColor, context);
      },
      onClose: () => {
        onRefreshPanel();
      },
    });
  };

  const handleClearColor = () => {
    ItemBackgroundService.clearColor(context);
    setBgState((prev) => ({ ...prev, itemBgColor: null }));
  };

  const handleFileChange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        ItemBackgroundService.setImage(img, context);
        setBgState((prev) => ({ ...prev, hasImage: true, itemBgColor: null }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    ItemBackgroundService.clearImage(context);
    setBgState((prev) => ({ ...prev, hasImage: false }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const hasColor = !!bgState.itemBgColor;
  const hasImage = bgState.hasImage;

  return (
    <div
      class="preact-item-bg-panel-wrapper"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        userSelect: "none",
        padding: "12px 8px",
      }}
    >
      <PreactPanelHeader
        title="Item Background"
        onBack={onBack}
        onReset={handleReset}
      />

      <PreactTabBar
        tabs={[
          { id: "color", label: "Color" },
          { id: "image", label: "Image" },
        ]}
        active={activeTab}
        onChange={(tab) => setActiveTab(tab as "color" | "image")}
      />

      {activeTab === "color" ? (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
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
            onClick={handleOpenColorPicker}
          >
            Select Color
          </button>
          <button
            type="button"
            title="Delete Color"
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
            onClick={handleClearColor}
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path
                fill="currentColor"
                d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
              />
            </svg>
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
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
            onClick={() => fileInputRef.current?.click()}
          >
            Select Image
          </button>
          <button
            type="button"
            title="Delete Image"
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
            onClick={handleClearImage}
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path
                fill="currentColor"
                d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
              />
            </svg>
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
        <SliderControlGroup
          label="Left padding"
          value={bgState.itemBgPaddingLeft}
          min={hMin}
          max={hMax}
          sliderMin={hMin}
          sliderMax={hMax}
          btnStep={1}
          onChange={(val) => handlePaddingChange("left", val)}
        />
        <SliderControlGroup
          label="Right padding"
          value={bgState.itemBgPaddingRight}
          min={hMin}
          max={hMax}
          sliderMin={hMin}
          sliderMax={hMax}
          btnStep={1}
          onChange={(val) => handlePaddingChange("right", val)}
        />
        <SliderControlGroup
          label="Top padding"
          value={bgState.itemBgPaddingTop}
          min={vMin}
          max={vMax}
          sliderMin={vMin}
          sliderMax={vMax}
          btnStep={1}
          onChange={(val) => handlePaddingChange("top", val)}
        />
        <SliderControlGroup
          label="Bottom padding"
          value={bgState.itemBgPaddingBottom}
          min={vMin}
          max={vMax}
          sliderMin={vMin}
          sliderMax={vMax}
          btnStep={1}
          onChange={(val) => handlePaddingChange("bottom", val)}
        />
        <SliderControlGroup
          label="Radius"
          value={bgState.itemBgRadius}
          min={0}
          max={100}
          sliderMin={0}
          sliderMax={100}
          btnStep={1}
          onChange={handleRadiusChange}
        />
      </div>
    </div>
  );
}

export function mountItemBackgroundPanel(
  container: HTMLElement,
  targetLayer: Layer | null | undefined,
  context: ItemBackgroundContext,
  onBack: () => void
): () => void {
  ItemBackgroundService.captureInitialState(targetLayer);

  const mount = () => {
    const currentState = ItemBackgroundService.getCurrentState(targetLayer);
    const bounds = (targetLayer && context.getBounds?.(targetLayer)) || {
      width: 100,
      height: 50,
    };

    container.innerHTML = "";
    const preactRoot = document.createElement("div");
    container.appendChild(preactRoot);

    const cleanup = () => {
      render(null, preactRoot);
      if (preactRoot.parentNode) {
        preactRoot.parentNode.removeChild(preactRoot);
      }
    };

    const handleBack = () => {
      cleanup();
      onBack();
    };

    render(
      <ItemBackgroundPanel
        initialState={currentState}
        context={context}
        bounds={bounds}
        containerGroup={container}
        onBack={handleBack}
        onRefreshPanel={() => {
          mount();
        }}
      />,
      preactRoot
    );

    return cleanup;
  };

  return mount();
}
