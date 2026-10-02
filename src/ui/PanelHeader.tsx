/**
 * Panel Header Component - Real DOM TSX
 * Header có nút Back bên trái và Reset bên phải.
 */

import { h } from "./jsx";

export interface PanelHeaderProps {
  title: string;
  onBack: (event: MouseEvent) => void;
  /**
   * Bắt buộc khi showReset = true (mặc định). Khi showReset = false có thể bỏ qua.
   */
  onReset: (event: MouseEvent) => void;
  /**
   * Đặt false để ẩn nút Reset — dùng cho panel dạng hành động một lần
   * (align, chọn màu...) không có "giá trị" để phục hồi.
   */
  showReset?: boolean;
  style?: Record<string, string>;
}

export function PanelHeader(props: PanelHeaderProps): HTMLElement {
  const { title, onBack, onReset, showReset = true, style = {} } = props;

  return (
    <div
      class="panel-header"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        ...style,
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
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M15 18l-6-6 6-6"></path>
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

        {showReset && (
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
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 12a9 9 0 1 0 9-9c-2.5 0-4.7 1-6.3 2.7L3 8"></path>
              <path d="M3 3v5h5"></path>
            </svg>
          </button>
        )}
      </div>

      <div
        style={{
          width: "100%",
          height: "1px",
          backgroundColor: "#333333",
        }}
      />
    </div>
  ) as HTMLElement;
}
