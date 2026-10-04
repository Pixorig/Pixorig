/** @jsx h */
import { h, render } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import type { Layer, LayerManager } from "../../core/layer";
import {
  Text3DService,
  type Text3DContext,
  type Text3DState,
} from "../../core/text/text-3d-service";
import { PreactPanelHeader } from "../../ui/base/panel-header";
import { PreactTabBar } from "../../ui/base/tab-bar";
import { SliderControlGroup } from "../../ui/base/slider-control-group";
import { ColorModule } from "../../modules/color";

export interface Text3DPanelContext extends Text3DContext {
  layerManager?: LayerManager;
}

export interface Text3DPanelProps {
  initialState: Text3DState;
  context: Text3DPanelContext;
  containerGroup: HTMLElement;
  onBack: () => void;
  onRefreshPanel: () => void;
}

export function Text3DPanel({
  initialState,
  context,
  containerGroup,
  onBack,
  onRefreshPanel,
}: Text3DPanelProps) {
  const [state, setState] = useState<Text3DState>(initialState);
  const knobRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);

  const handleReset = () => {
    const updated = Text3DService.reset(context);
    setState(updated);
  };

  const handleViewTypeChange = (viewType: "perspective" | "oblique") => {
    const updated = Text3DService.setViewType(viewType, context);
    setState(updated);
  };

  const handleDepthChange = (depth: number) => {
    const updated = Text3DService.setDepth(depth, context);
    setState(updated);
  };

  const handleColorModeChange = (mode: "auto" | "color") => {
    const updated = Text3DService.setColorMode(mode, context);
    setState(updated);
  };

  const handleOpenColorPicker = () => {
    if (state.colorMode !== "color") return;
    containerGroup.dataset._savedInner_3dText = containerGroup.innerHTML;
    ColorModule.open(containerGroup, {
      layerManager: context.layerManager,
      onColorChange: (color) => {
        const updated = Text3DService.setColor(color, context);
        setState(updated);
      },
      onClose: () => {
        onRefreshPanel();
      },
    });
  };

  const handleDeleteColor = () => {
    const updated = Text3DService.resetColor(context);
    setState(updated);
  };

  const handleDarkenChange = (darken: number) => {
    const updated = Text3DService.setDarken(darken, context);
    setState(updated);
  };

  const handleResetRotation = () => {
    const updated = Text3DService.reset3DRotation(context);
    setState(updated);
  };

  const handleRotateXChange = (val: number) => {
    const updated = Text3DService.setRotateX(val, context);
    setState(updated);
  };

  const handleRotateYChange = (val: number) => {
    const updated = Text3DService.setRotateY(val, context);
    setState(updated);
  };

  const handleRotateZChange = (val: number) => {
    const updated = Text3DService.setRotateZ(val, context);
    setState(updated);
  };

  const handleLightingToggle = (checked: boolean) => {
    const updated = Text3DService.setLightingEnabled(checked, context);
    setState(updated);
  };

  const handleLightAngleChange = (deg: number) => {
    const updated = Text3DService.setLightAngle(deg, context);
    setState(updated);
  };

  const handleIntensityChange = (val: number) => {
    const updated = Text3DService.setLightIntensity(val, context);
    setState(updated);
  };

  const handleShadowChange = (val: number) => {
    const updated = Text3DService.setLightShadow(val, context);
    setState(updated);
  };

  const handleSpecularChange = (val: number) => {
    const updated = Text3DService.setLightSpecular(val, context);
    setState(updated);
  };

  // Knob interaction
  const knobRadius = 45;
  const knobSize = knobRadius * 2;
  const rad = ((state.lightAngle - 90) * Math.PI) / 180;
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
    handleLightAngleChange(deg);
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

  const isColorTab = state.colorMode === "color";
  const hasCustomColor = isColorTab && !!state.color;

  return (
    <div
      class="preact-3d-text-panel-wrapper"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        userSelect: "none",
        padding: "12px 8px",
      }}
    >
      <PreactPanelHeader
        title="3D Text"
        onBack={onBack}
        onReset={handleReset}
      />

      {/* View type */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <span style={{ fontSize: "12px", color: "#aaa" }}>View type:</span>
        <PreactTabBar
          tabs={[
            { id: "perspective", label: "Perspective" },
            { id: "oblique", label: "Oblique" },
          ]}
          active={state.viewType}
          onChange={(id) => handleViewTypeChange(id as "perspective" | "oblique")}
        />
      </div>

      {/* Depth slider */}
      <SliderControlGroup
        label="Depth"
        value={state.depth}
        min={1}
        max={100}
        sliderMin={1}
        sliderMax={100}
        step={1}
        btnStep={1}
        onChange={handleDepthChange}
      />

      {/* Color TabBar & Controls */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <PreactTabBar
          tabs={[
            { id: "color", label: "Color" },
            { id: "auto", label: "Auto" },
          ]}
          active={state.colorMode}
          onChange={(id) => handleColorModeChange(id as "auto" | "color")}
        />

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            style={{
              flex: "1",
              background: isColorTab ? "#2a2a2a" : "rgba(255, 255, 255, 0.05)",
              border: "1px solid #444",
              borderRadius: "4px",
              color: isColorTab ? "#fff" : "#666",
              padding: "6px 10px",
              cursor: isColorTab ? "pointer" : "default",
              fontSize: "12px",
            }}
            disabled={!isColorTab}
            onClick={handleOpenColorPicker}
          >
            Select Color
          </button>
          <button
            type="button"
            style={{
              background: "#2a2a2a",
              border: "1px solid #444",
              borderRadius: "4px",
              color: hasCustomColor ? "#ff4d4d" : "#666",
              padding: "6px 10px",
              cursor: hasCustomColor ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            disabled={!hasCustomColor}
            onClick={handleDeleteColor}
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path
                fill="currentColor"
                d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Darken */}
      <SliderControlGroup
        label="Darken"
        value={state.darken}
        min={0}
        max={100}
        sliderMin={0}
        sliderMax={100}
        step={1}
        btnStep={1}
        unit="%"
        onChange={handleDarkenChange}
      />

      {/* 3D Rotation Section */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid #333",
          paddingTop: "8px",
          marginTop: "4px",
        }}
      >
        <span style={{ fontSize: "12px", fontWeight: "600", color: "#ccc" }}>
          3D Rotation
        </span>
        <button
          type="button"
          style={{
            background: "transparent",
            border: "none",
            color: "#00f260",
            cursor: "pointer",
            fontSize: "12px",
          }}
          onClick={handleResetRotation}
        >
          Reset
        </button>
      </div>

      <SliderControlGroup
        label="X rotation"
        value={state.rotateX}
        min={-80}
        max={80}
        sliderMin={-80}
        sliderMax={80}
        step={1}
        btnStep={1}
        unit="°"
        onChange={handleRotateXChange}
      />

      <SliderControlGroup
        label="Y rotation"
        value={state.rotateY}
        min={-80}
        max={80}
        sliderMin={-80}
        sliderMax={80}
        step={1}
        btnStep={1}
        unit="°"
        onChange={handleRotateYChange}
      />

      <SliderControlGroup
        label="Z rotation"
        value={state.rotateZ}
        min={-180}
        max={180}
        sliderMin={-180}
        sliderMax={180}
        step={1}
        btnStep={1}
        unit="°"
        onChange={handleRotateZChange}
      />

      {/* Simulate Lighting Section */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid #333",
          paddingTop: "8px",
          marginTop: "4px",
        }}
      >
        <span style={{ fontSize: "12px", fontWeight: "600", color: "#ccc" }}>
          Simulate lighting
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
            checked={state.lightingEnabled}
            style={{ opacity: "0", width: "0", height: "0" }}
            onChange={(e: Event) =>
              handleLightingToggle((e.target as HTMLInputElement).checked)
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
              backgroundColor: state.lightingEnabled ? "#00f260" : "#444",
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
                left: state.lightingEnabled ? "19px" : "3px",
                bottom: "3px",
                backgroundColor: "#fff",
                borderRadius: "50%",
                transition: "0.2s",
              }}
            />
          </span>
        </label>
      </div>

      {state.lightingEnabled && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
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
              <span>{state.lightAngle}°</span>
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
                {state.lightAngle}°
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
              value={state.lightAngle}
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
                handleLightAngleChange(val);
              }}
            />
          </div>

          <SliderControlGroup
            label="Intensity"
            value={state.lightIntensity}
            min={0}
            max={100}
            sliderMin={0}
            sliderMax={100}
            step={1}
            btnStep={1}
            onChange={handleIntensityChange}
          />

          <SliderControlGroup
            label="Shadow"
            value={state.lightShadow}
            min={0}
            max={100}
            sliderMin={0}
            sliderMax={100}
            step={1}
            btnStep={1}
            onChange={handleShadowChange}
          />

          <SliderControlGroup
            label="Specular Hardness"
            value={state.lightSpecular}
            min={0}
            max={100}
            sliderMin={0}
            sliderMax={100}
            step={1}
            btnStep={1}
            onChange={handleSpecularChange}
          />
        </div>
      )}
    </div>
  );
}

export function mountText3DPanel(
  container: HTMLElement,
  targetLayer: Layer | null | undefined,
  context: Text3DPanelContext,
  onBack: () => void
): () => void {
  if (targetLayer) {
    Text3DService.captureInitialState(targetLayer);
  }

  const initialState = Text3DService.getState(targetLayer);

  container.innerHTML = "";

  const preactRoot = document.createElement("div");
  preactRoot.className = "preact-3d-text-panel-wrapper";
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

  const refresh = () => {
    render(null, preactRoot);
    const active = context.getActiveTextLayer();
    const currState = Text3DService.getState(active);
    render(
      <Text3DPanel
        initialState={currState}
        context={context}
        containerGroup={container}
        onBack={handleBack}
        onRefreshPanel={refresh}
      />,
      preactRoot
    );
  };

  render(
    <Text3DPanel
      initialState={initialState}
      context={context}
      containerGroup={container}
      onBack={handleBack}
      onRefreshPanel={refresh}
    />,
    preactRoot
  );

  return cleanup;
}
