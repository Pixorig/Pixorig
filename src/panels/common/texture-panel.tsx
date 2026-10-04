/** @jsx h */
import { h, render } from "preact";
import { useState, useRef } from "preact/hooks";
import type { Layer } from "../../core/layer";
import {
  TextureService,
  type TextureContext,
  type TextureState,
} from "../../core/layer/texture-service";
import { PreactPanelHeader } from "../../ui/base/panel-header";
import { SliderControlGroup } from "../../ui/base/slider-control-group";

export interface TexturePanelProps {
  initialState: TextureState;
  context: TextureContext;
  onBack: () => void;
}

export function TexturePanel({
  initialState,
  context,
  onBack,
}: TexturePanelProps) {
  const [textureState, setTextureState] = useState<TextureState>(initialState);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleReset = () => {
    const next = TextureService.resetParameters(context);
    setTextureState(next);
  };

  const handleFileChange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const next = TextureService.setTextureImage(img, context);
        setTextureState(next);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    const next = TextureService.clearTextureImage(context);
    setTextureState(next);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleScaleChange = (val: number) => {
    const next = TextureService.setTextureScale(val, context);
    setTextureState(next);
  };

  const hasImage = textureState.hasImage;

  return (
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
      <PreactPanelHeader
        title="Texture"
        onBack={onBack}
        onReset={handleReset}
      />

      <input
        ref={fileInputRef}
        type="file"
        id="texture-file-input"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <button
          type="button"
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
          onClick={() => fileInputRef.current?.click()}
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path
              fill="currentColor"
              d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"
            />
          </svg>
          <span>Select Image</span>
        </button>

        <button
          type="button"
          id="texture-delete-btn"
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
            gap: "4px",
            fontSize: "12px",
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

      {hasImage && (
        <SliderControlGroup
          label="Scale"
          value={textureState.textureScale}
          min={10}
          max={500}
          sliderMin={10}
          sliderMax={500}
          btnStep={5}
          unit="%"
          onChange={handleScaleChange}
        />
      )}
    </div>
  );
}

export function mountTexturePanel(
  container: HTMLElement,
  targetLayer: Layer | null | undefined,
  context: TextureContext,
  onBack: () => void
): () => void {
  TextureService.captureInitialState(targetLayer);
  const currentState = TextureService.getCurrentState(targetLayer);

  const preactRoot = document.createElement("div");
  preactRoot.className = "preact-texture-panel-wrapper";
  container.innerHTML = "";
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
    <TexturePanel
      initialState={currentState}
      context={context}
      onBack={handleBack}
    />,
    preactRoot
  );

  return cleanup;
}
