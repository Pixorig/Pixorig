/** @jsx h */
/** @jsxFrag Fragment */
import { h, render, Fragment } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import { LayerManager } from "../../core/layer";
import { eventBus } from "../../core/event-bus";
import { PreactModal } from "./gradient-panel";
import { PreactPanelHeader } from "../../ui/base/panel-header";

// ── Types (kept from modules/background-subpanel.tsx) ──

export interface BackgroundSubpanelOptions {
  layerManager: LayerManager;
  onImageLoaded?: (img: HTMLImageElement) => void;
}

// ── Shared: load image into background layer ──

export function loadIntoBackground(
  layerManager: LayerManager,
  img: HTMLImageElement,
  onImageLoaded?: (img: HTMLImageElement) => void
): void {
  const canvas = layerManager.mainCanvas;
  canvas.width = img.width;
  canvas.height = img.height;
  layerManager.resizeAllLayers(img.width, img.height);

  const bgLayer = layerManager.getBackgroundLayer();
  bgLayer.clear();
  bgLayer.drawImage(img, 0, 0);

  const dropzone = document.getElementById("dropzone");
  if (dropzone) dropzone.classList.add("hidden");
  canvas.style.display = "block";

  layerManager.render();
  eventBus.emit("background:changed", { image: img });

  if (onImageLoaded) {
    onImageLoaded(img);
  }
}

function loadFromFile(
  layerManager: LayerManager,
  file: Blob | File,
  onImageLoaded?: (img: HTMLImageElement) => void
): void {
  const reader = new FileReader();
  reader.onload = (e) => {
    const src = e.target?.result as string;
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      loadIntoBackground(layerManager, img, onImageLoaded);
    };
    img.src = src;
  };
  reader.readAsDataURL(file);
}

// ── 1. Camera modal ──

function CameraModal({
  layerManager,
  onImageLoaded,
  onClose,
}: {
  layerManager: LayerManager;
  onImageLoaded?: (img: HTMLImageElement) => void;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<"requesting" | "live" | "captured" | "error">(
    "requesting"
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        setPhase("live");
      } catch (err: any) {
        if (!cancelled) {
          setErrorMsg(err?.message || String(err));
          setPhase("error");
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    setCapturedDataUrl(canvas.toDataURL("image/png"));
    setPhase("captured");
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedDataUrl(null);
    setPhase("requesting");

    // Restart camera after phase switch
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        setPhase("live");
      } catch (err: any) {
        setErrorMsg(err?.message || String(err));
        setPhase("error");
      }
    }, 0);
  };

  const handleUse = () => {
    if (capturedDataUrl) {
      const img = new Image();
      img.onload = () => {
        loadIntoBackground(layerManager, img, onImageLoaded);
      };
      img.src = capturedDataUrl;
    }
    stopCamera();
    onClose();
  };

  return (
    <div style={{ position: "relative", textAlign: "center" }}>
      <video
        ref={videoRef}
        autoplay
        playsinline
        style={{
          width: "100%",
          borderRadius: "6px",
          background: "#000",
          maxHeight: "60vh",
          display: phase === "live" ? "block" : "none",
        }}
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {phase === "requesting" && (
        <div
          style={{
            padding: "50px 20px",
            color: "#888",
            fontSize: "14px",
            textAlign: "center",
          }}
        >
          <p style={{ margin: "0 0 8px" }}>Requesting camera access...</p>
          <p style={{ fontSize: "12px", color: "#666", margin: "0" }}>
            Please allow camera permission when prompted.
          </p>
        </div>
      )}

      {phase === "error" && (
        <div
          style={{
            padding: "50px 20px",
            textAlign: "center",
          }}
        >
          <p style={{ color: "#e74c3c", margin: "0 0 8px" }}>
            Camera access denied or not available
          </p>
          <p style={{ fontSize: "12px", color: "#999", margin: "0" }}>{errorMsg}</p>
        </div>
      )}

      {capturedDataUrl && (
        <img
          src={capturedDataUrl}
          style={{
            width: "100%",
            borderRadius: "6px",
            maxHeight: "60vh",
            objectFit: "contain",
          }}
        />
      )}

      <div
        style={{
          display: "flex",
          gap: "12px",
          justifyContent: "center",
          marginTop: "16px",
        }}
      >
        {phase === "live" && (
          <button
            type="button"
            style={{
              padding: "10px 22px",
              background: "#094771",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
            }}
            onClick={handleCapture}
          >
            Capture
          </button>
        )}
        {phase === "captured" && (
          <>
            <button
              type="button"
              style={{
                padding: "10px 22px",
                background: "#555",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
              }}
              onClick={handleRetake}
            >
              Retake
            </button>
            <button
              type="button"
              style={{
                padding: "10px 22px",
                background: "#2d8a2d",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
              }}
              onClick={handleUse}
            >
              Use Photo
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function openCameraModal(options: BackgroundSubpanelOptions): void {
  const host = document.createElement("div");
  document.body.appendChild(host);

  const close = () => {
    render(null, host);
    if (host.parentNode) host.parentNode.removeChild(host);
  };

  render(
    <PreactModal
      title="Capture from Camera"
      width="520px"
      onClose={close}
    >
      <CameraModal
        layerManager={options.layerManager}
        onImageLoaded={options.onImageLoaded}
        onClose={close}
      />
    </PreactModal>,
    host
  );
}

// ── 2. Upload modal ──

function UploadModal({
  layerManager,
  onImageLoaded,
  onClose,
}: {
  layerManager: LayerManager;
  onImageLoaded?: (img: HTMLImageElement) => void;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const urlInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showError = (msg: string) => setError(msg);
  const hideError = () => setError(null);

  const handleFileChange = () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showError("Please select a valid image file.");
      return;
    }
    loadFromFile(layerManager, file, onImageLoaded);
    hideError();
    onClose();
  };

  const handleUrlSubmit = () => {
    const url = urlInputRef.current?.value.trim() || "";
    if (!url) {
      showError("Please enter an image URL.");
      return;
    }

    setLoading(true);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const cCtx = c.getContext("2d");
      if (cCtx) {
        cCtx.drawImage(img, 0, 0);
        c.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "url-image.png", { type: "image/png" });
            loadFromFile(layerManager, file, onImageLoaded);
            hideError();
            onClose();
          } else {
            showError("Failed to process image blob.");
            setLoading(false);
          }
        });
      }
    };

    img.onerror = () => {
      showError("Could not load image from URL. CORS restrictions or invalid URL.");
      setLoading(false);
    };

    img.src = url;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <label style={{ color: "#ccc", fontSize: "13px", fontWeight: "600" }}>
        From File
      </label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ color: "#ccc", fontSize: "13px" }}
        onChange={handleFileChange}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          color: "#666",
          fontSize: "12px",
        }}
      >
        <span style={{ flex: 1, height: "1px", background: "#444" }} />
        <span>OR</span>
        <span style={{ flex: 1, height: "1px", background: "#444" }} />
      </div>

      <label style={{ color: "#ccc", fontSize: "13px", fontWeight: "600" }}>
        From URL
      </label>
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          ref={urlInputRef}
          type="text"
          placeholder="https://example.com/image.jpg"
          style={{
            flex: 1,
            background: "#1e1e1e",
            border: "1px solid #555",
            borderRadius: "4px",
            padding: "8px 10px",
            color: "#e0e0e0",
            fontSize: "13px",
          }}
          onKeyDown={(e: KeyboardEvent) => {
            if (e.key === "Enter") handleUrlSubmit();
          }}
        />
        <button
          type="button"
          disabled={loading}
          style={{
            padding: "8px 16px",
            background: "#094771",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "600",
          }}
          onClick={handleUrlSubmit}
        >
          {loading ? "Loading..." : "Load"}
        </button>
      </div>

      {error && (
        <div
          style={{
            color: "#e74c3c",
            fontSize: "12px",
            padding: "8px",
            background: "#3a1a1a",
            borderRadius: "4px",
            border: "1px solid #5a2a2a",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

export function openUploadModal(options: BackgroundSubpanelOptions): void {
  const host = document.createElement("div");
  document.body.appendChild(host);

  const close = () => {
    render(null, host);
    if (host.parentNode) host.parentNode.removeChild(host);
  };

  render(
    <PreactModal title="Upload Image" width="420px" onClose={close}>
      <UploadModal
        layerManager={options.layerManager}
        onImageLoaded={options.onImageLoaded}
        onClose={close}
      />
    </PreactModal>,
    host
  );
}

// ── 3. Size panel (renders inside sub-sidebar) ──

export function SizePanel({
  layerManager,
  onBack,
}: {
  layerManager: LayerManager;
  onBack: () => void;
}) {
  const canvas = layerManager.mainCanvas;
  const canvasW = canvas.width || 1200;
  const canvasH = canvas.height || 600;

  const gcd = (a: number, b: number): number => {
    if (!b) return a || 1;
    return gcd(b, a % b);
  };

  const g = gcd(canvasW, canvasH);
  const [width, setWidth] = useState(String(canvasW));
  const [height, setHeight] = useState(String(canvasH));
  const [keepAspect, setKeepAspect] = useState(true);
  const [aspectBase, setAspectBase] = useState({ w: canvasW, h: canvasH });
  const [presetLabel, setPresetLabel] = useState("Select preset...");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const aspectW = Math.round(canvasW / g);
  const aspectH = Math.round(canvasH / g);

  const presets = [
    { label: "Original", w: canvasW, h: canvasH },
    { label: "Square (1:1)", w: 1080, h: 1080 },
    { label: "Instagram Portrait (4:5)", w: 1080, h: 1350 },
    { label: "Instagram Landscape (1.91:1)", w: 1080, h: 565 },
    { label: "Twitter Post (16:9)", w: 1280, h: 720 },
    { label: "Twitter Header (3:1)", w: 1500, h: 500 },
    { label: "Facebook Post (1.91:1)", w: 1200, h: 630 },
    { label: "Facebook Cover (16:9)", w: 1640, h: 624 },
    { label: "YouTube Thumbnail (16:9)", w: 1280, h: 720 },
    { label: "TikTok (9:16)", w: 1080, h: 1920 },
    { label: "A4", w: 2480, h: 3508 },
    { label: "A3", w: 3508, h: 4961 },
  ];

  const updateAspect = (w: string, h: string) => {
    const a = parseInt(w, 10);
    const b = parseInt(h, 10);
    if (a > 0 && b > 0) {
      const gv = gcd(a, b);
      return `${Math.round(a / gv)}:${Math.round(b / gv)}`;
    }
    return `${aspectW}:${aspectH}`;
  };

  const [aspectText, setAspectText] = useState(() =>
    updateAspect(String(canvasW), String(canvasH))
  );

  const handleWidthInput = (val: string) => {
    setWidth(val);
    setAspectText(updateAspect(val, height));
    if (keepAspect) {
      const newW = parseInt(val, 10) || 1;
      const newH = String(Math.round(newW * (aspectBase.h / aspectBase.w)));
      setHeight(newH);
      setAspectText(updateAspect(val, newH));
    }
  };

  const handleHeightInput = (val: string) => {
    setHeight(val);
    setAspectText(updateAspect(width, val));
    if (keepAspect) {
      const newH = parseInt(val, 10) || 1;
      const newW = String(Math.round(newH * (aspectBase.w / aspectBase.h)));
      setWidth(newW);
      setAspectText(updateAspect(newW, val));
    }
  };

  const handleKeepChange = (checked: boolean) => {
    setKeepAspect(checked);
    if (checked) {
      setAspectBase({
        w: parseInt(width, 10) || canvasW,
        h: parseInt(height, 10) || canvasH,
      });
    }
  };

  const handleReset = () => {
    setWidth(String(canvasW));
    setHeight(String(canvasH));
    setAspectBase({ w: canvasW, h: canvasH });
    setPresetLabel("Select preset...");
    setAspectText(updateAspect(String(canvasW), String(canvasH)));
  };

  const handleApply = () => {
    const newW = parseInt(width, 10);
    const newH = parseInt(height, 10);
    if (newW > 0 && newH > 0) {
      canvas.width = newW;
      canvas.height = newH;
      layerManager.resizeAllLayers(newW, newH);
      layerManager.render();
      eventBus.emit("canvas:resized", { width: newW, height: newH });
    }
  };

  const inputStyle = {
    width: "100%",
    background: "#1e1e1e",
    border: "1px solid #555",
    borderRadius: "4px",
    padding: "6px 8px",
    color: "#e0e0e0",
    fontSize: "13px",
    boxSizing: "border-box" as const,
  };

  return (
    <div
      class="size-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "4px 0",
      }}
    >
      <PreactPanelHeader title="Canvas Size" onBack={onBack} onReset={handleReset} />

      <div>
        <label
          style={{
            fontSize: "11px",
            color: "#999",
            display: "block",
            marginBottom: "4px",
          }}
        >
          Aspect Ratio
        </label>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: "13px",
            color: "#e0e0e0",
            background: "#1e1e1e",
            padding: "8px 10px",
            borderRadius: "4px",
            border: "1px solid #555",
            textAlign: "center",
          }}
        >
          {aspectText}
        </div>
      </div>

      <div>
        <label
          style={{
            fontSize: "11px",
            color: "#999",
            display: "block",
            marginBottom: "4px",
          }}
        >
          Dimensions
        </label>
        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: "10px", color: "#888" }}>Width</span>
            <input
              type="number"
              value={width}
              min="1"
              style={inputStyle}
              onInput={(e: Event) => handleWidthInput((e.target as HTMLInputElement).value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: "10px", color: "#888" }}>Height</span>
            <input
              type="number"
              value={height}
              min="1"
              style={inputStyle}
              onInput={(e: Event) => handleHeightInput((e.target as HTMLInputElement).value)}
            />
          </div>
        </div>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginTop: "6px",
            fontSize: "11px",
            color: "#999",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={keepAspect}
            onChange={(e: Event) =>
              handleKeepChange((e.target as HTMLInputElement).checked)
            }
          />
          Keep aspect ratio
        </label>
      </div>

      <div style={{ position: "relative" }}>
        <label
          style={{
            fontSize: "11px",
            color: "#999",
            display: "block",
            marginBottom: "4px",
          }}
        >
          Preset
        </label>
        <button
          type="button"
          style={{
            width: "100%",
            padding: "8px 10px",
            background: "#1e1e1e",
            border: "1px solid #555",
            borderRadius: "4px",
            color: "#ccc",
            fontSize: "12px",
            cursor: "pointer",
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
          onClick={(e: MouseEvent) => {
            e.stopPropagation();
            setDropdownOpen((v) => !v);
          }}
        >
          {presetLabel}
          <svg viewBox="0 0 24 24" width="14" height="14">
            <path fill="currentColor" d="M7 10l5 5 5-5z" />
          </svg>
        </button>

        {dropdownOpen && (
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              left: 0,
              right: 0,
              marginBottom: "4px",
              background: "#1e1e1e",
              border: "1px solid #555",
              borderRadius: "4px",
              maxHeight: "240px",
              overflowY: "auto",
              zIndex: 10,
            }}
          >
            {presets.map((p) => (
              <button
                type="button"
                key={p.label}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  background: "transparent",
                  border: "none",
                  color: "#ccc",
                  fontSize: "12px",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onClick={(e: MouseEvent) => {
                  e.stopPropagation();
                  setPresetLabel(p.label);
                  setWidth(String(p.w));
                  setHeight(String(p.h));
                  setAspectBase({ w: p.w, h: p.h });
                  setAspectText(updateAspect(String(p.w), String(p.h)));
                  setDropdownOpen(false);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

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
          fontWeight: "600",
        }}
        onClick={handleApply}
      >
        Apply
      </button>
    </div>
  );
}

// ── 4. Transparent ──

export function openTransparent(layerManager: LayerManager): void {
  const canvas = layerManager.mainCanvas;
  const W = canvas.width || 1200;
  const H = canvas.height || 600;

  const bgLayer = layerManager.getBackgroundLayer();
  bgLayer.image = undefined;
  bgLayer.clear();

  const dropzone = document.getElementById("dropzone");
  if (dropzone) dropzone.classList.add("hidden");
  canvas.style.display = "block";

  layerManager.render();
  eventBus.emit("background:transparent", { width: W, height: H });
}
