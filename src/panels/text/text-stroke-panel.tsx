/** @jsx h */
import { h, render } from "preact";
import { useState, useRef } from "preact/hooks";
import type { Layer, LayerManager } from "../../core/layer";
import {
  TextStrokeService,
  type TextStrokeContext,
  type TextStrokeState,
} from "../../core/text/text-stroke-service";
import { PreactPanelHeader } from "../../ui/base/panel-header";
import { PreactTabBar } from "../../ui/base/tab-bar";
import { SliderControlGroup } from "../../ui/base/slider-control-group";
import { ColorModule } from "../../modules/color";

export interface TextStrokePanelContext extends TextStrokeContext {
  layerManager?: LayerManager;
}

interface TextStrokePanelProps {
  initialState: TextStrokeState;
  context: TextStrokePanelContext;
  containerGroup: HTMLElement;
  onBack: () => void;
  onRefreshPanel: () => void;
}

export function TextStrokePanel({
  initialState,
  context,
  containerGroup,
  onBack,
  onRefreshPanel,
}: TextStrokePanelProps) {
  const [strokeState, setStrokeState] = useState<TextStrokeState>(initialState);
  const [activeTab, setActiveTab] = useState<"color" | "image">(
    initialState.hasImage ? "image" : "color"
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleWidthChange = (val: number) => {
    TextStrokeService.applyStrokeWidth(val, context);
    setStrokeState((prev) => ({ ...prev, strokeWidth: Math.round(val) }));
  };

  const handleReset = () => {
    const next = TextStrokeService.reset(context);
    setStrokeState(next);
  };

  const handleOpenColorPicker = () => {
    containerGroup.dataset._savedInner_stroke = containerGroup.innerHTML;
    ColorModule.open(containerGroup, {
      layerManager: context.layerManager,
      onColorChange: (color) => {
        TextStrokeService.setColor(color, context);
        const next = TextStrokeService.getCurrentState(context.getActiveTextLayer());
        setStrokeState(next);
      },
      onClose: () => {
        onRefreshPanel();
      },
    });
  };

  const handleClearColor = () => {
    TextStrokeService.clearColor(context);
    setStrokeState((prev) => ({
      ...prev,
      strokeColor: null,
      strokeFillKind: prev.hasImage ? "image" : "none",
    }));
  };

  const handleFileChange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        TextStrokeService.setImage(img, context);
        const next = TextStrokeService.getCurrentState(context.getActiveTextLayer());
        setStrokeState(next);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    TextStrokeService.clearImage(context);
    setStrokeState((prev) => ({
      ...prev,
      hasImage: false,
      strokeFillKind: prev.strokeColor ? "color" : "none",
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const hasColor = !!strokeState.strokeColor;
  const hasImage = strokeState.hasImage;

  return (
    <div
      class="preact-stroke-panel-wrapper"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        userSelect: "none",
        padding: "12px 8px",
      }}
    >
      <PreactPanelHeader
        title="Stroke"
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

      <SliderControlGroup
        label="Stroke width"
        value={strokeState.strokeWidth}
        min={0}
        max={50}
        sliderMin={0}
        sliderMax={50}
        btnStep={1}
        onChange={handleWidthChange}
      />
    </div>
  );
}

export function mountTextStrokePanel(
  container: HTMLElement,
  targetLayer: Layer | null | undefined,
  context: TextStrokePanelContext,
  onBack: () => void
): () => void {
  TextStrokeService.captureInitialState(targetLayer);

  const preactRoot = document.createElement("div");
  preactRoot.className = "preact-stroke-panel-root";
  container.innerHTML = "";
  container.appendChild(preactRoot);

  const cleanup = () => {
    render(null, preactRoot);
    if (preactRoot.parentNode) {
      preactRoot.parentNode.removeChild(preactRoot);
    }
  };

  const renderComponent = () => {
    const currentState = TextStrokeService.getCurrentState(context.getActiveTextLayer());
    render(
      <TextStrokePanel
        initialState={currentState}
        context={context}
        containerGroup={container}
        onBack={() => {
          cleanup();
          onBack();
        }}
        onRefreshPanel={renderComponent}
      />,
      preactRoot
    );
  };

  renderComponent();

  return cleanup;
}
