/** @jsx h */
/** @jsxFrag Fragment */
import { h, render, Fragment } from "preact";
import { useState, useRef, useEffect, useCallback } from "preact/hooks";
import { LayerManager } from "../../core/layer";
import { eventBus } from "../../core/event-bus";
import { PreactModal } from "./gradient-panel";

// ── Types (kept from modules/crop.tsx) ──

export type CropShapeMode = "normal" | "rounded" | "circle";

export interface CropPanelOptions {
  layerManager?: LayerManager;
  sourceImage?: HTMLImageElement | null;
  onCropComplete?: (croppedImage: HTMLImageElement) => void;
  onClose?: () => void;
}

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ── SVG overlay elements ──

const HOLE_BASE = { id: "crop-hole", fill: "black" } as const;

// ── Main panel ──

interface CropPanelProps {
  srcImg: HTMLImageElement;
  options: CropPanelOptions;
  onClose: () => void;
}

function CropPanel({ srcImg, options, onClose }: CropPanelProps) {
  const { layerManager, onCropComplete } = options;

  const [crop, setCrop] = useState<CropRect>({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
  const [ratio, setRatio] = useState<"free" | "original" | "custom" | number>("free");
  const [cropMode, setCropMode] = useState<CropShapeMode>("normal");
  const [borderRadius, setBorderRadius] = useState(20);
  const [activeAspect, setActiveAspect] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ── Aspect buttons definition ──

  const aspectRatios = [
    { label: "Free", value: "free" },
    { label: "Original", value: "original" },
    { label: "Custom...", value: "custom" },
    { label: "1:1", value: "1:1" },
    { label: "9:16", value: "9:16" },
    { label: "16:9", value: "16:9" },
    { label: "4:5", value: "4:5" },
    { label: "5:4", value: "5:4" },
    { label: "3:4", value: "3:4" },
    { label: "4:3", value: "4:3" },
    { label: "2:3", value: "2:3" },
    { label: "3:2", value: "3:2" },
    { label: "5:7", value: "5:7" },
    { label: "7:5", value: "7:5" },
  ];

  // ── Sizing canvas to preview image ──

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const maxW = 560;
    const maxH = Math.min(
      window.innerHeight * 0.6,
      srcImg.height * (maxW / srcImg.width)
    );
    const scale = Math.min(maxW / srcImg.width, maxH / srcImg.height, 1);
    const dispW = Math.round(srcImg.width * scale);
    const dispH = Math.round(srcImg.height * scale);

    canvas.width = dispW;
    canvas.height = dispH;
    canvas.style.width = `${dispW}px`;
    canvas.style.height = `${dispH}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, dispW, dispH);
    ctx.drawImage(srcImg, 0, 0, dispW, dispH);
  }, [srcImg]);

  // ── Apply aspect ratio ──

  const applyRatio = (value: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasAspect = canvas.width / canvas.height;

    if (value === "free") {
      setRatio("free");
      return;
    }

    if (value === "original") {
      setRatio("original");
      setCrop((prev) => withRatio(prev, srcImg.width / srcImg.height, canvasAspect));
      return;
    }

    if (value === "custom") {
      showCustomRatioModal();
      return;
    }

    const parts = value.split(":");
    const nw = parseFloat(parts[0]);
    const nh = parseFloat(parts[1]);
    if (nw > 0 && nh > 0) {
      setRatio(nw / nh);
      setCrop((prev) => withRatio(prev, nw / nh, canvasAspect));
    }
  };

  const withRatio = (
    prev: CropRect,
    targetRatio: number,
    canvasAspect: number
  ): CropRect => {
    const r = targetRatio / canvasAspect;
    const next = { ...prev };
    if (r > 1) {
      next.w = 0.9;
      next.h = 0.9 / r;
    } else {
      next.h = 0.9;
      next.w = 0.9 * r;
    }
    next.x = (1 - next.w) / 2;
    next.y = (1 - next.h) / 2;
    return next;
  };

  const showCustomRatioModal = () => {
    const host = document.createElement("div");
    document.body.appendChild(host);

    const close = () => {
      render(null, host);
      if (host.parentNode) host.parentNode.removeChild(host);
    };

    const inputWRef = { current: "4" };
    const inputHRef = { current: "3" };

    render(
      <div
        class="popup-overlay"
        onClick={(e: MouseEvent) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div class="popup-box" style={{ width: "320px" }}>
          <div class="popup-header">
            <span class="popup-title">Custom Aspect Ratio</span>
            <button type="button" class="popup-close" aria-label="Close" onClick={close}>
              &times;
            </button>
          </div>
          <div class="popup-body">
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "10px", color: "#888" }}>Width</span>
                  <input
                    type="number"
                    value={inputWRef.current}
                    min="1"
                    style={{
                      width: "100%",
                      background: "#1e1e1e",
                      border: "1px solid #555",
                      borderRadius: "4px",
                      padding: "6px 8px",
                      color: "#e0e0e0",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                    onInput={(e: Event) => {
                      inputWRef.current = (e.target as HTMLInputElement).value;
                    }}
                  />
                </div>
                <span style={{ color: "#777", lineHeight: "32px", marginTop: "14px" }}>
                  :
                </span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "10px", color: "#888" }}>Height</span>
                  <input
                    type="number"
                    value={inputHRef.current}
                    min="1"
                    style={{
                      width: "100%",
                      background: "#1e1e1e",
                      border: "1px solid #555",
                      borderRadius: "4px",
                      padding: "6px 8px",
                      color: "#e0e0e0",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                    onInput={(e: Event) => {
                      inputHRef.current = (e.target as HTMLInputElement).value;
                    }}
                  />
                </div>
              </div>
              <button
                type="button"
                style={{
                  padding: "8px",
                  background: "#094771",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "12px",
                  marginTop: "8px",
                }}
                onClick={() => {
                  const nw = parseFloat(inputWRef.current);
                  const nh = parseFloat(inputHRef.current);
                  if (nw > 0 && nh > 0) {
                    setRatio(nw / nh);
                    const canvas = canvasRef.current;
                    if (canvas) {
                      setCrop((prev) =>
                        withRatio(prev, nw / nh, canvas.width / canvas.height)
                      );
                    }
                  }
                  close();
                }}
              >
                Set Ratio
              </button>
            </div>
          </div>
        </div>
      </div>,
      host
    );
  };

  // ── Dragging (move / corners / edges) ──

  const startDrag = useCallback(
    (e: MouseEvent, mode: string) => {
      e.preventDefault();
      const rect = canvasWrapRef.current?.getBoundingClientRect();
      if (!rect) return;

      const startState = {
        startX: e.clientX,
        startY: e.clientY,
        crop: { ...crop },
      };
      const startRatio = ratio;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const MIN = 0.05;

      const onMove = (me: MouseEvent) => {
        const dx = (me.clientX - startState.startX) / rect.width;
        const dy = (me.clientY - startState.startY) / rect.height;
        const c = startState.crop;
        const canvasAspect = canvas.width / canvas.height;
        let next: CropRect = { ...c };

        if (mode === "move") {
          next.x = Math.max(0, Math.min(1 - c.w, c.x + dx));
          next.y = Math.max(0, Math.min(1 - c.h, c.y + dy));
        } else if (startRatio === "free") {
          if (mode === "nw") {
            next.x = Math.max(0, Math.min(c.x + c.w - MIN, c.x + dx));
            next.y = Math.max(0, Math.min(c.y + c.h - MIN, c.y + dy));
            next.w = c.x + c.w - next.x;
            next.h = c.y + c.h - next.y;
          } else if (mode === "ne") {
            next.y = Math.max(0, Math.min(c.y + c.h - MIN, c.y + dy));
            next.w = Math.max(MIN, c.w + dx);
            next.h = c.y + c.h - next.y;
          } else if (mode === "sw") {
            next.x = Math.max(0, Math.min(c.x + c.w - MIN, c.x + dx));
            next.w = c.x + c.w - next.x;
            next.h = Math.max(MIN, c.h + dy);
          } else if (mode === "se") {
            next.w = Math.max(MIN, c.w + dx);
            next.h = Math.max(MIN, c.h + dy);
          } else if (mode === "n") {
            next.y = Math.max(0, Math.min(c.y + c.h - MIN, c.y + dy));
            next.h = c.y + c.h - next.y;
          } else if (mode === "s") {
            next.h = Math.max(MIN, c.h + dy);
          } else if (mode === "w") {
            next.x = Math.max(0, Math.min(c.x + c.w - MIN, c.x + dx));
            next.w = c.x + c.w - next.x;
          } else if (mode === "e") {
            next.w = Math.max(MIN, c.w + dx);
          }
        } else {
          let targetRatio = 1.0;
          if (startRatio === "original") {
            targetRatio = srcImg.width / srcImg.height;
          } else if (typeof startRatio === "number") {
            targetRatio = startRatio;
          }

          const r = targetRatio / canvasAspect;
          if (mode === "se") {
            const maxScale = Math.min(1 - c.x, (1 - c.y) * r);
            const sc = Math.max(MIN, Math.min(maxScale, c.w + dx));
            next.w = sc;
            next.h = sc / r;
          } else if (mode === "nw") {
            const maxScale = Math.min(c.x + c.w, (c.y + c.h) * r);
            const sc = Math.max(MIN, Math.min(maxScale, c.w - dx));
            next.x = c.x + c.w - sc;
            next.y = c.y + c.h - sc / r;
            next.w = sc;
            next.h = sc / r;
          } else if (mode === "ne") {
            const maxScale = Math.min(1 - c.x, (c.y + c.h) * r);
            const sc = Math.max(MIN, Math.min(maxScale, c.w + dx));
            next.y = c.y + c.h - sc / r;
            next.w = sc;
            next.h = sc / r;
          } else if (mode === "sw") {
            const maxScale = Math.min(c.x + c.w, (1 - c.y) * r);
            const sc = Math.max(MIN, Math.min(maxScale, c.w - dx));
            next.x = c.x + c.w - sc;
            next.w = sc;
            next.h = sc / r;
          }
        }
        setCrop(next);
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [crop, ratio, srcImg]
  );

  // ── Apply crop (logic identical to CropService.applyCrop) ──

  const handleApply = () => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dispW = canvas.width;
      const dispH = canvas.height;

      const imgW = srcImg.width;
      const imgH = srcImg.height;

      const factorX = imgW / dispW;
      const factorY = imgH / dispH;

      const sx = Math.round(crop.x * dispW * factorX);
      const sy = Math.round(crop.y * dispH * factorY);
      const sw = Math.round(crop.w * dispW * factorX);
      const sh = Math.round(crop.h * dispH * factorY);

      const targetCanvas = document.createElement("canvas");
      targetCanvas.width = sw;
      targetCanvas.height = sh;
      const targetCtx = targetCanvas.getContext("2d");
      if (!targetCtx) return;

      targetCtx.save();
      targetCtx.beginPath();

      if (cropMode === "circle") {
        targetCtx.ellipse(sw / 2, sh / 2, sw / 2, sh / 2, 0, 0, Math.PI * 2);
        targetCtx.clip();
      } else if (cropMode === "rounded" && borderRadius > 0) {
        if (typeof targetCtx.roundRect === "function") {
          targetCtx.roundRect(0, 0, sw, sh, borderRadius);
        } else {
          const r = Math.min(borderRadius, sw / 2, sh / 2);
          targetCtx.moveTo(r, 0);
          targetCtx.lineTo(sw - r, 0);
          targetCtx.quadraticCurveTo(sw, 0, sw, r);
          targetCtx.lineTo(sw, sh - r);
          targetCtx.quadraticCurveTo(sw, sh, sw - r, sh);
          targetCtx.lineTo(r, sh);
          targetCtx.quadraticCurveTo(0, sh, 0, sh - r);
          targetCtx.lineTo(0, r);
          targetCtx.quadraticCurveTo(0, 0, r, 0);
        }
        targetCtx.clip();
      }

      targetCtx.drawImage(srcImg, sx, sy, sw, sh, 0, 0, sw, sh);
      targetCtx.restore();

      const dataUrl = targetCanvas.toDataURL();
      const croppedImg = new Image();
      croppedImg.onload = () => {
        if (layerManager) {
          const bgLayer = layerManager.getBackgroundLayer();
          if (bgLayer) {
            bgLayer.canvas.width = sw;
            bgLayer.canvas.height = sh;
            bgLayer.ctx.clearRect(0, 0, sw, sh);
            bgLayer.ctx.drawImage(croppedImg, 0, 0);
            bgLayer.image = croppedImg;
          }
          const mainCanvas = document.getElementById(
            "canvas"
          ) as HTMLCanvasElement | null;
          if (mainCanvas) {
            mainCanvas.width = sw;
            mainCanvas.height = sh;
          }
          layerManager.render();
        }

        eventBus.emit("image:cropped", { image: croppedImg, width: sw, height: sh });
        if (onCropComplete) {
          onCropComplete(croppedImg);
        }
      };
      croppedImg.src = dataUrl;
    } catch (err) {
      console.error("[CropPanel] Apply error:", err);
      setError(String(err));
    } finally {
      onClose();
    }
  };

  // ── Derived geometry for SVG overlay ──

  const canvas = canvasRef.current;
  const cw = canvas ? canvas.width : 560;
  const ch = canvas ? canvas.height : 373;
  const rectX = crop.x * cw;
  const rectY = crop.y * ch;
  const rectW = crop.w * cw;
  const rectH = crop.h * ch;

  let holeRx = "0";
  let holeRy = "0";
  if (cropMode === "circle") {
    holeRx = String(rectW / 2);
    holeRy = String(rectH / 2);
  } else if (cropMode === "rounded") {
    const scaleFactor = cw / srcImg.width;
    const displayRadius = borderRadius * scaleFactor;
    holeRx = String(displayRadius);
    holeRy = String(displayRadius);
  }

  const len = 16;
  const nwPath = `M ${rectX} ${rectY + len} L ${rectX} ${rectY} L ${rectX + len} ${rectY}`;
  const nePath = `M ${rectX + rectW - len} ${rectY} L ${rectX + rectW} ${rectY} L ${rectX + rectW} ${rectY + len}`;
  const swPath = `M ${rectX} ${rectY + rectH - len} L ${rectX} ${rectY + rectH} L ${rectX + len} ${rectY + rectH}`;
  const sePath = `M ${rectX + rectW - len} ${rectY + rectH} L ${rectX + rectW} ${rectY + rectH} L ${rectX + rectW} ${rectY + rectH - len}`;

  const edgeLen = 24;
  const isFree = ratio === "free";
  const edgeVisibility = isFree ? "" : "none";

  const edgeLine = (x1: number, y1: number, x2: number, y2: number) => ({
    x1: String(x1),
    y1: String(y1),
    x2: String(x2),
    y2: String(y2),
    style: { display: edgeVisibility } as const,
  });

  const nEdge = edgeLine(rectX + rectW / 2 - edgeLen / 2, rectY, rectX + rectW / 2 + edgeLen / 2, rectY);
  const sEdge = edgeLine(rectX + rectW / 2 - edgeLen / 2, rectY + rectH, rectX + rectW / 2 + edgeLen / 2, rectY + rectH);
  const wEdge = edgeLine(rectX, rectY + rectH / 2 - edgeLen / 2, rectX, rectY + rectH / 2 + edgeLen / 2);
  const eEdge = edgeLine(rectX + rectW, rectY + rectH / 2 - edgeLen / 2, rectX + rectW, rectY + rectH / 2 + edgeLen / 2);

  const strokeVisible = {
    fill: "none",
    stroke: "#fff",
    "stroke-width": "4",
    style: { pointerEvents: "none" } as const,
  } as const;
  const strokeHit = {
    fill: "none",
    stroke: "transparent",
    "stroke-width": "32",
    style: { pointerEvents: "auto" } as const,
  } as const;

  const handleBtnStyle = {
    padding: "6px 12px",
    background: "#333",
    border: "1px solid #555",
    borderRadius: "4px",
    color: "#ccc",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
  } as const;

  return (
    <div
      class="crop-editor"
      style={{ display: "flex", flexDirection: "column", gap: "12px" }}
    >
      {/* Preview + mask overlay */}
      <div
        ref={canvasWrapRef}
        id="crop-canvas-wrap"
        style={{
          position: "relative",
          background: "#000",
          borderRadius: "6px",
          overflow: "hidden",
          userSelect: "none",
          minHeight: "300px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ position: "relative", display: "inline-block" }}>
          <canvas
            ref={canvasRef}
            id="crop-canvas"
            style={{ display: "block", maxWidth: "100%", maxHeight: "60vh" }}
          />
          <div
            style={{
              position: "absolute",
              inset: "0",
              pointerEvents: "none",
            }}
          >
            <svg style={{ width: "100%", height: "100%", display: "block" }}>
              <defs>
                <mask id="crop-mask-unique">
                  <rect width="100%" height="100%" fill="white" />
                  <rect
                    {...HOLE_BASE}
                    x={String(rectX)}
                    y={String(rectY)}
                    width={String(rectW)}
                    height={String(rectH)}
                    rx={holeRx}
                    ry={holeRy}
                  />
                </mask>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="rgba(0,0,0,0.45)"
                mask="url(#crop-mask-unique)"
              />

              {/* Corner visible strokes */}
              <path d={nwPath} {...strokeVisible} />
              <path d={nePath} {...strokeVisible} />
              <path d={swPath} {...strokeVisible} />
              <path d={sePath} {...strokeVisible} />

              {/* Edge visible lines */}
              <line {...nEdge} stroke="#fff" stroke-width="4" />
              <line {...sEdge} stroke="#fff" stroke-width="4" />
              <line {...wEdge} stroke="#fff" stroke-width="4" />
              <line {...eEdge} stroke="#fff" stroke-width="4" />

              {/* Hit targets */}
              <path
                d={nwPath}
                {...strokeHit}
                style={{ cursor: "nwse-resize", pointerEvents: "auto" }}
                onMouseDown={(e: MouseEvent) => startDrag(e, "nw")}
              />
              <path
                d={nePath}
                {...strokeHit}
                style={{ cursor: "nesw-resize", pointerEvents: "auto" }}
                onMouseDown={(e: MouseEvent) => startDrag(e, "ne")}
              />
              <path
                d={swPath}
                {...strokeHit}
                style={{ cursor: "nesw-resize", pointerEvents: "auto" }}
                onMouseDown={(e: MouseEvent) => startDrag(e, "sw")}
              />
              <path
                d={sePath}
                {...strokeHit}
                style={{ cursor: "nwse-resize", pointerEvents: "auto" }}
                onMouseDown={(e: MouseEvent) => startDrag(e, "se")}
              />

              {isFree && (
                <>
                  <line
                    {...nEdge}
                    stroke="transparent"
                    stroke-width="32"
                    style={{ cursor: "ns-resize", pointerEvents: "auto" }}
                    onMouseDown={(e: MouseEvent) => startDrag(e, "n")}
                  />
                  <line
                    {...sEdge}
                    stroke="transparent"
                    stroke-width="32"
                    style={{ cursor: "ns-resize", pointerEvents: "auto" }}
                    onMouseDown={(e: MouseEvent) => startDrag(e, "s")}
                  />
                  <line
                    {...wEdge}
                    stroke="transparent"
                    stroke-width="32"
                    style={{ cursor: "ew-resize", pointerEvents: "auto" }}
                    onMouseDown={(e: MouseEvent) => startDrag(e, "w")}
                  />
                  <line
                    {...eEdge}
                    stroke="transparent"
                    stroke-width="32"
                    style={{ cursor: "ew-resize", pointerEvents: "auto" }}
                    onMouseDown={(e: MouseEvent) => startDrag(e, "e")}
                  />
                </>
              )}

              {/* Move area */}
              <rect
                x={`${crop.x * 100}%`}
                y={`${crop.y * 100}%`}
                width={`${crop.w * 100}%`}
                height={`${crop.h * 100}%`}
                fill="transparent"
                style={{ cursor: "move", pointerEvents: "auto" }}
                onMouseDown={(e: MouseEvent) => startDrag(e, "move")}
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Aspect bar */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          padding: "8px 0",
          borderBottom: "1px solid #444",
          borderTop: "1px solid #444",
          userSelect: "none",
        }}
      >
        {aspectRatios.map((item, index) => (
          <button
            type="button"
            class={`aspect-btn ${index === activeAspect ? "active" : ""}`}
            style={{
              padding: "4px 10px",
              background: index === activeAspect ? "#094771" : "#333",
              border: "1px solid #555",
              borderRadius: "4px",
              color: index === activeAspect ? "#fff" : "#ccc",
              cursor: "pointer",
              fontSize: "11px",
              whiteSpace: "nowrap",
            }}
            onClick={() => {
              setActiveAspect(index);
              applyRatio(item.value);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Shape controls */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          justifyContent: "center",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {cropMode !== "circle" && (
            <button
              type="button"
              style={{
                ...handleBtnStyle,
                background: cropMode === "rounded" ? "#094771" : "#333",
                color: cropMode === "rounded" ? "#fff" : "#ccc",
              }}
              onClick={() => {
                setCropMode((m) => (m === "rounded" ? "normal" : "rounded"));
              }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path
                  fill="currentColor"
                  d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v13z"
                />
              </svg>
              Rounded Corners
            </button>
          )}
          {cropMode !== "rounded" && (
            <button
              type="button"
              style={{
                ...handleBtnStyle,
                background: cropMode === "circle" ? "#094771" : "#333",
                color: cropMode === "circle" ? "#fff" : "#ccc",
              }}
              onClick={() => {
                setCropMode((m) => (m === "circle" ? "normal" : "circle"));
              }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path
                  fill="currentColor"
                  d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
                />
              </svg>
              Circle
            </button>
          )}
        </div>

        {cropMode !== "normal" && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {cropMode === "rounded" && (
              <>
                <span style={{ fontSize: "12px", color: "#aaa" }}>Radius (px):</span>
                <input
                  type="number"
                  value={borderRadius}
                  min={0}
                  max={200}
                  style={{
                    width: "64px",
                    background: "#1e1e1e",
                    border: "1px solid #555",
                    borderRadius: "4px",
                    padding: "4px 6px",
                    color: "#e0e0e0",
                    fontSize: "12px",
                  }}
                  onInput={(e: Event) => {
                    setBorderRadius(
                      parseFloat((e.target as HTMLInputElement).value) || 0
                    );
                  }}
                />
              </>
            )}
            <button
              type="button"
              style={{
                padding: "4px 8px",
                background: "#444",
                border: "none",
                borderRadius: "4px",
                color: "#ccc",
                cursor: "pointer",
                fontSize: "11px",
              }}
              onClick={() => {
                setCropMode("normal");
                setBorderRadius(20);
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {error && (
        <div style={{ color: "#e74c3c", fontSize: "12px", textAlign: "center" }}>
          {error}
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <button
          type="button"
          style={{
            padding: "8px 20px",
            background: "#094771",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "600",
          }}
          onClick={handleApply}
        >
          ✓ Apply Crop
        </button>
        <button
          type="button"
          style={{
            padding: "8px 20px",
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
  );
}

// ── Mount helper (replaces CropModule.open) ──

export function openCropPanel(options: CropPanelOptions = {}): void {
  // Resolve source image from options or background layer
  let srcImg = options.sourceImage;
  if (!srcImg && options.layerManager) {
    const bgLayer = options.layerManager.getBackgroundLayer();
    if (bgLayer && bgLayer.image) {
      srcImg = bgLayer.image;
    }
  }

  if (!srcImg) {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const close = () => {
      render(null, host);
      if (host.parentNode) host.parentNode.removeChild(host);
    };
    render(
      <div
        class="popup-overlay"
        onClick={(e: MouseEvent) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div class="popup-box" style={{ width: "360px" }}>
          <div class="popup-header">
            <span class="popup-title">Crop</span>
            <button type="button" class="popup-close" aria-label="Close" onClick={close}>
              &times;
            </button>
          </div>
          <div class="popup-body">
            <p
              style={{
                color: "#e74c3c",
                textAlign: "center",
                padding: "16px 0",
                fontSize: "13px",
              }}
            >
              ❌ Crop is only available for real photos.
              <br />
              Please load an image first.
            </p>
          </div>
        </div>
      </div>,
      host
    );
    return;
  }

  const host = document.createElement("div");
  document.body.appendChild(host);

  const close = () => {
    render(null, host);
    if (host.parentNode) host.parentNode.removeChild(host);
    if (options.onClose) options.onClose();
  };

  render(
    <PreactModal title="Crop Image" width="600px" onClose={close}>
      <CropPanel srcImg={srcImg} options={options} onClose={close} />
    </PreactModal>,
    host
  );
}
