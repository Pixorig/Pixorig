/** @jsx h */
import { h, render } from "preact";
import { useState } from "preact/hooks";
import {
  RotateService,
  type RotateServiceOptions,
} from "../../core/layer/rotate-service";
import { SliderControlGroup } from "../../ui/base/slider-control-group";
import { PreactPanelHeader } from "../../ui/base/panel-header";
import type { Layer } from "../../core/layer";

export interface RotatePanelProps {
  targetLayer: Layer | null | undefined;
  initialRotation: number;
  options?: RotateServiceOptions;
  onBack: () => void;
}

export function RotatePanel({
  targetLayer,
  initialRotation,
  options = {},
  onBack,
}: RotatePanelProps) {
  const [rotation, setRotation] = useState<number>(initialRotation);

  const handleRotationChange = (val: number) => {
    setRotation(val);
    RotateService.setRotation(targetLayer, val, options);
  };

  const handleReset = () => {
    const resetVal = RotateService.resetRotation(targetLayer, options);
    setRotation(resetVal);
  };

  return (
    <div
      class="rotate-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        userSelect: "none",
        padding: "12px 8px",
      }}
    >
      <PreactPanelHeader
        title="Rotate"
        onBack={onBack}
        onReset={handleReset}
      />
      <SliderControlGroup
        label="Angle"
        value={rotation}
        min={-180}
        max={180}
        sliderMin={-180}
        sliderMax={180}
        btnStep={1}
        unit="°"
        onChange={handleRotationChange}
      />
    </div>
  );
}

/**
 * Mount RotatePanel into container
 */
export function mountRotatePanel(
  container: HTMLElement,
  targetLayer: Layer | null | undefined,
  options: RotateServiceOptions = {},
  onBack: () => void
): () => void {
  RotateService.captureInitialState(targetLayer);
  const initialRotation = RotateService.getRotation(targetLayer);

  const preactRoot = document.createElement("div");
  preactRoot.className = "preact-rotate-panel-wrapper";
  container.innerHTML = "";
  container.appendChild(preactRoot);

  render(
    <RotatePanel
      targetLayer={targetLayer}
      initialRotation={initialRotation}
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
