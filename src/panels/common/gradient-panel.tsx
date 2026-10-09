/** @jsx h */
/** @jsxFrag Fragment */
import { h, render, Fragment } from "preact";
import { useState, useRef, useEffect, useCallback } from "preact/hooks";
import {
  ColorService,
} from "../../core/layer/color-service";
import { PreactTabBar } from "../../ui/base/tab-bar";
import { LayerManager } from "../../core/layer";
import type { Layer } from "../../core/layer";
import type { TextTransform } from "../../text/text-transform";

// ── Types (kept from modules/gradient.tsx) ──

export interface LinearStop {
  offset: number;
  color: string;
  radius?: number;
}

export interface MeshPoint {
  x: number;
  y: number;
  color: string;
  radius?: number;
}

export interface GradientCustomData {
  type: "linear" | "radial";
  stops?: LinearStop[];
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  meshPoints?: MeshPoint[];
}

export interface GradientModuleOptions {
  layerManager?: LayerManager;
  textTransform?: TextTransform;
  targetLayer?: Layer | null;
  onApply?: (data: GradientCustomData) => void;
}

// ── Modal shell (Preact equivalent of ui/Popup.showPopup) ──

export function PreactModal(props: {
  title: string;
  width: string;
  onClose: () => void;
  children: preact.ComponentChildren;
}) {
  const { title, width, onClose, children } = props;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      class={`popup-overlay${open ? " popup-open" : ""}`}
      onClick={(e: MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div class="popup-box" style={{ width }}>
        <div class="popup-header">
          <span class="popup-title">{title}</span>
          <button
            type="button"
            class="popup-close"
            aria-label="Close"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <div class="popup-body">{children}</div>
      </div>
    </div>
  );
}

// ── Main panel ──

interface GradientPanelProps {
  options: GradientModuleOptions;
  onClose: () => void;
}

function GradientPanel({ options, onClose }: GradientPanelProps) {
  const [type, setType] = useState<"linear" | "radial">("linear");

  const [stops1D, setStops1D] = useState<LinearStop[]>([
    { offset: 0, color: "#ff0000", radius: 0.1 },
    { offset: 1, color: "#0000ff", radius: 0.1 },
  ]);
  const [selectedStop1DIdx, setSelectedStop1DIdx] = useState(0);
  const [startPoint, setStartPoint] = useState({ x: 0.1, y: 0.5 });
  const [endPoint, setEndPoint] = useState({ x: 0.9, y: 0.5 });

  const [meshPoints, setMeshPoints] = useState<MeshPoint[]>([
    { x: 0.2, y: 0.2, color: "#ff0000", radius: 1.0 },
    { x: 0.8, y: 0.2, color: "#0000ff", radius: 1.0 },
    { x: 0.5, y: 0.8, color: "#00ff00", radius: 1.0 },
  ]);
  const [selectedMeshIdx, setSelectedMeshIdx] = useState(0);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stopsContainerRef = useRef<HTMLDivElement | null>(null);

  const currentLinear = stops1D[selectedStop1DIdx];
  const currentMesh = meshPoints[selectedMeshIdx];

  // ── Drag handling for canvas handles & stop markers ──

  const startCanvasDrag = useCallback(
    (
      e: MouseEvent,
      set: (p: { x: number; y: number }) => void
    ) => {
      e.preventDefault();
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;

      const onMove = (me: MouseEvent) => {
        set({
          x: Math.max(0, Math.min(1, (me.clientX - rect.left) / rect.width)),
          y: Math.max(0, Math.min(1, (me.clientY - rect.top) / rect.height)),
        });
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    []
  );

  const startStopDrag = useCallback(
    (e: MouseEvent, idx: number) => {
      e.preventDefault();
      const startX = e.clientX;
      const initialOffset = stops1D[idx].offset;
      const rect = stopsContainerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const onMove = (me: MouseEvent) => {
        const dx = me.clientX - startX;
        const newOffset = Math.max(0, Math.min(1, initialOffset + dx / rect.width));
        setStops1D((prev) => {
          const next = prev.map((s, i) =>
            i === idx ? { ...s, offset: newOffset } : s
          );
          next.sort((a, b) => a.offset - b.offset);
          return next;
        });
        setSelectedStop1DIdx(idx);
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [stops1D]
  );

  // ── Canvas drawing ──

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    canvas.width = wrapper.clientWidth || 500;
    canvas.height = wrapper.clientHeight || 180;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (type === "linear") {
      const x1 = startPoint.x * canvas.width;
      const y1 = startPoint.y * canvas.height;
      const x2 = endPoint.x * canvas.width;
      const y2 = endPoint.y * canvas.height;

      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      const sorted = [...stops1D].sort((a, b) => a.offset - b.offset);
      sorted.forEach((s) => grad.addColorStop(s.offset, s.color));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "screen";

      meshPoints.forEach((stop) => {
        const x = stop.x * canvas.width;
        const y = stop.y * canvas.height;
        const baseRadius = Math.max(canvas.width, canvas.height) * 0.8;
        const r = baseRadius * (stop.radius || 0.8);

        const radGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
        radGrad.addColorStop(0, stop.color);
        radGrad.addColorStop(1, "transparent");

        ctx.fillStyle = radGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });
      ctx.globalCompositeOperation = "source-over";
    }
  }, [type, stops1D, startPoint, endPoint, meshPoints]);

  // ── Actions ──

  const handleAddStop = () => {
    if (type === "linear") {
      if (stops1D.length >= 8) return;
      const last = stops1D[stops1D.length - 1];
      const offset = Math.min(1, last ? last.offset + 0.1 : 0.5);
      const next = [...stops1D, { offset, color: "#ffffff", radius: 0.1 }];
      next.sort((a, b) => a.offset - b.offset);
      setStops1D(next);
      setSelectedStop1DIdx(next.findIndex((s) => s.offset === offset));
    } else {
      if (meshPoints.length >= 10) return;
      const rx = 0.3 + Math.random() * 0.4;
      const ry = 0.3 + Math.random() * 0.4;
      const randColor =
        "#" +
        Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "0");
      setMeshPoints([...meshPoints, { x: rx, y: ry, color: randColor, radius: 1.0 }]);
      setSelectedMeshIdx(meshPoints.length);
    }
  };

  const handleRemoveStop = () => {
    if (type === "linear") {
      if (stops1D.length <= 2) return;
      const next = stops1D.filter((_, i) => i !== selectedStop1DIdx);
      setStops1D(next);
      setSelectedStop1DIdx(Math.max(0, selectedStop1DIdx - 1));
    } else {
      if (meshPoints.length <= 1) return;
      const next = meshPoints.filter((_, i) => i !== selectedMeshIdx);
      setMeshPoints(next);
      setSelectedMeshIdx(Math.max(0, selectedMeshIdx - 1));
    }
  };

  const handleReverse = () => {
    if (type === "linear") {
      const next = stops1D
        .map((s) => ({ ...s, offset: 1 - s.offset }))
        .sort((a, b) => a.offset - b.offset);
      setStops1D(next);
    } else {
      const colors = meshPoints.map((p) => p.color).reverse();
      setMeshPoints(meshPoints.map((p, idx) => ({ ...p, color: colors[idx] })));
    }
  };

  // ── Apply (logic identical to GradientService.handleApply) ──

  const handleApply = () => {
    let gradData: GradientCustomData;

    if (type === "linear") {
      gradData = {
        type: "linear",
        stops: [...stops1D].sort((a, b) => a.offset - b.offset),
        startPoint: { x: startPoint.x, y: startPoint.y },
        endPoint: { x: endPoint.x, y: endPoint.y },
      };
    } else {
      gradData = {
        type: "radial",
        meshPoints: meshPoints.map((p) => ({
          x: p.x,
          y: p.y,
          color: p.color,
          radius: p.radius,
        })),
      };
    }

    const { layerManager, textTransform, onApply } = options;
    let targetLayer: Layer | null =
      options.targetLayer !== undefined
        ? options.targetLayer
        : textTransform
        ? textTransform.selectedLayer
        : null;

    if (!targetLayer && layerManager) {
      const active = layerManager.getActiveLayer();
      if (active && active.id !== 0) targetLayer = active;
    }

    if (targetLayer && targetLayer.type === "text" && targetLayer.id !== 0) {
      targetLayer.fontColor = {
        kind: "custom",
        data: JSON.parse(JSON.stringify(gradData)),
      };
      if (textTransform) textTransform.redrawTextLayer(targetLayer);
      if (layerManager) layerManager.render();
      if (textTransform && textTransform.selectedLayer === targetLayer) {
        textTransform.drawSelectionOverlay(targetLayer);
      }
    } else if (layerManager) {
      const bg = layerManager.getBackgroundLayer();
      const canvas = layerManager.mainCanvas;
      if (bg && canvas) {
        ColorService.renderBackgroundFill(
          bg.ctx,
          canvas.width,
          canvas.height,
          { kind: "custom", data: gradData }
        );
        ColorService.lastBackground = { kind: "custom", data: gradData };
        layerManager.render();
      }
    }

    ColorService.addGradientPreset(
      gradData,
      type === "linear" ? "Linear Custom" : "Radial Custom"
    );

    if (onApply) onApply(gradData);
    onClose();
  };

  // ── Render ──

  const iconBtnStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    border: "1px solid #444",
    padding: "6px 12px",
    background: "transparent",
    color: "#ccc",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
  } as const;

  return (
    <PreactModal
      title="Gradient Editor"
      width="540px"
      onClose={onClose}
    >
      <div
        class="grad-editor-container"
        style={{ display: "flex", flexDirection: "column", gap: "16px" }}
      >
        {/* 1. Type selector */}
        <PreactTabBar
          tabs={[
            { id: "linear", label: "Linear (S ➔ E)" },
            { id: "radial", label: "Circular (Radial Mesh)" },
          ]}
          active={type}
          onChange={(id) => setType(id as "linear" | "radial")}
        />

        {/* 2. Interactive canvas area */}
        <div
          ref={wrapperRef}
          class="grad-canvas-wrapper"
          style={{
            position: "relative",
            height: "180px",
            background: "#111",
            borderRadius: "8px",
            border: "1px solid #555",
            overflow: "hidden",
            userSelect: "none",
          }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: "100%", height: "100%", display: "block" }}
          />

          {type === "linear" ? (
            <>
              {/* S / E handles */}
              {[
                { label: "S", pt: startPoint, color: "#00ffff", set: setStartPoint },
                { label: "E", pt: endPoint, color: "#ff00ff", set: setEndPoint },
              ].map((p) => (
                <div
                  class="grad-handle-2d"
                  style={{
                    position: "absolute",
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: "bold",
                    color: "#000",
                    cursor: "pointer",
                    border: "2px solid #fff",
                    left: `calc(${p.pt.x * 100}% - 12px)`,
                    top: `calc(${p.pt.y * 100}% - 12px)`,
                    backgroundColor: p.color,
                  }}
                  onMouseDown={(e: MouseEvent) =>
                    startCanvasDrag(e, p.set)
                  }
                >
                  {p.label}
                </div>
              ))}
            </>
          ) : (
            meshPoints.map((stop, idx) => (
              <div
                class={`grad-handle-2d ${idx === selectedMeshIdx ? "active" : ""}`}
                style={{
                  position: "absolute",
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: "bold",
                  color: "#000",
                  cursor: "pointer",
                  border:
                    idx === selectedMeshIdx ? "2px solid #fff" : "1px solid #999",
                  left: `calc(${stop.x * 100}% - 12px)`,
                  top: `calc(${stop.y * 100}% - 12px)`,
                  backgroundColor: stop.color,
                }}
                onMouseDown={(e: MouseEvent) => {
                  setSelectedMeshIdx(idx);
                  startCanvasDrag(
                    e,
                    (p) =>
                      setMeshPoints((prev) =>
                        prev.map((pt, i) => (i === idx ? { ...pt, x: p.x, y: p.y } : pt))
                      )
                  );
                }}
              >
                {idx + 1}
              </div>
            ))
          )}
        </div>

        {/* 3. Linear-only color stops distribution bar */}
        {type === "linear" && (
          <div class="grad-linear-distribution" style={{ position: "relative" }}>
            <div
              class="grad-slider-container"
              style={{ position: "relative", height: "30px", userSelect: "none" }}
            >
              <div
                class="grad-bar"
                style={{
                  position: "absolute",
                  top: "4px",
                  left: "10px",
                  right: "10px",
                  height: "16px",
                  borderRadius: "4px",
                  border: "1px solid #555",
                  boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)",
                  background: `linear-gradient(to right, ${stops1D
                    .map((s) => `${s.color} ${s.offset * 100}%`)
                    .join(", ")})`,
                }}
              />
              <div
                ref={stopsContainerRef}
                style={{
                  position: "absolute",
                  top: "0",
                  left: "0",
                  right: "0",
                  height: "24px",
                }}
              >
                {stops1D.map((stop, idx) => (
                  <div
                    class={`grad-marker ${idx === selectedStop1DIdx ? "active" : ""}`}
                    style={{
                      position: "absolute",
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      border:
                        idx === selectedStop1DIdx
                          ? "2px solid #fff"
                          : "1px solid #333",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.6)",
                      cursor: "pointer",
                      left: `calc(${stop.offset * 100}% - 8px)`,
                      background: stop.color,
                    }}
                    onMouseDown={(e: MouseEvent) => {
                      setSelectedStop1DIdx(idx);
                      startStopDrag(e, idx);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. Stop controls */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button type="button" style={iconBtnStyle} onClick={handleAddStop}>
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            <span>{type === "linear" ? "Add Stop" : "Add Point"}</span>
          </button>
          <button type="button" style={iconBtnStyle} onClick={handleRemoveStop}>
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M19 13H5v-2h14v2z" />
            </svg>
            <span>{type === "linear" ? "Remove Stop" : "Remove Point"}</span>
          </button>
          <button type="button" style={iconBtnStyle} onClick={handleReverse}>
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path
                fill="currentColor"
                d="M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z"
              />
            </svg>
            <span>Reverse</span>
          </button>
        </div>

        {/* 5. Config panel for active selection */}
        <div
          class="grad-stop-config"
          style={{
            background: "#222",
            padding: "12px",
            borderRadius: "6px",
            border: "1px solid #444",
          }}
        >
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  fontSize: "11px",
                  color: "#999",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Color
              </label>
              <input
                type="color"
                value={type === "linear" ? currentLinear?.color ?? "#ffffff" : currentMesh?.color ?? "#ffffff"}
                style={{
                  width: "100%",
                  height: "32px",
                  border: "1px solid #555",
                  borderRadius: "4px",
                  background: "#1e1e1e",
                  cursor: "pointer",
                  padding: "2px",
                }}
                onInput={(e: Event) => {
                  const val = (e.target as HTMLInputElement).value;
                  if (type === "linear") {
                    setStops1D((prev) =>
                      prev.map((s, i) =>
                        i === selectedStop1DIdx ? { ...s, color: val } : s
                      )
                    );
                  } else {
                    setMeshPoints((prev) =>
                      prev.map((p, i) =>
                        i === selectedMeshIdx ? { ...p, color: val } : p
                      )
                    );
                  }
                }}
              />
            </div>

            {type === "radial" && currentMesh && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <label
                  style={{
                    fontSize: "11px",
                    color: "#999",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Coordinates
                </label>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: "12px",
                    color: "#ccc",
                    background: "#1e1e1e",
                    padding: "6px 8px",
                    borderRadius: "4px",
                    border: "1px solid #555",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {`X: ${Math.round(currentMesh.x * 100)}%, Y: ${Math.round(
                    currentMesh.y * 100
                  )}%`}
                </div>
              </div>
            )}
          </div>

          {/* Spread / radius slider */}
          <div style={{ marginTop: "12px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "11px",
                color: "#999",
                marginBottom: "4px",
              }}
            >
              <span>Spread / Radius (%)</span>
              <span>
                {Math.round(
                  (type === "linear"
                    ? currentLinear?.radius ?? 0.1
                    : currentMesh?.radius ?? 0.8) * 100
                )}
                %
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="250"
              value={String(
                Math.round(
                  (type === "linear"
                    ? currentLinear?.radius ?? 0.1
                    : currentMesh?.radius ?? 0.8) * 100
                )
              )}
              style={{ width: "100%" }}
              onInput={(e: Event) => {
                const val = parseInt((e.target as HTMLInputElement).value, 10) / 100;
                if (type === "linear") {
                  setStops1D((prev) =>
                    prev.map((s, i) =>
                      i === selectedStop1DIdx ? { ...s, radius: val } : s
                    )
                  );
                } else {
                  setMeshPoints((prev) =>
                    prev.map((p, i) =>
                      i === selectedMeshIdx ? { ...p, radius: val } : p
                    )
                  );
                }
              }}
            />
          </div>
        </div>

        {/* 6. Bottom actions */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            style={{
              padding: "8px 14px",
              background: "#094771",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
            }}
            onClick={handleApply}
          >
            ✓ Apply
          </button>
          <button
            type="button"
            style={{
              padding: "8px 14px",
              background: "#555",
              color: "#ccc",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "13px",
            }}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </PreactModal>
  );
}

// ── Mount helper (replaces GradientModule.open) ──

export function openGradientPanel(options: GradientModuleOptions = {}): void {
  const host = document.createElement("div");
  document.body.appendChild(host);

  const close = () => {
    render(null, host);
    if (host.parentNode) host.parentNode.removeChild(host);
  };

  render(<GradientPanel options={options} onClose={close} />, host);
}
