/** @jsx h */
import { h, render } from "preact";
import { useState } from "preact/hooks";
import type { Layer } from "../../core/layer";
import { TextCurveService, type TextCurveContext } from "../../core/text/text-curve-service";
import { PreactPanelHeader } from "../../ui/base/panel-header";
import { SliderControlGroup } from "../../ui/base/slider-control-group";

interface TextCurvePanelProps {
  initialBend: number;
  context: TextCurveContext;
  onBack: () => void;
}

export function TextCurvePanel({
  initialBend,
  context,
  onBack,
}: TextCurvePanelProps) {
  const [bend, setBend] = useState<number>(initialBend);

  const handleChange = (val: number) => {
    setBend(val);
    TextCurveService.applyBend(val, context);
  };

  const handleReset = () => {
    const resetVal = TextCurveService.resetBend(context);
    setBend(resetVal);
  };

  return (
    <div
      class="preact-curve-panel-wrapper"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        userSelect: "none",
        padding: "12px 8px",
      }}
    >
      <PreactPanelHeader
        title="Curve"
        onBack={onBack}
        onReset={handleReset}
      />

      <SliderControlGroup
        label="Bending"
        value={bend}
        min={-100}
        max={100}
        sliderMin={-100}
        sliderMax={100}
        step={1}
        btnStep={5}
        unit="%"
        onChange={handleChange}
      />
    </div>
  );
}

export function mountTextCurvePanel(
  container: HTMLElement,
  targetLayer: Layer | null | undefined,
  context: TextCurveContext,
  onBack: () => void
): () => void {
  TextCurveService.captureInitialState(targetLayer);
  const initialBend = TextCurveService.getCurrentBend(targetLayer);

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
    <TextCurvePanel
      initialBend={initialBend}
      context={context}
      onBack={handleBack}
    />,
    preactRoot
  );

  return cleanup;
}
