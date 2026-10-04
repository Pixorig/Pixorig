/** @jsx h */
import { h } from "preact";

export interface PreactPanelHeaderProps {
  title: string;
  onBack: () => void;
  onReset: () => void;
}

export function PreactPanelHeader({
  title,
  onBack,
  onReset,
}: PreactPanelHeaderProps) {
  return (
    <div
      class="panel-header"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          minHeight: "28px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minWidth: "0",
          }}
        >
          <button
            type="button"
            class="panel-header-back"
            aria-label="Back"
            title="Back"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              padding: "0",
              border: "none",
              borderRadius: "5px",
              background: "transparent",
              color: "#aaa",
              cursor: "pointer",
            }}
            onClick={onBack}
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span
            style={{
              minWidth: "0",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: "#ddd",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
            {title}
          </span>
        </div>

        <button
          type="button"
          class="panel-header-reset"
          aria-label="Reset"
          title="Reset"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "28px",
            height: "28px",
            padding: "0",
            border: "none",
            borderRadius: "5px",
            background: "transparent",
            color: "#aaa",
            cursor: "pointer",
          }}
          onClick={onReset}
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 1 0 9-9c-2.5 0-4.7 1-6.3 2.7L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>

      <div
        style={{
          width: "100%",
          height: "1px",
          backgroundColor: "#333333",
        }}
      />
    </div>
  );
}
