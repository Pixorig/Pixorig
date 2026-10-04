/** @jsx h */
import { h, render } from "preact";
import { useState } from "preact/hooks";
import { TextSizeService, type TextSizeContext } from "../../core/text/text-size-service";
import { SliderControlGroup } from "../../ui/base/slider-control-group";
import { PreactPanelHeader } from "../../ui/base/panel-header";
import type { Layer } from "../../core/layer";

interface TextSizePanelProps {
  initialSize: number;
  context: TextSizeContext;
  onBack: () => void;
}

export function TextSizePanel({ initialSize, context, onBack }: TextSizePanelProps) {
  const [size, setSize] = useState(initialSize);

  const handleSizeChange = (newSize: number) => {
    setSize(newSize);
    TextSizeService.applySize(newSize, context);
  };

  const handleReset = () => {
    const resetVal = TextSizeService.resetSize(context);
    setSize(resetVal);
  };

  return (
    <div
      class="size-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        userSelect: "none",
        padding: "12px 8px",
      }}
    >
      <PreactPanelHeader title="Text Size" onBack={onBack} onReset={handleReset} />
      <SliderControlGroup
        label="Size"
        value={size}
        min={1}
        max={1000}
        sliderMin={2}
        sliderMax={300}
        btnStep={1}
        onChange={handleSizeChange}
      />
    </div>
  );
}

/**
 * Mount Preact component into native DOM container
 */
export function mountTextSizePanel(
  container: HTMLElement,
  layer: Layer | null | undefined,
  context: TextSizeContext,
  onBack: () => void
): () => void {
  const targetLayer = layer || null;
  TextSizeService.captureInitialState(targetLayer);
  const currentSize = TextSizeService.getCurrentSize(targetLayer);

  // Tạo container con cho Preact thay vì xoá sạch container cha
  const preactRoot = document.createElement("div");
  preactRoot.className = "preact-size-panel-wrapper";
  container.innerHTML = "";
  container.appendChild(preactRoot);

  render(
    <TextSizePanel
      initialSize={currentSize}
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
