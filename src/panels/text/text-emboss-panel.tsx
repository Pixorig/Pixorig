/** @jsx h */
import { h, render } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import type { Layer } from "../../core/layer";
import {
  TextEmbossService,
  type TextEmbossContext,
  type TextEmbossState,
} from "../../core/text/text-emboss-service";
import { PreactPanelHeader } from "../../ui/base/panel-header";
import { SliderControlGroup } from "../../ui/base/slider-control-group";

export interface TextEmbossPanelProps {
  initialState: TextEmbossState;
  context: TextEmbossContext;
  onBack: () => void;
}

export function TextEmbossPanel({
  initialState,
  context,
  onBack,
}: TextEmbossPanelProps) {
  const [state, setState] = useState<TextEmbossState>(initialState);
  const knobRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);

  const handleToggleEnabled = (enabled: boolean) => {
    const updated = TextEmbossService.setEnabled(enabled, context);
    setState(updated);
  };

  const handleReset = () => {
    const updated = TextEmbossService.resetEmboss(context);
    setState(updated);
  };

  const handleAngleChange = (angle: number) => {
    const updated = TextEmbossService.setAngle(angle, context);
    setState(updated);
  };

  const handleIntensityChange = (val: number) => {
    const updated = TextEmbossService.setIntensity(val, context);
    setState(updated);
  };

  const handleAmbientChange = (val: number) => {
    const updated = TextEmbossService.setAmbient(val, context);
    setState(updated);
  };

  const handleHardnessChange = (val: number) => {
    const updated = TextEmbossService.setHardness(val, context);
    setState(updated);
  };

  const handleBevelChange = (val: number) => {
    const updated = TextEmbossService.setBevel(val, context);
    setState(updated);
  };

  // Knob interaction
  const knobRadius = 45;
  const knobSize = knobRadius * 2;
  const rad = ((state.angle - 90) * Math.PI) / 180;
  const dotDist = knobRadius - 10;
  const dotX = knobRadius + dotDist * Math.cos(rad) - 4;
  const dotY = knobRadius + dotDist * Math.sin(rad) - 4;

  const handleKnobPointer = (clientX: number, clientY: number) => {
    const el = knobRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    let deg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI) + 90;
    if (deg < 0) deg += 360;
    deg = deg % 360;
    handleAngleChange(deg);
  };

  useEffect(() => {
    const onMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      handleKnobPointer(ev.clientX, ev.clientY);
    };

    const onMouseUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      if (knobRef.current) {
        knobRef.current.style.cursor = "grab";
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <div
      class="preact-emboss-panel-wrapper"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        userSelect: "none",
        padding: "12px 8px",
      }}
    >
      <PreactPanelHeader
        title="Emboss"
        onBack={onBack}
        onReset={handleReset}
      />

      {/* Switch Enabled Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 4px",
          borderBottom: "1px solid #333",
        }}
      >
        <span style={{ fontSize: "13px", color: "#ddd", fontWeight: "500" }}>
          Enabled
        </span>
        <label
          style={{
            position: "relative",
            display: "inline-block",
            width: "36px",
            height: "20px",
            margin: "0",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={state.enabled}
            style={{ opacity: "0", width: "0", height: "0" }}
            onChange={(e: Event) =>
              handleToggleEnabled((e.target as HTMLInputElement).checked)
            }
          />
          <span
            style={{
              position: "absolute",
              cursor: "pointer",
              top: "0",
              left: "0",
              right: "0",
              bottom: "0",
              backgroundColor: state.enabled ? "#00f260" : "#444",
              borderRadius: "20px",
              transition: "0.2s",
            }}
          >
            <span
              style={{
                position: "absolute",
                content: '""',
                height: "14px",
                width: "14px",
                left: state.enabled ? "19px" : "3px",
                bottom: "3px",
                backgroundColor: "#fff",
                borderRadius: "50%",
                transition: "0.2s",
              }}
            />
          </span>
        </label>
      </div>

      {state.enabled && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Light angle container */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              padding: "4px 0",
            }}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                fontSize: "12px",
                color: "#ccc",
              }}
            >
              <span>Light angle</span>
              <span>{state.angle}°</span>
            </div>

            <div
              ref={knobRef}
              style={{
                width: `${knobSize}px`,
                height: `${knobSize}px`,
                borderRadius: "50%",
                border: "2px solid #444",
                backgroundColor: "#222",
                position: "relative",
                cursor: "grab",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseDown={(e: MouseEvent) => {
                isDraggingRef.current = true;
                if (knobRef.current) knobRef.current.style.cursor = "grabbing";
                handleKnobPointer(e.clientX, e.clientY);
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "#fff",
                  userSelect: "none",
                }}
              >
                {state.angle}°
              </span>
              <div
                style={{
                  position: "absolute",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "#00f260",
                  pointerEvents: "none",
                  left: `${dotX}px`,
                  top: `${dotY}px`,
                }}
              />
            </div>

            <input
              type="number"
              min="0"
              max="360"
              value={state.angle}
              style={{
                width: "70px",
                padding: "4px 8px",
                fontSize: "12px",
                textAlign: "center",
                backgroundColor: "#2a2a2a",
                border: "1px solid #444",
                borderRadius: "4px",
                color: "#fff",
              }}
              onChange={(e: Event) => {
                let val = parseInt((e.target as HTMLInputElement).value, 10);
                if (isNaN(val)) val = 0;
                handleAngleChange(val);
              }}
            />
          </div>

          {/* Advanced Slider Controls */}
          <div
            style={{
              fontSize: "11px",
              fontWeight: "600",
              color: "#888",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginTop: "4px",
            }}
          >
            Advanced
          </div>

          <SliderControlGroup
            label="Intensity"
            value={state.intensity}
            min={0}
            max={100}
            sliderMin={0}
            sliderMax={100}
            btnStep={1}
            onChange={handleIntensityChange}
          />

          <SliderControlGroup
            label="Ambient light"
            value={state.ambient}
            min={0}
            max={100}
            sliderMin={0}
            sliderMax={100}
            btnStep={1}
            onChange={handleAmbientChange}
          />

          <SliderControlGroup
            label="Specular Hardness"
            value={state.hardness}
            min={0}
            max={100}
            sliderMin={0}
            sliderMax={100}
            btnStep={1}
            onChange={handleHardnessChange}
          />

          <SliderControlGroup
            label="Bevel"
            value={state.bevel}
            min={0}
            max={100}
            sliderMin={0}
            sliderMax={100}
            btnStep={1}
            onChange={handleBevelChange}
          />
        </div>
      )}
    </div>
  );
}

export function mountTextEmbossPanel(
  container: HTMLElement,
  targetLayer: Layer | null | undefined,
  context: TextEmbossContext,
  onBack: () => void,
  opts: { autoEnable?: boolean } = {}
): () => void {
  // Mở panel từ menu = bật hiệu ứng luôn (UX nhanh)
  if (targetLayer && opts.autoEnable !== false && !targetLayer.embossEnabled) {
    targetLayer.embossEnabled = true;
  }

  // Ghi mốc THAM SỐ LÚC MỞ PANEL khi mở từ menu
  if (targetLayer && opts.autoEnable !== false) {
    TextEmbossService.captureInitialState(targetLayer);
  }

  const initialState = TextEmbossService.getState(targetLayer);

  container.innerHTML = "";

  const preactRoot = document.createElement("div");
  preactRoot.className = "preact-emboss-panel-wrapper";
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
    <TextEmbossPanel
      initialState={initialState}
      context={context}
      onBack={handleBack}
    />,
    preactRoot
  );

  return cleanup;
}
