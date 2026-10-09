/** @jsx h */
import { h, render } from "preact";
import { useState } from "preact/hooks";
import { PreactPanelHeader } from "../../ui/base/panel-header";
import { PreactTabBar } from "../../ui/base/tab-bar";

type CutoutTab = "auto" | "manual";

function CutoutPanel({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<CutoutTab>("auto");

  const handleReset = () => {
    setActiveTab("auto");
  };

  return (
    <div
      class="cutout-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        userSelect: "none",
        padding: "12px 8px",
      }}
    >
      <PreactPanelHeader title="Cutout" onBack={onBack} onReset={handleReset} />

      <PreactTabBar<CutoutTab>
        tabs={[
          { id: "auto", label: "Auto" },
          { id: "manual", label: "Manual" },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "auto" ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            padding: "10px 4px",
          }}
        >
          <button
            type="button"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
              padding: "10px 12px",
              background: "#00f260",
              color: "#000",
              border: "none",
              borderRadius: "6px",
              fontWeight: "600",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            Auto Remove Background
          </button>
          <span style={{ fontSize: "11px", color: "#888", textAlign: "center" }}>
            Automatically detect subject and remove background
          </span>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            padding: "10px 4px",
          }}
        >
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              style={{
                flex: "1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "8px",
                background: "#2a2a2a",
                color: "#fff",
                border: "1px solid #444",
                borderRadius: "6px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M18 13l-5-5-8 8 5 5 8-8z" />
                <path d="M14 8l3 3" />
              </svg>
              Erase
            </button>
            <button
              type="button"
              style={{
                flex: "1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "8px",
                background: "#2a2a2a",
                color: "#fff",
                border: "1px solid #444",
                borderRadius: "6px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              </svg>
              Restore
            </button>
          </div>
          <span style={{ fontSize: "11px", color: "#888", textAlign: "center" }}>
            Brush on image to erase or restore areas
          </span>
        </div>
      )}
    </div>
  );
}

export function mountCutoutPanel(
  container: HTMLElement,
  _options: { layerManager?: any },
  onBack: () => void
): () => void {
  const preactRoot = document.createElement("div");
  preactRoot.className = "preact-cutout-panel-wrapper";
  container.innerHTML = "";
  container.appendChild(preactRoot);

  render(
    <CutoutPanel
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
