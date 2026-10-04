/** @jsx h */
import { h } from "preact";

export interface TabBarItem<T extends string = string> {
  id: T;
  label: string;
}

export interface PreactTabBarProps<T extends string = string> {
  tabs: TabBarItem<T>[];
  active: T;
  onChange: (id: T) => void;
}

export function PreactTabBar<T extends string = string>(props: PreactTabBarProps<T>) {
  const { tabs, active, onChange } = props;

  return (
    <div
      class="tab-bar"
      style={{
        display: "flex",
        gap: "6px",
        background: "#1e1e1e",
        borderRadius: "8px",
        padding: "4px",
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            type="button"
            key={tab.id}
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
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
