import { createSignal, createEffect } from "@warmjs/signals";
import { eventBus } from "../core/event-bus";
import { LayerManager, LayerItemDTO } from "../core/layer";

/**
 * Layer List Sidebar UI - WarmJS
 * - Multi-select (checkbox hoặc Ctrl + click) dùng chung nhóm chọn với canvas
 * - Thumbnails
 * - Layer name & type subtitle
 * - Lock & visibility toggles
 * - Drag & drop reordering
 * - Header delete action
 *
 * The list rebuilds on layer/canvas changes; drag-over highlights
 * are fine-grained signals.
 */

export interface LayerListPanelOptions {
  layerManager: LayerManager;
  onSelect?: (id: number) => void;
  onDelete?: (id: number) => void;
}

const FALLBACK_THUMB =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 36"%3E%3Crect fill="%23555" width="48" height="36"/%3E%3C/svg%3E';

function getThumbnail(layerManager: LayerManager, layerId: number): string {
  const layerObj = layerManager.getLayer(layerId);
  if (
    layerObj &&
    layerObj.canvas &&
    layerObj.canvas.width > 0 &&
    layerObj.canvas.height > 0
  ) {
    try {
      return layerObj.canvas.toDataURL();
    } catch {
      // ignore
    }
  }
  return FALLBACK_THUMB;
}

const SVG_NS = "http://www.w3.org/2000/svg";

function svgIcon(path: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  const p = document.createElementNS(SVG_NS, "path");
  p.setAttribute("fill", "currentColor");
  p.setAttribute("d", path);
  svg.appendChild(p);
  return svg;
}

const ICON_LOCKED =
  "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z";
const ICON_UNLOCKED =
  "M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z";
const ICON_VISIBLE =
  "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z";
const ICON_HIDDEN =
  "M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z";

/**
 * Mount layer list panel vào container (thường là #layer-list).
 * Trả về hàm unmount (gỡ eventBus + dọn DOM header buttons).
 */
export function mountLayerListPanel(
  container: HTMLElement,
  options: LayerListPanelOptions
): () => void {
  const { layerManager, onSelect, onDelete } = options;

  const [layers, setLayers] = createSignal<LayerItemDTO[]>(
    layerManager.getLayersList()
  );
  const [dragOverId, setDragOverId] = createSignal<number | null>(null);
  const [noDropId, setNoDropId] = createSignal<number | null>(null);
  let dragId: number | null = null;

  const offChanged = eventBus.on<LayerItemDTO[]>("layer:changed", (ls) =>
    setLayers(ls || layerManager.getLayersList())
  );
  const offRendered = eventBus.on("canvas:rendered", () =>
    setLayers(layerManager.getLayersList())
  );

  const updateDeleteButtonVisibility = (count: number): void => {
    const deleteBtn = document.getElementById("layer-delete-selected");
    if (deleteBtn) {
      deleteBtn.style.display = count > 0 ? "flex" : "none";
    }
  };

  // Header delete + close buttons (DOM ngoài container, wire một lần).
  const deleteBtn = document.getElementById("layer-delete-selected");
  const prevDeleteClick = deleteBtn
    ? (deleteBtn as HTMLElement & { onclick: unknown }).onclick
    : null;
  if (deleteBtn) {
    (deleteBtn as HTMLElement).onclick = () => {
      const selectedLayers = layerManager.getSelectedLayers();
      if (selectedLayers.length === 0) return;
      const count = selectedLayers.length;
      if (
        !confirm(
          `Bạn có chắc muốn xóa ${count} layer${count > 1 ? "s" : ""} đã chọn?`
        )
      ) {
        return;
      }
      selectedLayers.forEach((layer) => {
        if (layer.id !== 0) {
          layerManager.deleteLayer(layer.id);
          if (onDelete) onDelete(layer.id);
        }
      });
      const rest = layerManager.layers.filter((l) => l.id !== 0);
      if (rest.length > 0) layerManager.setActiveLayer(rest[rest.length - 1].id);
      else layerManager.clearLayerSelection();
    };
  }

  const closeBtn = document.querySelector(".layer-sidebar-close");
  const prevCloseClick =
    closeBtn != null
      ? (closeBtn as HTMLElement & { onclick: unknown }).onclick
      : null;
  if (closeBtn) {
    (closeBtn as HTMLElement).onclick = () => {
      const layerSidebar = document.getElementById("layer-sidebar");
      const body = document.getElementById("body");
      const layerBtn = document.querySelector('.top-btn[data-action="layer"]');
      layerSidebar?.classList.add("hidden");
      body?.classList.remove("layer-open");
      layerBtn?.classList.remove("active");
    };
  }

  const buildItem = (layer: LayerItemDTO): HTMLElement => {
    const isBackground = layer.type === "background" || layer.id === 0;

    const item = document.createElement("div");
    item.className = [
      "layer-item",
      layer.isActive ? "active" : "",
      layer.isSelected ? "selected" : "",
      layer.locked ? "locked" : "",
      isBackground ? "background-layer" : "",
      dragOverId() === layer.id ? "drag-over" : "",
      noDropId() === layer.id ? "no-drop" : "",
    ]
      .filter(Boolean)
      .join(" ");
    item.dataset.layerId = String(layer.id);
    if (!isBackground) item.draggable = true;

    item.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest("input")) return;
      if ((e.ctrlKey || e.metaKey) && !isBackground) {
        layerManager.toggleLayerSelection(layer.id);
        layerManager.drawSelectionOutlines();
        return;
      }
      layerManager.setActiveLayer(layer.id);
      if (onSelect) onSelect(layer.id);
    });

    item.addEventListener("dragstart", (e) => {
      dragId = layer.id;
      item.classList.add("dragging");
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(layer.id));
      }
    });
    item.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (isBackground || dragId === null) return;
      if (dragId !== layer.id) {
        setDragOverId(layer.id);
        setNoDropId(null);
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      }
    });
    item.addEventListener("dragleave", () => {
      if (dragOverId() === layer.id) setDragOverId(null);
      if (noDropId() === layer.id) setNoDropId(null);
    });
    item.addEventListener("drop", (e) => {
      e.preventDefault();
      const draggedId = dragId;
      setDragOverId(null);
      setNoDropId(null);
      if (draggedId !== null && draggedId !== layer.id && !isBackground) {
        layerManager.reorderLayer(draggedId, layer.id);
      }
      dragId = null;
    });
    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
      dragId = null;
      setDragOverId(null);
      setNoDropId(null);
    });

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "layer-checkbox";
    checkbox.title = "Chọn layer (giữ Ctrl để chọn nhiều rồi kéo cùng lúc)";
    checkbox.disabled = isBackground;
    checkbox.checked = !!layer.isSelected;
    checkbox.addEventListener("click", (e) => {
      e.stopPropagation();
      layerManager.toggleLayerSelection(layer.id);
      layerManager.drawSelectionOutlines();
    });

    const thumb = document.createElement("img");
    thumb.className = "layer-thumbnail";
    thumb.draggable = false;
    thumb.src = getThumbnail(layerManager, layer.id);
    thumb.alt = layer.name;

    const info = document.createElement("div");
    info.className = "layer-info";
    const nameEl = document.createElement("div");
    nameEl.className = "layer-name";
    nameEl.textContent = layer.name;
    const typeEl = document.createElement("div");
    typeEl.className = "layer-type";
    typeEl.textContent = layer.type;
    info.append(nameEl, typeEl);

    const lockBtn = document.createElement("button");
    lockBtn.type = "button";
    lockBtn.className = `layer-action-btn ${layer.locked ? "active" : ""}`;
    lockBtn.title = layer.locked ? "Mở khóa layer" : "Khóa layer";
    lockBtn.appendChild(svgIcon(layer.locked ? ICON_LOCKED : ICON_UNLOCKED));
    lockBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!isBackground) layerManager.toggleLayerLock(layer.id);
    });

    const visBtn = document.createElement("button");
    visBtn.type = "button";
    visBtn.className = `layer-action-btn ${!layer.visible ? "hidden-layer" : ""}`;
    visBtn.title = layer.visible ? "Ẩn layer" : "Hiện layer";
    visBtn.appendChild(svgIcon(layer.visible ? ICON_VISIBLE : ICON_HIDDEN));
    visBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!isBackground) layerManager.toggleLayerVisibility(layer.id);
    });

    item.append(checkbox, thumb, info, lockBtn, visBtn);
    return item;
  };

  const renderList = (): void => {
    const list = layers();
    // Touch drag signals so visual states refresh with the list.
    dragOverId();
    noDropId();
    container.innerHTML = "";
    if (!list || list.length === 0) {
      const p = document.createElement("p");
      p.style.color = "#888";
      p.style.fontSize = "12px";
      p.style.padding = "16px";
      p.style.textAlign = "center";
      p.textContent = "No layers available";
      container.appendChild(p);
      updateDeleteButtonVisibility(0);
      return;
    }
    const ordered = [...list].reverse();
    for (const layer of ordered) container.appendChild(buildItem(layer));
    updateDeleteButtonVisibility(
      list.filter((l) => l.isSelected && l.id !== 0).length
    );
  };

  createEffect(() => {
    renderList();
  });

  return () => {
    offChanged();
    offRendered();
    container.innerHTML = "";
    if (deleteBtn) {
      (deleteBtn as HTMLElement).onclick = prevDeleteClick as (() => void) | null;
    }
    if (closeBtn) {
      (closeBtn as HTMLElement).onclick = prevCloseClick as (() => void) | null;
    }
  };
}
