/**
 * Dropdown Menu UI - Real DOM (no JSX runtime needed)
 * Replaces showDropdown from the legacy ui/Popup.tsx.
 * Displayed imperatively near a trigger element; closes on outside click / Escape.
 */

export interface DropdownItem {
  label: string;
  icon?: string | Node;
  [key: string]: any;
}

export interface DropdownOptions {
  items: DropdownItem[];
  onItemClick?: (item: DropdownItem) => void;
}

/**
 * Displays dropdown menu relative to trigger element
 */
export function showDropdown(
  triggerEl: HTMLElement,
  opts?: DropdownOptions
): void {
  const { items = [], onItemClick } = opts || {};

  // Close existing dropdown if any
  document.querySelectorAll(".dropdown-menu").forEach((d) => d.remove());

  const menu = document.createElement("div");
  menu.className = "dropdown-menu";

  const cleanup = () => {
    document.removeEventListener("click", closeDropdown);
    document.removeEventListener("keydown", onKey);
  };

  items.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dropdown-item";
    btn.addEventListener("click", (e: MouseEvent) => {
      e.stopPropagation();
      menu.remove();
      cleanup();
      if (onItemClick) onItemClick(item);
    });

    if (typeof item.icon === "string") {
      const iconWrap = document.createElement("span");
      iconWrap.className = "dropdown-item-icon";
      iconWrap.innerHTML = item.icon;
      btn.appendChild(iconWrap);
    } else if (item.icon instanceof Node) {
      btn.appendChild(item.icon);
    }

    const label = document.createElement("span");
    label.textContent = item.label;
    btn.appendChild(label);

    menu.appendChild(btn);
  });

  document.body.appendChild(menu);

  const rect = triggerEl.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.left = `${Math.min(
    rect.left,
    window.innerWidth - menu.offsetWidth - 8
  )}px`;

  const closeDropdown = (e: MouseEvent) => {
    if (!menu.contains(e.target as Node) && e.target !== triggerEl) {
      menu.remove();
      cleanup();
    }
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      menu.remove();
      cleanup();
    }
  };

  setTimeout(() => document.addEventListener("click", closeDropdown), 0);
  document.addEventListener("keydown", onKey);
}
