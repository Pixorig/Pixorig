/** @jsx h */
import { h, render } from "preact";
import { useState } from "preact/hooks";
import type { Layer } from "../../core/layer";
import {
  TextSpacingService,
  type TextSpacingContext,
  type TextSpacingState,
} from "../../core/text/text-spacing-service";
import { PreactPanelHeader } from "../../ui/base/panel-header";
import { PreactTabBar } from "../../ui/base/tab-bar";
import { SliderControlGroup } from "../../ui/base/slider-control-group";

type SpacingTab = "letters" | "words";

interface TextSpacingPanelProps {
  initialState: TextSpacingState;
  context: TextSpacingContext;
  onBack: () => void;
}

export function TextSpacingPanel({
  initialState,
  context,
  onBack,
}: TextSpacingPanelProps) {
  const [spacingState, setSpacingState] = useState<TextSpacingState>(initialState);
  const [activeTab, setActiveTab] = useState<SpacingTab>("letters");

  const handleReset = () => {
    const next = TextSpacingService.resetSpacing(context);
    setSpacingState(next);
  };

  const handleSliderChange = (val: number) => {
    if (activeTab === "letters") {
      TextSpacingService.setLetterSpacing(val, context);
      setSpacingState((prev) => ({ ...prev, letterSpacing: Math.round(val) }));
    } else {
      TextSpacingService.setWordSpacing(val, context);
      setSpacingState((prev) => ({ ...prev, wordSpacing: Math.round(val) }));
    }
  };

  const currentValue =
    activeTab === "letters"
      ? spacingState.letterSpacing
      : spacingState.wordSpacing;

  return (
    <div
      class="preact-spacing-panel-wrapper"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        userSelect: "none",
        padding: "12px 8px",
      }}
    >
      <PreactPanelHeader
        title="Spacing"
        onBack={onBack}
        onReset={handleReset}
      />

      <PreactTabBar<SpacingTab>
        tabs={[
          { id: "letters", label: "Letters" },
          { id: "words", label: "Words" },
        ]}
        active={activeTab}
        onChange={(tab) => setActiveTab(tab)}
      />

      <div style={{ marginTop: "4px" }}>
        <SliderControlGroup
          label="Spacing"
          value={currentValue}
          min={-30}
          max={100}
          sliderMin={-30}
          sliderMax={100}
          btnStep={1}
          onChange={handleSliderChange}
        />
      </div>
    </div>
  );
}

export function mountTextSpacingPanel(
  container: HTMLElement,
  targetLayer: Layer | null | undefined,
  context: TextSpacingContext,
  onBack: () => void
): () => void {
  TextSpacingService.captureSpacingInitial(targetLayer);
  const initialState = TextSpacingService.getSpacingState(targetLayer);

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
    <TextSpacingPanel
      initialState={initialState}
      context={context}
      onBack={handleBack}
    />,
    preactRoot
  );

  return cleanup;
}
