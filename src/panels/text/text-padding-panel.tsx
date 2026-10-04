/** @jsx h */
import { h, render } from "preact";
import { useState } from "preact/hooks";
import {
  TextPaddingService,
  type TextPaddingContext,
  type TextPaddingState,
} from "../../core/text/text-padding-service";
import { SliderControlGroup } from "../../ui/base/slider-control-group";
import { PreactPanelHeader } from "../../ui/base/panel-header";
import type { Layer } from "../../core/layer";

interface TextPaddingPanelProps {
  initialState: TextPaddingState;
  context: TextPaddingContext;
  onBack: () => void;
}

export function TextPaddingPanel({
  initialState,
  context,
  onBack,
}: TextPaddingPanelProps) {
  const [padding, setPadding] = useState<TextPaddingState>(initialState);

  const handlePaddingChange = (side: "left" | "right", val: number) => {
    setPadding((prev) => ({
      ...prev,
      [side === "left" ? "paddingLeft" : "paddingRight"]: val,
    }));
    TextPaddingService.applyPadding(side, val, context);
  };

  const handleReset = () => {
    const resetState = TextPaddingService.resetPadding(context);
    setPadding(resetState);
  };

  return (
    <div
      class="padding-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        userSelect: "none",
        padding: "12px 8px",
      }}
    >
      <PreactPanelHeader
        title="Text Padding"
        onBack={onBack}
        onReset={handleReset}
      />
      <SliderControlGroup
        label="Left padding"
        value={padding.paddingLeft}
        min={-1000}
        max={1000}
        sliderMin={-20}
        sliderMax={100}
        btnStep={1}
        onChange={(val) => handlePaddingChange("left", val)}
      />
      <SliderControlGroup
        label="Right padding"
        value={padding.paddingRight}
        min={-1000}
        max={1000}
        sliderMin={-20}
        sliderMax={100}
        btnStep={1}
        onChange={(val) => handlePaddingChange("right", val)}
      />
    </div>
  );
}

/**
 * Mount Preact component into native DOM container
 */
export function mountTextPaddingPanel(
  container: HTMLElement,
  layer: Layer | null | undefined,
  context: TextPaddingContext,
  onBack: () => void
): () => void {
  const targetLayer = layer || null;
  TextPaddingService.captureInitialState(targetLayer);
  const initialState = TextPaddingService.getCurrentPadding(targetLayer);

  const preactRoot = document.createElement("div");
  preactRoot.className = "preact-padding-panel-wrapper";
  container.innerHTML = "";
  container.appendChild(preactRoot);

  render(
    <TextPaddingPanel
      initialState={initialState}
      context={context}
      onBack={() => {
        render(null, preactRoot);
        onBack();
      }}
    />,
    preactRoot
  );

  return () => {
    render(null, preactRoot);
  };
}
