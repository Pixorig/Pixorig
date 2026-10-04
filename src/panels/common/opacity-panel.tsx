/** @jsx h */
import { h, render } from "preact";
import { useState } from "preact/hooks";
import {
  OpacityService,
  type OpacityServiceOptions,
} from "../../core/layer/opacity-service";
import { SliderControlGroup } from "../../ui/base/slider-control-group";
import { PreactPanelHeader } from "../../ui/base/panel-header";
import type { Layer } from "../../core/layer";

export interface OpacityPanelProps {
  targetLayer: Layer | null | undefined;
  initialOpacity: number;
  options?: OpacityServiceOptions;
  onBack: () => void;
}

export function OpacityPanel({
  targetLayer,
  initialOpacity,
  options = {},
  onBack,
}: OpacityPanelProps) {
  const [opacity, setOpacity] = useState<number>(initialOpacity);

  const handleOpacityChange = (val: number) => {
    setOpacity(val);
    OpacityService.setOpacity(targetLayer, val, options);
  };

  const handleReset = () => {
    const resetVal = OpacityService.resetOpacity(targetLayer, options);
    setOpacity(resetVal);
  };

  return (
    <div
      class="opacity-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        userSelect: "none",
        padding: "12px 8px",
      }}
    >
      <PreactPanelHeader
        title="Opacity"
        onBack={onBack}
        onReset={handleReset}
      />
      <SliderControlGroup
        label="Opacity"
        value={opacity}
        min={0}
        max={100}
        sliderMin={0}
        sliderMax={100}
        btnStep={5}
        unit="%"
        onChange={handleOpacityChange}
      />
    </div>
  );
}

/**
 * Mount OpacityPanel into container
 */
export function mountOpacityPanel(
  container: HTMLElement,
  targetLayer: Layer | null | undefined,
  options: OpacityServiceOptions = {},
  onBack: () => void
): () => void {
  OpacityService.captureInitialState(targetLayer);
  const initialOpacity = OpacityService.getOpacityPercent(targetLayer);

  const preactRoot = document.createElement("div");
  preactRoot.className = "preact-opacity-panel-wrapper";
  container.innerHTML = "";
  container.appendChild(preactRoot);

  render(
    <OpacityPanel
      targetLayer={targetLayer}
      initialOpacity={initialOpacity}
      options={options}
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
