/**
 * TabBar Component - Real DOM TSX
 * Tab switcher tái sử dụng cho các panel [Letters][Words], [Color][Image], ...
 */

import { h } from "./jsx";

export interface TabBarItem<T extends string = string> {
  id: T;
  label: string;
}

export interface TabBarProps<T extends string = string> {
  tabs: TabBarItem<T>[];
  active: T;
  onChange: (id: T) => void;
}

export function TabBar<T extends string = string>(
  props: TabBarProps<T>
): HTMLElement {
  const { tabs, active, onChange } = props;

  const container = (
    <div
      class="tab-bar"
      style={{
        display: "flex",
        gap: "6px",
        background: "#1e1e1e",
        borderRadius: "8px",
        padding: "4px",
      }}
    ></div>
  ) as HTMLElement;

  const render = (currentActive: T) => {
    container.innerHTML = "";
    for (const tab of tabs) {
      const isActive = tab.id === currentActive;
      const btn = (
        <button
          type="button"
          class={`tab-bar-btn${isActive ? " active" : ""}`}
          data-tab-id={tab.id}
          style={{
            flex: "1",
            padding: "7px 0",
            background: isActive ? "#2a2a2a" : "transparent",
            border: isActive ? "1px solid #444" : "1px solid transparent",
            borderRadius: "6px",
            color: isActive ? "#fff" : "#888",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: isActive ? "bold" : "normal",
            transition: "all 0.15s ease",
          }}
          onClick={() => {
            onChange(tab.id);
            render(tab.id);
          }}
        >
          {tab.label}
        </button>
      ) as HTMLElement;
      container.appendChild(btn);
    }
  };

  render(active);
  return container;
}
