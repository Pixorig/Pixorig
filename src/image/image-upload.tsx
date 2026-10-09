/** @jsx h */
/** @jsxFrag Fragment */
import { h, render } from "preact";
import { useRef, useState } from "preact/hooks";
import { LayerManager } from "../core/layer";
import { PreactModal } from "../panels/common/gradient-panel";

/**
 * ImageUploadModal - From Upload for Image layer
 * Tạo layer mới type="image" thay vì ghi đè background
 */

function ImageUploadModal({
  layerManager,
  onClose,
}: {
  layerManager: LayerManager;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const urlInputRef = useRef<HTMLInputElement | null>(null);

  const loadFromFile = (file: Blob | File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) return;
      const img = new Image();
      img.onload = () => {
        layerManager.createImageLayer(img);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = () => {
    const input = fileInputRef.current;
    const file = input?.files?.[0];
    if (!file || !input) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      input.value = "";
      return;
    }
    setError("");
    loadFromFile(file);
    // Reset để lần sau vẫn trigger change dù chọn cùng file
    input.value = "";
    onClose();
  };

  const handleUrlSubmit = () => {
    const url = urlInputRef.current?.value.trim() || "";
    if (!url) {
      setError("Please enter an image URL.");
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
            loadFromFile(file);
            setError("");
            onClose();
          } else {
            setError("Failed to process image blob.");
            setLoading(false);
          }
        });
      }
    };

    img.onerror = () => {
      setError("Could not load image from URL. CORS restrictions or invalid URL.");
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

export function openImageUploadModal(layerManager: LayerManager): void {
  const host = document.createElement("div");
  document.body.appendChild(host);

  const close = () => {
    render(null, host);
    if (host.parentNode) host.parentNode.removeChild(host);
  };

  render(
    <PreactModal title="Add Image" width="420px" onClose={close}>
      <ImageUploadModal layerManager={layerManager} onClose={close} />
    </PreactModal>,
    host
  );
}
