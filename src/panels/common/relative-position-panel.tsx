/** @jsx h */
import { h, render } from "preact";
import {
  PositionService,
  type PositionAlignment,
  type PositionServiceOptions,
} from "../../core/layer/position-service";
import { PreactPanelHeader } from "../../ui/base/panel-header";
import type { Layer } from "../../core/layer";

export interface RelativePositionPanelProps {
  targetLayer: Layer | null | undefined;
  options?: PositionServiceOptions;
  onBack: () => void;
}

const btnStyle = {
  flex: "1",
  padding: "12px 8px",
  background: "#2a2a2a",
  border: "1px solid #444",
  borderRadius: "6px",
  color: "#fff",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export function RelativePositionPanel({
  targetLayer,
  options = {},
  onBack,
}: RelativePositionPanelProps) {
  const handleAlign = (type: PositionAlignment) => {
    PositionService.alignLayer(targetLayer, type, options);
  };

  return (
    <div
      class="relative-position-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        userSelect: "none",
        padding: "12px 8px",
      }}
    >
      <PreactPanelHeader
        title="Relative Position"
        onBack={onBack}
        onReset={() => {}}
      />

      <label style={{ fontSize: "11px", color: "#999", display: "block" }}>
        Horizontal Alignment
      </label>
      <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
        {/* Align Left */}
        <button
          type="button"
          id="rel-align-left"
          title="Align Left"
          style={btnStyle}
          onClick={() => handleAlign("left")}
        >
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path
              fill="currentColor"
              d="M4 4h2v16H4V4zm6 7h10v2H10v3l-5-4 5-4v3z"
            />
          </svg>
        </button>

        {/* Align Center Horizontal */}
        <button
          type="button"
          id="rel-align-center-h"
          title="Align Center Horizontal"
          style={btnStyle}
          onClick={() => handleAlign("center-h")}
        >
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path
              fill="currentColor"
              d="M11 2h2v4h-2V2zm0 16h2v4h-2v-4zm-4-7V8l-5 4 5 4v-3h10v3l5-4-5-4v3H7z"
            />
          </svg>
        </button>

        {/* Align Right */}
        <button
          type="button"
          id="rel-align-right"
          title="Align Right"
          style={btnStyle}
          onClick={() => handleAlign("right")}
        >
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path
              fill="currentColor"
              d="M18 4h2v16h-2V4zm-4 7H4v2h10v3l5-4-5-4v3z"
            />
          </svg>
        </button>
      </div>

      <label
        style={{
          fontSize: "11px",
          color: "#999",
          display: "block",
          marginTop: "8px",
        }}
      >
        Vertical Alignment
      </label>
      <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
        {/* Align Top */}
        <button
          type="button"
          id="rel-align-top"
          title="Align Top"
          style={btnStyle}
          onClick={() => handleAlign("top")}
        >
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path
              fill="currentColor"
              d="M4 4h16v2H4V4zm7 6v10h2V10h3l-4-5-4 5h3z"
            />
          </svg>
        </button>

        {/* Align Center Vertical */}
        <button
          type="button"
          id="rel-align-center-v"
          title="Align Center Vertical"
          style={btnStyle}
          onClick={() => handleAlign("center-v")}
        >
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path
              fill="currentColor"
              d="M2 11h4v2H2v-2zm16 0h4v2h-4v-2zm-7-4h3l-4-5-4 5h3v10H6l4 5 4-5h-3V7z"
            />
          </svg>
        </button>

        {/* Align Bottom */}
        <button
          type="button"
          id="rel-align-bottom"
          title="Align Bottom"
          style={btnStyle}
          onClick={() => handleAlign("bottom")}
        >
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path
              fill="currentColor"
              d="M4 18h16v2H4v-2zm7-4V4h2v10h3l-4 5-4-5h3z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * Mount RelativePositionPanel into container
 */
export function mountRelativePositionPanel(
  container: HTMLElement,
  targetLayer: Layer | null | undefined,
  options: PositionServiceOptions = {},
  onBack: () => void
): () => void {
  const preactRoot = document.createElement("div");
  preactRoot.className = "preact-relative-position-panel-wrapper";
  container.innerHTML = "";
  container.appendChild(preactRoot);

  render(
    <RelativePositionPanel
      targetLayer={targetLayer}
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
