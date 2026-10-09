/** @jsx h */
import { h, render } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import type { Layer, LayerManager } from "../../core/layer";
import {
  Text3DShadowService,
  type Text3DShadowContext,
  type Text3DShadowState,
} from "../../core/text/text-3d-shadow-service";
import { PreactPanelHeader } from "../../ui/base/panel-header";
import { SliderControlGroup } from "../../ui/base/slider-control-group";
import { mountColorPanel } from "../common/color-panel";

export interface Text3DShadowPanelContext extends Text3DShadowContext {
  layerManager?: LayerManager;
}

export interface Text3DShadowPanelProps {
  initialState: Text3DShadowState;
  context: Text3DShadowPanelContext;
  containerGroup: HTMLElement;
  onBack: () => void;
  onRefreshPanel: () => void;
}

export function Text3DShadowPanel({
  initialState,
  context,
  containerGroup,
  onBack,
  onRefreshPanel,
}: Text3DShadowPanelProps) {
  const [state, setState] = useState<Text3DShadowState>(initialState);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  const handleReset = () => {
    const updated = Text3DShadowService.reset(context);
    setState(updated);
  };

  const handleOpenColorPicker = () => {
    containerGroup.dataset._savedInner_3d_shadow = containerGroup.innerHTML;
    mountColorPanel(containerGroup, {
      layerManager: context.layerManager,
      onColorChange: (color) => {
        const updated = Text3DShadowService.setColor(color, context);
        setState(updated);
      },
      onClose: () => {
        onRefreshPanel();
      },
    }, () => {});
  };

  const handleDeleteColor = () => {
    const updated = Text3DShadowService.resetColor(context);
    setState(updated);
  };

  const handleOpacityChange = (val: number) => {
    const updated = Text3DShadowService.setOpacity(val, context);
    setState(updated);
  };

  const handleBlurChange = (val: number) => {
    const updated = Text3DShadowService.setBlur(val, context);
    setState(updated);
  };

  const handleExpandChange = (val: number) => {
    const updated = Text3DShadowService.setExpand(val, context);
    setState(updated);
  };

  const drawShadowCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.min(centerX, centerY) - 20;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw center circle (text position)
    ctx.fillStyle = "#3a3a3a";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#00f260";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw shadow direction line and handle
    if (state.enabled) {
      const angleRad = ((state.angle ?? 135) * Math.PI) / 180;
      const distance = ((state.distance ?? 26) / 100) * maxRadius;

      const handleX = centerX + Math.cos(angleRad) * distance;
      const handleY = centerY + Math.sin(angleRad) * distance;

      ctx.strokeStyle = "#00f260";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(handleX, handleY);
      ctx.stroke();

      ctx.fillStyle = "#00f260";
      ctx.beginPath();
      ctx.arc(handleX, handleY, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.fillStyle = "#999";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Drag to set shadow direction", centerX, canvas.height - 5);
  };

  useEffect(() => {
    drawShadowCanvas();
  }, [state.enabled, state.angle, state.distance]);

  const handleCanvasPointer = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.min(centerX, centerY) - 20;

    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angleRad = Math.atan2(dy, dx);

    const deg = ((angleRad * 180) / Math.PI + 360) % 360;
    const distPct = Math.min(100, (Math.min(distance, maxRadius) / maxRadius) * 100);

    const updated = Text3DShadowService.setAngleAndDistance(deg, distPct, context);
    setState(updated);
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      handleCanvasPointer(e.clientX, e.clientY);
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const hasColor = state.enabled;

  return (
    <div
      class="preact-3d-shadow-panel-wrapper"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        userSelect: "none",
        padding: "12px 8px",
      }}
    >
      <PreactPanelHeader
        title="3D Shadow"
        onBack={onBack}
        onReset={handleReset}
      />

      {/* Color row */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <button
          type="button"
          style={{
            flex: "1",
            background: "#2a2a2a",
            border: "1px solid #444",
            borderRadius: "4px",
            color: "#fff",
            padding: "6px 10px",
            cursor: "pointer",
            fontSize: "12px",
          }}
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
            color: hasColor ? "#ff4d4d" : "#666",
            padding: "6px 10px",
            cursor: hasColor ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          disabled={!hasColor}
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

      {/* Direction Canvas */}
      <canvas
        ref={canvasRef}
        width={200}
        height={200}
        style={{
          width: "200px",
          height: "200px",
          background: "#2a2a2a",
          borderRadius: "8px",
          cursor: "crosshair",
          margin: "4px auto",
          display: "block",
        }}
        onMouseDown={(e: MouseEvent) => {
          isDraggingRef.current = true;
          handleCanvasPointer(e.clientX, e.clientY);
        }}
      />

      {/* Sliders */}
      <SliderControlGroup
        label="Opacity"
        value={state.opacity}
        min={0}
        max={100}
        sliderMin={0}
        sliderMax={100}
        step={1}
        btnStep={1}
        unit="%"
        onChange={handleOpacityChange}
      />

      <SliderControlGroup
        label="Blur radius"
        value={state.blur}
        min={0}
        max={25}
        sliderMin={0}
        sliderMax={25}
        step={1}
        btnStep={1}
        onChange={handleBlurChange}
      />

      <SliderControlGroup
        label="Expand by"
        value={state.expand}
        min={0}
        max={50}
        sliderMin={0}
        sliderMax={50}
        step={1}
        btnStep={1}
        onChange={handleExpandChange}
      />
    </div>
  );
}

export function mountText3DShadowPanel(
  container: HTMLElement,
  targetLayer: Layer | null | undefined,
  context: Text3DShadowPanelContext,
  onBack: () => void,
  opts: { captureSnapshotValues?: boolean } = {}
): () => void {
  if (targetLayer && opts.captureSnapshotValues !== false) {
    Text3DShadowService.captureInitialState(targetLayer);
  }

  const initialState = Text3DShadowService.getState(targetLayer);

  container.innerHTML = "";

  const preactRoot = document.createElement("div");
  preactRoot.className = "preact-3d-shadow-panel-wrapper";
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
    const currState = Text3DShadowService.getState(active);
    render(
      <Text3DShadowPanel
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
    <Text3DShadowPanel
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
