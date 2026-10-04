/** @jsx h */
import { h, render } from "preact";
import { useState } from "preact/hooks";
import type { Layer, LayerManager } from "../../core/layer";
import {
  TextShadowService,
  type TextShadowContext,
  type TextShadowState,
} from "../../core/text/text-shadow-service";
import { PreactPanelHeader } from "../../ui/base/panel-header";
import { SliderControlGroup } from "../../ui/base/slider-control-group";
import { ColorModule } from "../../modules/color";

export interface TextShadowPanelContext extends TextShadowContext {
  layerManager?: LayerManager;
}

interface TextShadowPanelProps {
  initialState: TextShadowState;
  context: TextShadowPanelContext;
  containerGroup: HTMLElement;
  onBack: () => void;
  onRefreshPanel: () => void;
}

export function TextShadowPanel({
  initialState,
  context,
  containerGroup,
  onBack,
  onRefreshPanel,
}: TextShadowPanelProps) {
  const [shadowState, setShadowState] = useState<TextShadowState>(initialState);

  const handleReset = () => {
    const next = TextShadowService.reset(context);
    setShadowState(next);
  };

  const handleOpenColorPicker = () => {
    containerGroup.dataset._savedInner_shadow = containerGroup.innerHTML;
    ColorModule.open(containerGroup, {
      layerManager: context.layerManager,
      onColorChange: (color) => {
        TextShadowService.setColor(color, context);
        const next = TextShadowService.getCurrentState(context.getActiveTextLayer());
        setShadowState(next);
      },
      onClose: () => {
        onRefreshPanel();
      },
    });
  };

  const handleClearColor = () => {
    TextShadowService.clearColor(context);
    setShadowState((prev) => ({ ...prev, enabled: false }));
  };

  const handleOpacityChange = (val: number) => {
    const opacity = val / 100;
    TextShadowService.setOpacity(opacity, context);
    setShadowState((prev) => ({ ...prev, opacity }));
  };

  const handleBlurChange = (val: number) => {
    TextShadowService.setBlur(val, context);
    setShadowState((prev) => ({ ...prev, blur: Math.round(val) }));
  };

  const handleOuterGlowChange = (checked: boolean) => {
    TextShadowService.setOuterGlow(checked, context);
    setShadowState((prev) => ({ ...prev, outerGlow: checked }));
  };

  const handleOffsetXChange = (val: number) => {
    TextShadowService.setOffsetX(val, context);
    setShadowState((prev) => ({ ...prev, offsetX: Math.round(val) }));
  };

  const handleOffsetYChange = (val: number) => {
    TextShadowService.setOffsetY(val, context);
    setShadowState((prev) => ({ ...prev, offsetY: Math.round(val) }));
  };

  const hasColor = shadowState.enabled;

  return (
    <div
      class="preact-shadow-panel-wrapper"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        userSelect: "none",
        padding: "12px 8px",
      }}
    >
      <PreactPanelHeader
        title="Shadow"
        onBack={onBack}
        onReset={handleReset}
      />

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
          title="Delete Shadow Color"
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

      <SliderControlGroup
        label="Opacity"
        value={Math.round(shadowState.opacity * 100)}
        min={0}
        max={100}
        sliderMin={0}
        sliderMax={100}
        btnStep={1}
        onChange={handleOpacityChange}
      />

      <SliderControlGroup
        label="Blur radius"
        value={shadowState.blur}
        min={0}
        max={50}
        sliderMin={0}
        sliderMax={50}
        btnStep={1}
        onChange={handleBlurChange}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 0",
        }}
      >
        <span style={{ fontSize: "12px", color: "#ccc" }}>Outer glow</span>
        <label
          style={{
            position: "relative",
            display: "inline-block",
            width: "36px",
            height: "20px",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={shadowState.outerGlow}
            style={{ opacity: "0", width: "0", height: "0", position: "absolute" }}
            onChange={(e) =>
              handleOuterGlowChange((e.target as HTMLInputElement).checked)
            }
          />
          <span
            style={{
              position: "absolute",
              top: "0",
              left: "0",
              right: "0",
              bottom: "0",
              background: shadowState.outerGlow ? "#4f8ef7" : "#444",
              borderRadius: "20px",
              transition: "background 0.2s",
            }}
          />
          <span
            style={{
              position: "absolute",
              height: "14px",
              width: "14px",
              left: shadowState.outerGlow ? "19px" : "3px",
              bottom: "3px",
              background: "#fff",
              borderRadius: "50%",
              transition: "left 0.2s",
            }}
          />
        </label>
      </div>

      <SliderControlGroup
        label="Offset X"
        value={shadowState.offsetX}
        min={-100}
        max={100}
        sliderMin={-100}
        sliderMax={100}
        btnStep={1}
        onChange={handleOffsetXChange}
      />

      <SliderControlGroup
        label="Offset Y"
        value={shadowState.offsetY}
        min={-100}
        max={100}
        sliderMin={-100}
        sliderMax={100}
        btnStep={1}
        onChange={handleOffsetYChange}
      />
    </div>
  );
}

export function mountTextShadowPanel(
  container: HTMLElement,
  targetLayer: Layer | null | undefined,
  context: TextShadowPanelContext,
  onBack: () => void
): () => void {
  TextShadowService.captureInitialState(targetLayer);

  const preactRoot = document.createElement("div");
  preactRoot.className = "preact-shadow-panel-root";
  container.innerHTML = "";
  container.appendChild(preactRoot);

  const cleanup = () => {
    render(null, preactRoot);
    if (preactRoot.parentNode) {
      preactRoot.parentNode.removeChild(preactRoot);
    }
  };

  const renderComponent = () => {
    const currentState = TextShadowService.getCurrentState(context.getActiveTextLayer());
    render(
      <TextShadowPanel
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
