/** @jsx h */
import { h, render } from "preact";
import { useState } from "preact/hooks";
import type { Layer } from "../../core/layer";
import {
  TextReflectionService,
  type TextReflectionContext,
  type TextReflectionState,
} from "../../core/text/text-reflection-service";
import { PreactPanelHeader } from "../../ui/base/panel-header";
import { SliderControlGroup } from "../../ui/base/slider-control-group";

export interface TextReflectionPanelProps {
  initialState: TextReflectionState;
  context: TextReflectionContext;
  onBack: () => void;
}

export function TextReflectionPanel({
  initialState,
  context,
  onBack,
}: TextReflectionPanelProps) {
  const [state, setState] = useState<TextReflectionState>(initialState);

  const handleToggleEnabled = (enabled: boolean) => {
    const updated = TextReflectionService.setEnabled(enabled, context);
    setState(updated);
  };

  const handleReset = () => {
    const updated = TextReflectionService.resetReflection(context);
    setState(updated);
  };

  const handleOpacityChange = (val: number) => {
    const updated = TextReflectionService.setOpacity(val, context);
    setState(updated);
  };

  const handleDistanceChange = (val: number) => {
    const updated = TextReflectionService.setDistance(val, context);
    setState(updated);
  };

  return (
    <div
      class="preact-reflection-panel-wrapper"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        userSelect: "none",
        padding: "12px 8px",
      }}
    >
      <PreactPanelHeader
        title="Reflection"
        onBack={onBack}
        onReset={handleReset}
      />

      {/* Switch toggle Enabled */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 4px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <span style={{ fontSize: "13px", color: "#ddd", fontWeight: "500" }}>
          Enabled
        </span>
        <label
          style={{
            position: "relative",
            display: "inline-block",
            width: "36px",
            height: "20px",
            margin: "0",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={state.enabled}
            style={{ opacity: "0", width: "0", height: "0" }}
            onChange={(e: Event) =>
              handleToggleEnabled((e.target as HTMLInputElement).checked)
            }
          />
          <span
            style={{
              position: "absolute",
              cursor: "pointer",
              top: "0",
              left: "0",
              right: "0",
              bottom: "0",
              backgroundColor: state.enabled ? "#00f260" : "#444",
              borderRadius: "20px",
              transition: "0.2s",
            }}
          >
            <span
              style={{
                position: "absolute",
                content: '""',
                height: "14px",
                width: "14px",
                left: state.enabled ? "19px" : "3px",
                bottom: "3px",
                backgroundColor: "#fff",
                borderRadius: "50%",
                transition: "0.2s",
              }}
            />
          </span>
        </label>
      </div>

      {state.enabled && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <SliderControlGroup
            label="Opacity"
            value={state.opacity}
            min={0}
            max={100}
            sliderMin={0}
            sliderMax={100}
            step={1}
            btnStep={5}
            unit="%"
            onChange={handleOpacityChange}
          />

          <SliderControlGroup
            label="Distance"
            value={state.distance}
            min={-100}
            max={100}
            sliderMin={-100}
            sliderMax={100}
            step={1}
            btnStep={1}
            onChange={handleDistanceChange}
          />
        </div>
      )}
    </div>
  );
}

export function mountTextReflectionPanel(
  container: HTMLElement,
  targetLayer: Layer | null | undefined,
  context: TextReflectionContext,
  onBack: () => void
): () => void {
  TextReflectionService.captureInitialState(targetLayer);
  const initialState = TextReflectionService.getState(targetLayer);

  container.innerHTML = "";

  const preactRoot = document.createElement("div");
  preactRoot.className = "preact-reflection-panel-wrapper";
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
    <TextReflectionPanel
      initialState={initialState}
      context={context}
      onBack={handleBack}
    />,
    preactRoot
  );

  return cleanup;
}
