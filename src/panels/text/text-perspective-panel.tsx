/** @jsx h */
import { h, render } from "preact";
import { useState } from "preact/hooks";
import type { Layer } from "../../core/layer";
import {
  TextPerspectiveService,
  type TextPerspectiveContext,
  type TextPerspectiveState,
} from "../../core/text/text-perspective-service";
import { PreactPanelHeader } from "../../ui/base/panel-header";

export interface TextPerspectivePanelProps {
  initialState: TextPerspectiveState;
  context: TextPerspectiveContext;
  onBack: () => void;
}

export function TextPerspectivePanel({
  initialState,
  context,
  onBack,
}: TextPerspectivePanelProps) {
  const [state, setState] = useState<TextPerspectiveState>(initialState);

  const handleToggleEnabled = (checked: boolean) => {
    const updated = TextPerspectiveService.setEnabled(checked, context);
    setState(updated);
  };

  const handleResetPoints = () => {
    const updated = TextPerspectiveService.resetPoints(context);
    setState(updated);
  };

  const handleHeaderReset = () => {
    const updated = TextPerspectiveService.restoreSnapshot(context);
    setState(updated);
  };

  return (
    <div
      class="preact-perspective-panel-wrapper"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        userSelect: "none",
        padding: "12px 8px",
      }}
    >
      <PreactPanelHeader
        title="Perspective"
        onBack={onBack}
        onReset={handleHeaderReset}
      />

      {/* Enabled switch row */}
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

      {/* Reset button row */}
      <button
        type="button"
        style={{
          width: "100%",
          padding: "8px 12px",
          background: "#2a2a2a",
          border: "1px solid #444",
          borderRadius: "4px",
          color: "#fff",
          fontSize: "13px",
          fontWeight: "500",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          transition: "background 0.2s",
        }}
        onClick={handleResetPoints}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
        </svg>
        <span>Reset Points</span>
      </button>
    </div>
  );
}

export function mountTextPerspectivePanel(
  container: HTMLElement,
  targetLayer: Layer | null | undefined,
  context: TextPerspectiveContext,
  onBack: () => void
): () => void {
  // Bật chế độ perspective handles trên overlay
  if (context.setPerspectiveMode) {
    context.setPerspectiveMode(true);
  }

  TextPerspectiveService.captureInitialState(targetLayer);
  const initialState = TextPerspectiveService.getState(targetLayer);

  container.innerHTML = "";

  const preactRoot = document.createElement("div");
  preactRoot.className = "preact-perspective-panel-wrapper";
  container.appendChild(preactRoot);

  const cleanup = () => {
    if (context.setPerspectiveMode) {
      context.setPerspectiveMode(false);
    }
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
    <TextPerspectivePanel
      initialState={initialState}
      context={context}
      onBack={handleBack}
    />,
    preactRoot
  );

  return cleanup;
}
