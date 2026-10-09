/** @jsx h */
import { h, render } from "preact";
import { useState } from "preact/hooks";
import type { Layer, LayerManager } from "../../core/layer";
import {
  TextInnerShadowService,
  type TextInnerShadowContext,
  type TextInnerShadowState,
} from "../../core/text/text-inner-shadow-service";
import { PreactPanelHeader } from "../../ui/base/panel-header";
import { SliderControlGroup } from "../../ui/base/slider-control-group";
import { mountColorPanel } from "../common/color-panel";

export interface TextInnerShadowPanelContext extends TextInnerShadowContext {
  layerManager?: LayerManager;
}

interface TextInnerShadowPanelProps {
  initialState: TextInnerShadowState;
  context: TextInnerShadowPanelContext;
  containerGroup: HTMLElement;
  onBack: () => void;
  onRefreshPanel: () => void;
}

export function TextInnerShadowPanel({
  initialState,
  context,
  containerGroup,
  onBack,
  onRefreshPanel,
}: TextInnerShadowPanelProps) {
  const [innerShadowState, setInnerShadowState] =
    useState<TextInnerShadowState>(initialState);

  const handleReset = () => {
    const next = TextInnerShadowService.reset(context);
    setInnerShadowState(next);
  };

  const handleOpenColorPicker = () => {
    containerGroup.dataset._savedInner_innerShadow = containerGroup.innerHTML;
    mountColorPanel(containerGroup, {
      layerManager: context.layerManager,
      onColorChange: (color) => {
        TextInnerShadowService.setColor(color, context);
        const next = TextInnerShadowService.getCurrentState(
          context.getActiveTextLayer()
        );
        setInnerShadowState(next);
      },
      onClose: () => {
        onRefreshPanel();
      },
    }, () => {});
  };

  const handleClearColor = () => {
    TextInnerShadowService.clearColor(context);
    setInnerShadowState((prev) => ({ ...prev, enabled: false }));
  };

  const handleOpacityChange = (val: number) => {
    const opacity = val / 100;
    TextInnerShadowService.setOpacity(opacity, context);
    setInnerShadowState((prev) => ({ ...prev, opacity }));
  };

  const handleBlurChange = (val: number) => {
    TextInnerShadowService.setBlur(val, context);
    setInnerShadowState((prev) => ({ ...prev, blur: Math.round(val) }));
  };

  const handleOffsetXChange = (val: number) => {
    TextInnerShadowService.setOffsetX(val, context);
    setInnerShadowState((prev) => ({ ...prev, offsetX: Math.round(val) }));
  };

  const handleOffsetYChange = (val: number) => {
    TextInnerShadowService.setOffsetY(val, context);
    setInnerShadowState((prev) => ({ ...prev, offsetY: Math.round(val) }));
  };

  const hasColor = innerShadowState.enabled;

  return (
    <div
      class="preact-inner-shadow-panel-wrapper"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        userSelect: "none",
        padding: "12px 8px",
      }}
    >
      <PreactPanelHeader
        title="Inner Shadow"
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
          title="Delete Inner Shadow Color"
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
        value={Math.round(innerShadowState.opacity * 100)}
        min={0}
        max={100}
        sliderMin={0}
        sliderMax={100}
        btnStep={1}
        onChange={handleOpacityChange}
      />

      <SliderControlGroup
        label="Blur radius"
        value={innerShadowState.blur}
        min={0}
        max={25}
        sliderMin={0}
        sliderMax={25}
        btnStep={1}
        onChange={handleBlurChange}
      />

      <SliderControlGroup
        label="Offset X"
        value={innerShadowState.offsetX}
        min={-100}
        max={100}
        sliderMin={-100}
        sliderMax={100}
        btnStep={1}
        onChange={handleOffsetXChange}
      />

      <SliderControlGroup
        label="Offset Y"
        value={innerShadowState.offsetY}
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

export function mountTextInnerShadowPanel(
  container: HTMLElement,
  targetLayer: Layer | null | undefined,
  context: TextInnerShadowPanelContext,
  onBack: () => void
): () => void {
  TextInnerShadowService.captureInitialState(targetLayer);

  const preactRoot = document.createElement("div");
  preactRoot.className = "preact-inner-shadow-panel-root";
  container.innerHTML = "";
  container.appendChild(preactRoot);

  const cleanup = () => {
    render(null, preactRoot);
    if (preactRoot.parentNode) {
      preactRoot.parentNode.removeChild(preactRoot);
    }
  };

  const renderComponent = () => {
    const currentState = TextInnerShadowService.getCurrentState(
      context.getActiveTextLayer()
    );
    render(
      <TextInnerShadowPanel
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
