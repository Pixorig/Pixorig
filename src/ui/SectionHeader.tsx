/**
 * Section Header Component - Real DOM TSX
 * Renders a title with a divider line beneath it.
 */

import { h } from "./jsx";

export interface SectionHeaderButtonAction {
  type: "button";
  label?: string;
  onClick: (e: MouseEvent) => void;
  style?: Record<string, string>;
  title?: string;
  icon?: HTMLElement | SVGSVGElement;
}

export interface SectionHeaderSwitchAction {
  type: "switch";
  checked: boolean;
  onChange: (checked: boolean) => void;
  title?: string;
}

export type SectionHeaderAction =
  | SectionHeaderButtonAction
  | SectionHeaderSwitchAction
  | HTMLElement;

export interface SectionHeaderProps {
  title: string;
  style?: Record<string, string>;
  dividerColor?: string;
  action?: SectionHeaderAction;
}

export function SectionHeader(props: SectionHeaderProps): HTMLElement {
  const { title, style = {}, dividerColor = "#333333", action } = props;

  let actionEl: HTMLElement | null = null;
  if (action) {
    if (action instanceof HTMLElement) {
      actionEl = action;
    } else if (action.type === "button") {
      actionEl = (
        <button
          type="button"
          class="section-header-btn"
          title={action.title || ""}
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            color: "#ddd",
            fontSize: "11px",
            padding: "2px 7px",
            borderRadius: "4px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            ...action.style,
          }}
          onClick={action.onClick}
        >
          {action.icon ? action.icon : null}
          {action.label ? <span>{action.label}</span> : null}
        </button>
      ) as HTMLElement;
    } else if (action.type === "switch") {
      actionEl = (
        <label
          style={{
            position: "relative",
            display: "inline-block",
            width: "32px",
            height: "18px",
            cursor: "pointer",
            margin: "0",
          }}
          title={action.title || ""}
        >
          <input
            type="checkbox"
            checked={action.checked}
            style={{ opacity: "0", width: "0", height: "0", position: "absolute" }}
            onChange={(e: Event) => {
              action.onChange((e.target as HTMLInputElement).checked);
            }}
          />
          <span
            style={{
              position: "absolute",
              cursor: "pointer",
              top: "0",
              left: "0",
              right: "0",
              bottom: "0",
              backgroundColor: action.checked ? "#00f260" : "#444",
              transition: "0.2s",
              borderRadius: "18px",
            }}
          >
            <span
              style={{
                position: "absolute",
                content: '""',
                height: "14px",
                width: "14px",
                left: action.checked ? "16px" : "2px",
                bottom: "2px",
                backgroundColor: "white",
                transition: "0.2s",
                borderRadius: "50%",
              }}
            />
          </span>
        </label>
      ) as HTMLElement;
    }
  }

  return (
    <div
      class="section-header-component"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        margin: "8px 0 4px 0",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: "600",
            color: "#999999",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {title}
        </span>
        {actionEl}
      </div>
      <div
        style={{
          width: "100%",
          height: "1px",
          backgroundColor: dividerColor,
        }}
      />
    </div>
  ) as HTMLElement;
}
