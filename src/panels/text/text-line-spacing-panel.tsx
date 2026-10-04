/** @jsx h */
import { h, render } from "preact";
import { useState } from "preact/hooks";
import type { Layer } from "../../core/layer";
import {
  TextSpacingService,
  type TextSpacingContext,
} from "../../core/text/text-spacing-service";
import { PreactPanelHeader } from "../../ui/base/panel-header";
import { SliderControlGroup } from "../../ui/base/slider-control-group";

interface TextLineSpacingPanelProps {
  initialValue: number;
  context: TextSpacingContext;
  onBack: () => void;
}

export function TextLineSpacingPanel({
  initialValue,
  context,
  onBack,
}: TextLineSpacingPanelProps) {
  const [val, setVal] = useState<number>(initialValue);

  const handleReset = () => {
    const next = TextSpacingService.resetLineSpacing(context);
    setVal(next);
  };

  const handleChange = (newVal: number) => {
    TextSpacingService.setLineSpacing(newVal, context);
    setVal(Math.round(newVal));
  };

  return (
    <div
      class="preact-line-spacing-panel-wrapper"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        userSelect: "none",
        padding: "12px 8px",
      }}
    >
      <PreactPanelHeader
        title="Line Spacing"
        onBack={onBack}
        onReset={handleReset}
      />

      <SliderControlGroup
        label="Line Spacing"
        value={val}
        min={-100}
        max={100}
        sliderMin={-100}
        sliderMax={100}
        btnStep={1}
        onChange={handleChange}
      />
    </div>
  );
}

export function mountTextLineSpacingPanel(
  container: HTMLElement,
  targetLayer: Layer | null | undefined,
  context: TextSpacingContext,
  onBack: () => void
): () => void {
  TextSpacingService.captureLineSpacingInitial(targetLayer);
  const initialValue = TextSpacingService.getLineSpacing(targetLayer);

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
    <TextLineSpacingPanel
      initialValue={initialValue}
      context={context}
      onBack={handleBack}
    />,
    preactRoot
  );

  return cleanup;
}
