/** @jsx h */
import { h, render, ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import type { Layer } from "../../core/layer";
import {
  TextAlignService,
  type TextAlignContext,
  type TextAlignState,
} from "../../core/text/text-align-service";
import { PreactPanelHeader } from "../../ui/base/panel-header";

interface TextAlignPanelProps {
  initialState: TextAlignState;
  context: TextAlignContext;
  onBack: () => void;
}

export function TextAlignPanel({
  initialState,
  context,
  onBack,
}: TextAlignPanelProps) {
  const [alignState, setAlignState] = useState<TextAlignState>(initialState);

  const handleAlign = (align: CanvasTextAlign) => {
    const updated = TextAlignService.applyAlign(align, context);
    setAlignState(updated);
  };

  const handleJustifyToggle = () => {
    const updated = TextAlignService.toggleJustify(context);
    setAlignState(updated);
  };

  const handleReset = () => {
    const updated = TextAlignService.resetAlign(context);
    setAlignState(updated);
  };

  const renderAlignBtn = (
    alignValue: CanvasTextAlign,
    label: string,
    iconSvg: ComponentChildren
  ) => {
    const isActive = alignState.textAlign === alignValue;
    return (
      <button
        type="button"
        style={{
          flex: "1",
          padding: "10px 6px",
          background: isActive ? "#00f260" : "#2a2a2a",
          border: `1px solid ${isActive ? "#00f260" : "#444"}`,
          borderRadius: "6px",
          color: isActive ? "#000" : "#fff",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          fontSize: "11px",
          fontWeight: isActive ? "bold" : "normal",
          transition: "all 0.15s ease",
        }}
        onClick={() => handleAlign(alignValue)}
      >
        {iconSvg}
        <span>{label}</span>
      </button>
    );
  };

  const isJustified = alignState.textJustify;

  return (
    <div
      class="preact-align-panel-wrapper"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        userSelect: "none",
        padding: "12px 8px",
      }}
    >
      <PreactPanelHeader
        title="Text Align"
        onBack={onBack}
        onReset={handleReset}
      />

      {/* Section 1: Fixed Alignment [Left, Center, Right] */}
      <div style={{ display: "flex", gap: "8px" }}>
        {renderAlignBtn(
          "left",
          "Left",
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M3 4h18v2H3V4zm0 5h12v2H3V9zm0 5h18v2H3v-2zm0 5h12v2H3v-2z"
            />
          </svg>
        )}
        {renderAlignBtn(
          "center",
          "Center",
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M3 4h18v2H3V4zm3 5h12v2H6V9zm-3 5h18v2H3v-2zm3 5h12v2H6v-2z"
            />
          </svg>
        )}
        {renderAlignBtn(
          "right",
          "Right",
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M3 4h18v2H3V4zm6 5h12v2H9V9zm-6 5h18v2H3v-2zm6 5h12v2H9v-2z"
            />
          </svg>
        )}
      </div>

      {/* Section 2: Directional Alignment [Start, End] */}
      <div style={{ display: "flex", gap: "8px" }}>
        {renderAlignBtn(
          "start",
          "Start",
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M3 4h2v16H3V4zm5 3h13v2H8V7zm0 5h9v2H8v-2zm0 5h13v2H8v-2z"
            />
          </svg>
        )}
        {renderAlignBtn(
          "end",
          "End",
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M19 4h2v16h-2V4zM3 7h13v2H3V7zm4 5h9v2H7v-2zm-4 5h13v2H3v-2z"
            />
          </svg>
        )}
      </div>

      {/* Section 3: Justify Toggle */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 12px",
          background: isJustified ? "rgba(0, 242, 96, 0.08)" : "#242424",
          border: `1px solid ${isJustified ? "#00f260" : "#383838"}`,
          borderRadius: "8px",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        onClick={handleJustifyToggle}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            style={{ color: isJustified ? "#00f260" : "#fff" }}
          >
            <path
              fill="currentColor"
              d="M3 4h18v2H3V4zm0 5h18v2H3V9zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"
            />
          </svg>
          <span
            style={{
              fontSize: "12px",
              fontWeight: "bold",
              color: isJustified ? "#00f260" : "#fff",
            }}
          >
            Justify
          </span>
        </div>

        {/* Toggle Switch Pill */}
        <div
          style={{
            width: "38px",
            height: "22px",
            borderRadius: "11px",
            background: isJustified ? "#00f260" : "#3a3a3a",
            position: "relative",
            transition: "background 0.2s ease",
          }}
        >
          <div
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              background: isJustified ? "#000" : "#888",
              position: "absolute",
              top: "2px",
              left: isJustified ? "18px" : "2px",
              transition: "left 0.2s ease, background 0.2s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function mountTextAlignPanel(
  container: HTMLElement,
  targetLayer: Layer | null | undefined,
  context: TextAlignContext,
  onBack: () => void
): () => void {
  TextAlignService.captureInitialState(targetLayer);
  const initialState = TextAlignService.getCurrentState(targetLayer);

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
    <TextAlignPanel
      initialState={initialState}
      context={context}
      onBack={handleBack}
    />,
    preactRoot
  );

  return cleanup;
}
