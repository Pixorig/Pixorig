/** @jsx h */
import { h, render } from "preact";
import { useState } from "preact/hooks";
import type { Layer } from "../../core/layer";
import {
  Text3DRotateService,
  type Text3DRotateContext,
  type Text3DRotateState,
} from "../../core/text/text-3d-rotate-service";
import { PreactPanelHeader } from "../../ui/base/panel-header";
import { SliderControlGroup } from "../../ui/base/slider-control-group";

export interface Text3DRotatePanelProps {
  initialState: Text3DRotateState;
  context: Text3DRotateContext;
  onBack: () => void;
}

export function Text3DRotatePanel({
  initialState,
  context,
  onBack,
}: Text3DRotatePanelProps) {
  const [state, setState] = useState<Text3DRotateState>(initialState);

  const handleReset = () => {
    const updated = Text3DRotateService.resetRotate(context);
    setState(updated);
  };

  const handleRotateXChange = (val: number) => {
    const updated = Text3DRotateService.setRotateX(val, context);
    setState(updated);
  };

  const handleRotateYChange = (val: number) => {
    const updated = Text3DRotateService.setRotateY(val, context);
    setState(updated);
  };

  return (
    <div
      class="preact-3d-rotate-panel-wrapper"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        userSelect: "none",
        padding: "12px 8px",
      }}
    >
      <PreactPanelHeader
        title="3D Rotate"
        onBack={onBack}
        onReset={handleReset}
      />

      <SliderControlGroup
        label="X axis"
        value={state.rotateX}
        min={-180}
        max={180}
        sliderMin={-180}
        sliderMax={180}
        step={1}
        btnStep={1}
        unit="°"
        onChange={handleRotateXChange}
      />

      <SliderControlGroup
        label="Y axis"
        value={state.rotateY}
        min={-180}
        max={180}
        sliderMin={-180}
        sliderMax={180}
        step={1}
        btnStep={1}
        unit="°"
        onChange={handleRotateYChange}
      />
    </div>
  );
}

export function mountText3DRotatePanel(
  container: HTMLElement,
  targetLayer: Layer | null | undefined,
  context: Text3DRotateContext,
  onBack: () => void
): () => void {
  if (targetLayer) {
    Text3DRotateService.captureInitialState(targetLayer);
  }

  const initialState = Text3DRotateService.getState(targetLayer);

  container.innerHTML = "";

  const preactRoot = document.createElement("div");
  preactRoot.className = "preact-3d-rotate-panel-wrapper";
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
    <Text3DRotatePanel
      initialState={initialState}
      context={context}
      onBack={handleBack}
    />,
    preactRoot
  );

  return cleanup;
}
