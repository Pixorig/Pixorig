/**
 * ImageUploadModule - From Upload for Image layer
 * Tạo layer mới type="image" thay vì ghi đè background
 */

import { h } from "../ui/jsx";
import { showPopup } from "../ui/Popup";
import { LayerManager } from "../core/layer";

export class ImageUploadModule {
  static open(layerManager: LayerManager): void {
    const fileInput = (
      <input
        type="file"
        accept="image/*"
        style={{ color: "#ccc", fontSize: "13px" }}
      />
    ) as HTMLInputElement;

    const urlInput = (
      <input
        type="text"
        placeholder="https://example.com/image.jpg"
        style={{
          flex: "1",
          background: "#1e1e1e",
          border: "1px solid #555",
          borderRadius: "4px",
          padding: "8px 10px",
          color: "#e0e0e0",
          fontSize: "13px",
        }}
      />
    ) as HTMLInputElement;

    const urlBtn = (
      <button
        type="button"
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
      >
        Load
      </button>
    ) as HTMLButtonElement;

    const errorEl = (
      <div
        style={{
          display: "none",
          color: "#e74c3c",
          fontSize: "12px",
          padding: "8px",
          background: "#3a1a1a",
          borderRadius: "4px",
          border: "1px solid #5a2a2a",
        }}
      />
    ) as HTMLElement;

    const showError = (msg: string) => {
      errorEl.textContent = msg;
      errorEl.style.display = "block";
    };

    const hideError = () => {
      errorEl.style.display = "none";
    };

    const loadImageIntoLayer = (img: HTMLImageElement) => {
      layerManager.createImageLayer(img);
    };

    const loadFromFile = (file: Blob | File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        if (!src) return;
        const img = new Image();
        img.onload = () => {
          loadImageIntoLayer(img);
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    };

    const uploadContainer = (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <label style={{ color: "#ccc", fontSize: "13px", fontWeight: "600" }}>
          From File
        </label>
        {fileInput}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            color: "#666",
            fontSize: "12px",
          }}
        >
          <span style={{ flex: "1", height: "1px", background: "#444" }}></span>
          <span>OR</span>
          <span style={{ flex: "1", height: "1px", background: "#444" }}></span>
        </div>

        <label style={{ color: "#ccc", fontSize: "13px", fontWeight: "600" }}>
          From URL
        </label>
        <div style={{ display: "flex", gap: "8px" }}>
          {urlInput}
          {urlBtn}
        </div>

        {errorEl}
      </div>
    ) as HTMLElement;

    const popup = showPopup({
      title: "Add Image",
      width: "420px",
      content: uploadContainer,
    });

    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        showError("Please select a valid image file.");
        fileInput.value = "";
        return;
      }
      loadFromFile(file);
      hideError();
      // Reset để lần sau vẫn trigger change dù chọn cùng file
      fileInput.value = "";
    });

    const handleUrlSubmit = () => {
      const url = urlInput.value.trim();
      if (!url) {
        showError("Please enter an image URL.");
        return;
      }

      urlBtn.disabled = true;
      urlBtn.textContent = "Loading...";

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
              hideError();
              popup.close();
            } else {
              showError("Failed to process image blob.");
              urlBtn.disabled = false;
              urlBtn.textContent = "Load";
            }
          });
        }
      };

      img.onerror = () => {
        showError("Could not load image from URL. CORS restrictions or invalid URL.");
        urlBtn.disabled = false;
        urlBtn.textContent = "Load";
      };

      img.src = url;
    };

    urlBtn.addEventListener("click", handleUrlSubmit);
    urlInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleUrlSubmit();
    });
  }
}
