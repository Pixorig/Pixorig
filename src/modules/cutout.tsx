/**
 * Cutout Module - UI Only
 * Sub-panel for Cutout feature with TabBar (Auto / Manual)
 */

import { h } from "../ui/jsx";
import { TabBar } from "../ui/TabBar";
import { LayerManager } from "../core/layer";

export class CutoutModule {
  private static activeTab: "auto" | "manual" = "auto";

  static open(container: HTMLElement, _options?: { layerManager?: LayerManager }): void {
    if (!container) return;

    if (!container.dataset._savedInner) {
      container.dataset._savedInner = container.innerHTML;
    }

    const render = () => {
      container.innerHTML = "";

      const panel = (
        <div
          class="cutout-panel"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            userSelect: "none",
            padding: "8px 4px",
          }}
        ></div>
      ) as HTMLElement;

      // 1. Header (Back button + Title)
      const headerRow = (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            paddingBottom: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              class="btn-back-cutout"
              style={{
                background: "transparent",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                padding: "4px",
              }}
              title="Quay lại"
              onClick={() => this.close(container)}
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span style={{ fontWeight: "600", fontSize: "14px", color: "#fff" }}>
              Cutout
            </span>
          </div>
        </div>
      ) as HTMLElement;
      panel.appendChild(headerRow);

      // 2. TabBar [Auto][Manual]
      const tabBar = TabBar<"auto" | "manual">({
        tabs: [
          { id: "auto", label: "Auto" },
          { id: "manual", label: "Manual" },
        ],
        active: this.activeTab,
        onChange: (id) => {
          this.activeTab = id;
          render();
        },
      });
      panel.appendChild(tabBar);

      // 3. Tab Content
      if (this.activeTab === "auto") {
        const autoContent = (
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
        );
        panel.appendChild(autoContent);
      } else {
        const manualContent = (
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
        );
        panel.appendChild(manualContent);
      }

      container.appendChild(panel);
    };

    render();
  }

  static close(container: HTMLElement): void {
    if (!container) return;
    if (container.dataset._savedInner) {
      container.innerHTML = container.dataset._savedInner;
      delete container.dataset._savedInner;
    }
  }
}
