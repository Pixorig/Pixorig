/** @jsx h */
/** @jsxFrag Fragment */
import { h, render, Fragment } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { eventBus } from "../core/event-bus";
import { LayerManager, LayerItemDTO } from "../core/layer";

/**
 * Layer List Sidebar UI - Preact
 * Layer list UI component:
 * - Multi-select checkboxes
 * - Thumbnails
 * - Layer name & type subtitle
 * - Lock & visibility toggles
 * - Drag & drop reordering
 * - Header delete action
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

function LayerListPanel({
  layerManager,
  onSelect,
  onDelete,
}: LayerListPanelOptions) {
  const [layers, setLayers] = useState<LayerItemDTO[]>(() =>
    layerManager.getLayersList()
  );
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const dragIdRef = useRef<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [noDropId, setNoDropId] = useState<number | null>(null);

  // Sync với eventBus (giống behavior cũ: render lại khi layer/canvas đổi)
  useEffect(() => {
    const refresh = () => setLayers(layerManager.getLayersList());
    const offChanged = eventBus.on<LayerItemDTO[]>("layer:changed", (ls) =>
      setLayers(ls || layerManager.getLayersList())
    );
    const offRendered = eventBus.on("canvas:rendered", refresh);
    return () => {
      offChanged();
      offRendered();
    };
  }, [layerManager]);

  const updateDeleteButtonVisibility = (sel: Set<number>): void => {
    const deleteBtn = document.getElementById("layer-delete-selected");
    if (deleteBtn) {
      deleteBtn.style.display = sel.size > 0 ? "flex" : "none";
    }
  };

  // Header delete button + close panel button (DOM ngoài control của Preact)
  useEffect(() => {
    const deleteBtn = document.getElementById("layer-delete-selected");
    if (deleteBtn) {
      deleteBtn.onclick = () => {
        if (selected.size === 0) return;
        const count = selected.size;
        if (
          !confirm(
            `Bạn có chắc muốn xóa ${count} layer${count > 1 ? "s" : ""} đã chọn?`
          )
        ) {
          return;
        }
        Array.from(selected).forEach((id) => {
          if (id !== 0) {
            layerManager.deleteLayer(id);
            if (onDelete) onDelete(id);
          }
        });
        const next = new Set<number>();
        setSelected(next);
        updateDeleteButtonVisibility(next);
      };
    }

    const closeBtn = document.querySelector(".layer-sidebar-close");
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

    updateDeleteButtonVisibility(selected);
  }, [selected, layerManager, onDelete]);

  const toggleSelect = (id: number, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  };

  const ordered = [...layers].reverse(); // topmost layer first

  return (
    <>
      {(!ordered || ordered.length === 0) && (
        <p
          style={{
            color: "#888",
            fontSize: "12px",
            padding: "16px",
            textAlign: "center",
          }}
        >
          No layers available
        </p>
      )}
      {ordered.map((layer) => {
        const isBackground = layer.type === "background" || layer.id === 0;
        const itemClasses = [
          "layer-item",
          layer.isActive ? "active" : "",
          layer.locked ? "locked" : "",
          isBackground ? "background-layer" : "",
          dragOverId === layer.id ? "drag-over" : "",
          noDropId === layer.id ? "no-drop" : "",
        ]
          .filter(Boolean)
          .join(" ");

        const handleDragOver = (e: DragEvent) => {
          e.preventDefault();
          if (isBackground || dragIdRef.current === null) return;
          if (dragIdRef.current !== layer.id) {
            setDragOverId(layer.id);
            setNoDropId(null);
            // dropEffect hiển thị theo loại target
            const dt = e.dataTransfer;
            if (dt) dt.dropEffect = "move";
          }
        };

        const handleDrop = (e: DragEvent) => {
          e.preventDefault();
          const draggedId = dragIdRef.current;
          setDragOverId(null);
          setNoDropId(null);
          if (draggedId !== null && draggedId !== layer.id && !isBackground) {
            layerManager.reorderLayer(draggedId, layer.id);
          }
          dragIdRef.current = null;
        };

        return (
          <div
            class={itemClasses}
            data-layer-id={String(layer.id)}
            draggable={!isBackground}
            onClick={(e: MouseEvent) => {
              const target = e.target as HTMLElement;
              if (!target.closest("button") && !target.closest("input")) {
                layerManager.setActiveLayer(layer.id);
                if (onSelect) onSelect(layer.id);
              }
            }}
            onDragStart={(e: DragEvent) => {
              dragIdRef.current = layer.id;
              (e.currentTarget as HTMLElement).classList.add("dragging");
              if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(layer.id));
              }
            }}
            onDragOver={handleDragOver}
            onDragLeave={() => {
              setDragOverId((cur) => (cur === layer.id ? null : cur));
              setNoDropId((cur) => (cur === layer.id ? null : cur));
            }}
            onDrop={handleDrop}
            onDragEnd={(e: DragEvent) => {
              (e.currentTarget as HTMLElement).classList.remove("dragging");
              dragIdRef.current = null;
              setDragOverId(null);
              setNoDropId(null);
            }}
          >
            <input
              type="checkbox"
              class="layer-checkbox"
              title="Chọn layer để xóa"
              checked={selected.has(layer.id)}
              onClick={(e: MouseEvent) => {
                e.stopPropagation();
                const input = e.currentTarget as HTMLInputElement;
                toggleSelect(layer.id, input.checked);
              }}
            />
            <img
              class="layer-thumbnail"
              draggable={false}
              src={getThumbnail(layerManager, layer.id)}
              alt={layer.name}
            />
            <div class="layer-info">
              <div class="layer-name">{layer.name}</div>
              <div class="layer-type">{layer.type}</div>
            </div>
            <button
              type="button"
              class={`layer-action-btn ${layer.locked ? "active" : ""}`}
              title={layer.locked ? "Mở khóa layer" : "Khóa layer"}
              onClick={(e: MouseEvent) => {
                e.stopPropagation();
                if (!isBackground) {
                  layerManager.toggleLayerLock(layer.id);
                }
              }}
            >
              {layer.locked ? (
                <svg viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"
                  />
                </svg>
              )}
            </button>
            <button
              type="button"
              class={`layer-action-btn ${!layer.visible ? "hidden-layer" : ""}`}
              title={layer.visible ? "Ẩn layer" : "Hiện layer"}
              onClick={(e: MouseEvent) => {
                e.stopPropagation();
                if (!isBackground) {
                  layerManager.toggleLayerVisibility(layer.id);
                }
              }}
            >
              {layer.visible ? (
                <svg viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"
                  />
                </svg>
              )}
            </button>
          </div>
        );
      })}
    </>
  );
}

/**
 * Mount layer list panel vào container (thường là #layer-list).
 * Trả về hàm unmount theo convention của các panel Preact khác.
 */
export function mountLayerListPanel(
  container: HTMLElement,
  options: LayerListPanelOptions
): () => void {
  render(<LayerListPanel {...options} />, container);
  return () => render(null, container);
}
