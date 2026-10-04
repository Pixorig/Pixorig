/** @jsx h */
import { h, render, ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import type { Layer, TextDecoration } from "../../core/layer";
import {
  TextStyleService,
  type TextStyleContext,
  type TextStyleState,
} from "../../core/text/text-style-service";
import { PreactPanelHeader } from "../../ui/base/panel-header";

interface TextStylePanelProps {
  initialStyle: TextStyleState;
  context: TextStyleContext;
  onBack: () => void;
}

export function TextStylePanel({
  initialStyle,
  context,
  onBack,
}: TextStylePanelProps) {
  const [styleState, setStyleState] = useState<TextStyleState>(initialStyle);

  const handleBold = () => {
    const updated = TextStyleService.toggleBold(context);
    setStyleState(updated);
  };

  const handleItalic = () => {
    const updated = TextStyleService.toggleItalic(context);
    setStyleState(updated);
  };

  const handleDecoration = (type: TextDecoration) => {
    const updated = TextStyleService.toggleDecoration(type, context);
    setStyleState(updated);
  };

  const handleClear = () => {
    const updated = TextStyleService.clearStyle(context);
    setStyleState(updated);
  };

  const handleReset = () => {
    const updated = TextStyleService.resetStyle(context);
    setStyleState(updated);
  };

  const renderBtn = (
    id: string,
    label: ComponentChildren,
    title: string,
    isActive: boolean,
    onClick: () => void,
    spanFour = false
  ) => {
    return (
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
      >
        {label}
      </button>
    );
  };

  const isBold = styleState.fontWeight === "bold";
  const isItalic = styleState.fontStyle === "italic";
  const currentDec = styleState.textDecoration;

  return (
    <div
      class="preact-style-panel-wrapper"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        userSelect: "none",
        padding: "12px 8px",
      }}
    >
      <PreactPanelHeader
        title="Text Style"
        onBack={onBack}
        onReset={handleReset}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "8px",
        }}
      >
        {renderBtn(
          "style-bold-btn",
          "B",
          "Bold (In đậm)",
          isBold,
          handleBold
        )}

        {renderBtn(
          "style-italic-btn",
          <i>I</i>,
          "Italic (In nghiêng)",
          isItalic,
          handleItalic
        )}

        {renderBtn(
          "style-underline-btn",
          <u>U</u>,
          "Underline (Gạch chân)",
          currentDec === "underline",
          () => handleDecoration("underline")
        )}

        {renderBtn(
          "style-double-btn",
          <span style={{ borderBottom: "3px double currentColor", paddingBottom: "2px" }}>
            O
          </span>,
          "Double Underline (Gạch đôi)",
          currentDec === "double-underline",
          () => handleDecoration("double-underline")
        )}

        {renderBtn(
          "style-strike-btn",
          <s>S</s>,
          "Strikethrough (Gạch ngang chữ)",
          currentDec === "strikethrough",
          () => handleDecoration("strikethrough")
        )}

        {renderBtn(
          "style-dashed-btn",
          <span style={{ borderBottom: "2px dashed currentColor" }}>H</span>,
          "Dashed Underline (Gạch chân đứt nét)",
          currentDec === "dashed-underline",
          () => handleDecoration("dashed-underline")
        )}

        {renderBtn(
          "style-wavy-btn",
          <span style={{ textDecoration: "wavy underline" }}>W</span>,
          "Wavy Underline (Gạch sóng)",
          currentDec === "wavy-underline",
          () => handleDecoration("wavy-underline")
        )}

        {renderBtn(
          "style-dotted-btn",
          <span style={{ borderBottom: "2px dotted currentColor" }}>T</span>,
          "Dotted Underline (Gạch dấu chấm)",
          currentDec === "dotted-underline",
          () => handleDecoration("dotted-underline")
        )}

        {renderBtn(
          "style-reset-btn",
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
            />
          </svg>,
          "Clear Style (Xóa Style)",
          false,
          handleClear,
          true
        )}
      </div>
    </div>
  );
}

export function mountTextStylePanel(
  container: HTMLElement,
  targetLayer: Layer | null | undefined,
  context: TextStyleContext,
  onBack: () => void
): () => void {
  TextStyleService.captureInitialState(targetLayer);
  const initialStyle = TextStyleService.getCurrentStyle(targetLayer);

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
    <TextStylePanel
      initialStyle={initialStyle}
      context={context}
      onBack={handleBack}
    />,
    preactRoot
  );

  return cleanup;
}
