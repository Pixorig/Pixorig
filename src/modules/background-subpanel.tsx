/**
 * Background Subpanel Module - TSX Real DOM
 * Cung cấp các công cụ cho Background layer:
 * - Camera (openCamera): WebRTC getUserMedia video preview, snap photo, load into Background layer, retake, stop stream
 * - Upload (openUpload): File input or Image URL fetch with CORS to Blob/Image and load into Background layer
 * - Size Panel (openSizePanel): Aspect ratio, width/height inputs, keep-aspect, presets, apply resize to LayerManager & canvas
 * - Transparent (openTransparent): Clear canvas, reset background layer image, render transparent checkerboard
 */

import { h } from "../ui/jsx";
import { PanelHeader } from "../ui/PanelHeader";
import { showPopup, showDropdown } from "../ui/Popup";
import { LayerManager } from "../core/layer";
import { eventBus } from "../core/event-bus";

export interface BackgroundSubpanelOptions {
  layerManager: LayerManager;
  onImageLoaded?: (img: HTMLImageElement) => void;
}

export class BackgroundSubpanel {
  private layerManager: LayerManager;
  private onImageLoaded?: (img: HTMLImageElement) => void;
  private savedSubHTML: string | null = null;

  constructor(options: BackgroundSubpanelOptions) {
    this.layerManager = options.layerManager;
    this.onImageLoaded = options.onImageLoaded;
  }

  /**
   * Update layerManager instance if needed
   */
  setLayerManager(lm: LayerManager): void {
    this.layerManager = lm;
  }

  /**
   * Load HTMLImageElement into Background layer & adjust canvas
   */
  loadIntoBackground(img: HTMLImageElement): void {
    const canvas = this.layerManager.mainCanvas;
    canvas.width = img.width;
    canvas.height = img.height;
    this.layerManager.resizeAllLayers(img.width, img.height);

    const bgLayer = this.layerManager.getBackgroundLayer();
    bgLayer.clear();
    bgLayer.drawImage(img, 0, 0);

    const dropzone = document.getElementById("dropzone");
    if (dropzone) dropzone.classList.add("hidden");
    canvas.style.display = "block";

    this.layerManager.render();
    eventBus.emit("background:changed", { image: img });

    if (this.onImageLoaded) {
      this.onImageLoaded(img);
    }
  }

  /**
   * Load image file (File or Blob) into Background layer
   */
  loadFromFile(file: Blob | File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) return;
      const img = new Image();
      img.onload = () => {
        this.loadIntoBackground(img);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  /**
   * 1. From Camera (openCamera)
   */
  openCamera(): void {
    let stream: MediaStream | null = null;
    let capturedDataUrl: string | null = null;

    const stopCamera = () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        stream = null;
      }
    };

    const videoEl = (
      <video
        autoplay
        playsinline
        style={{
          width: "100%",
          borderRadius: "6px",
          background: "#000",
          maxHeight: "60vh",
          display: "none",
        }}
      />
    ) as HTMLVideoElement;

    const canvasEl = document.createElement("canvas");
    canvasEl.style.display = "none";

    const placeholderEl = (
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
    ) as HTMLElement;

    const capturedImgEl = (
      <img
        style={{
          width: "100%",
          borderRadius: "6px",
          maxHeight: "60vh",
          objectFit: "contain",
        }}
      />
    ) as HTMLImageElement;

    const previewWrapper = (
      <div style={{ display: "none" }}>{capturedImgEl}</div>
    ) as HTMLElement;

    const captureBtn = (
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
      >
        Capture
      </button>
    ) as HTMLButtonElement;

    const retakeBtn = (
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
          display: "none",
        }}
      >
        Retake
      </button>
    ) as HTMLButtonElement;

    const useBtn = (
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
          display: "none",
        }}
      >
        Use Photo
      </button>
    ) as HTMLButtonElement;

    const actionsContainer = (
      <div
        style={{
          display: "flex",
          gap: "12px",
          justifyContent: "center",
          marginTop: "16px",
        }}
      >
        {captureBtn}
        {retakeBtn}
        {useBtn}
      </div>
    ) as HTMLElement;

    const contentBox = (
      <div style={{ position: "relative", textAlign: "center" }}>
        {videoEl}
        {canvasEl}
        {placeholderEl}
        {previewWrapper}
        {actionsContainer}
      </div>
    ) as HTMLElement;

    const popup = showPopup({
      title: "Capture from Camera",
      width: "520px",
      content: contentBox,
      onClose: stopCamera,
    });

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        videoEl.srcObject = stream;
        await videoEl.play();
        placeholderEl.style.display = "none";
        videoEl.style.display = "block";
      } catch (err: any) {
        placeholderEl.innerHTML = `
          <p style="color:#e74c3c;margin:0 0 8px;">Camera access denied or not available</p>
          <p style="font-size:12px;color:#999;margin:0;">${err?.message || String(err)}</p>
        `;
      }
    };

    captureBtn.addEventListener("click", () => {
      if (!videoEl.videoWidth) return;
      canvasEl.width = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;
      const ctx = canvasEl.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(videoEl, 0, 0);
      capturedDataUrl = canvasEl.toDataURL("image/png");

      videoEl.style.display = "none";
      capturedImgEl.src = capturedDataUrl;
      previewWrapper.style.display = "block";

      captureBtn.style.display = "none";
      retakeBtn.style.display = "inline-flex";
      useBtn.style.display = "inline-flex";

      stopCamera();
    });

    retakeBtn.addEventListener("click", () => {
      previewWrapper.style.display = "none";
      capturedDataUrl = null;
      captureBtn.style.display = "inline-flex";
      retakeBtn.style.display = "none";
      useBtn.style.display = "none";
      startCamera();
    });

    useBtn.addEventListener("click", () => {
      if (capturedDataUrl) {
        const img = new Image();
        img.onload = () => {
          this.loadIntoBackground(img);
        };
        img.src = capturedDataUrl;
      }
      stopCamera();
      popup.close();
    });

    startCamera();
  }

  /**
   * 2. From Upload (openUpload)
   */
  openUpload(): void {
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
      title: "Upload Image",
      width: "420px",
      content: uploadContainer,
    });

    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        showError("Please select a valid image file.");
        return;
      }
      this.loadFromFile(file);
      hideError();
      popup.close();
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
              this.loadFromFile(file);
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

  /**
   * 3. Size Panel (openSizePanel)
   * Render inside sub-sidebar
   */
  openSizePanel(): void {
    const subSidebar = document.getElementById("sub-sidebar");
    if (!subSidebar) return;

    const canvas = this.layerManager.mainCanvas;
    const canvasW = canvas.width || 1200;
    const canvasH = canvas.height || 600;

    const gcd = (a: number, b: number): number => {
      if (!b) return a || 1;
      return gcd(b, a % b);
    };

    const g = gcd(canvasW, canvasH);
    let aspectW = Math.round(canvasW / g);
    let aspectH = Math.round(canvasH / g);
    let currentW = canvasW;
    let currentH = canvasH;
    let keepAspect = true;

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

    if (!subSidebar.querySelector(".size-panel")) {
      this.savedSubHTML = subSidebar.innerHTML;
    }

    const backBtn = PanelHeader({
      title: "Canvas Size",
      onBack: () => restoreSubpanel(),
      onReset: () => {
        widthInput.value = String(canvasW);
        heightInput.value = String(canvasH);
        currentW = canvasW;
        currentH = canvasH;
        presetLabel.textContent = "Select preset...";
        updateAspect();
      },
    });

    const aspectDisplay = (
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
        {aspectW}:{aspectH}
      </div>
    ) as HTMLElement;

    const widthInput = (
      <input
        type="number"
        value={String(currentW)}
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
      />
    ) as HTMLInputElement;

    const heightInput = (
      <input
        type="number"
        value={String(currentH)}
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
      />
    ) as HTMLInputElement;

    const keepCheck = (
      <input type="checkbox" checked />
    ) as HTMLInputElement;

    const presetLabel = (
      <span>Select preset...</span>
    ) as HTMLElement;

    const presetBtn = (
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
      >
        {presetLabel}
        <svg viewBox="0 0 24 24" width="14" height="14">
          <path fill="currentColor" d="M7 10l5 5 5-5z" />
        </svg>
      </button>
    ) as HTMLElement;

    const applyBtn = (
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
      >
        Apply
      </button>
    ) as HTMLButtonElement;

    const updateAspect = () => {
      const a = parseInt(widthInput.value, 10);
      const b = parseInt(heightInput.value, 10);
      if (a > 0 && b > 0) {
        const gv = gcd(a, b);
        aspectDisplay.textContent = `${Math.round(a / gv)}:${Math.round(b / gv)}`;
      }
    };

    widthInput.addEventListener("input", () => {
      if (keepCheck.checked) {
        const newW = parseInt(widthInput.value, 10) || 1;
        heightInput.value = String(Math.round(newW * (currentH / currentW)));
      }
      updateAspect();
    });

    heightInput.addEventListener("input", () => {
      if (keepCheck.checked) {
        const newH = parseInt(heightInput.value, 10) || 1;
        widthInput.value = String(Math.round(newH * (currentW / currentH)));
      }
      updateAspect();
    });

    keepCheck.addEventListener("change", () => {
      keepAspect = keepCheck.checked;
      if (keepAspect) {
        currentW = parseInt(widthInput.value, 10) || canvasW;
        currentH = parseInt(heightInput.value, 10) || canvasH;
      }
    });

    presetBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      showDropdown(presetBtn, {
        items: presets.map((p) => ({
          label: p.label,
          action: "preset",
          _w: p.w,
          _h: p.h,
        })),
        onItemClick: (item: any) => {
          presetLabel.textContent = item.label;
          widthInput.value = String(item._w);
          heightInput.value = String(item._h);
          currentW = item._w;
          currentH = item._h;
          updateAspect();
        },
      });
    });

    const restoreSubpanel = () => {
      if (this.savedSubHTML) {
        subSidebar.innerHTML = this.savedSubHTML;
        this.savedSubHTML = null;
        eventBus.emit("subsidebar:restored");
      }
    };

    applyBtn.addEventListener("click", () => {
      const newW = parseInt(widthInput.value, 10);
      const newH = parseInt(heightInput.value, 10);
      if (newW > 0 && newH > 0) {
        canvas.width = newW;
        canvas.height = newH;
        this.layerManager.resizeAllLayers(newW, newH);
        this.layerManager.render();
        eventBus.emit("canvas:resized", { width: newW, height: newH });
      }
    });

    const panel = (
      <div
        class="size-panel"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          padding: "4px 0",
        }}
      >
        {backBtn}
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
          {aspectDisplay}
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
            <div style={{ flex: "1" }}>
              <span style={{ fontSize: "10px", color: "#888" }}>Width</span>
              {widthInput}
            </div>
            <div style={{ flex: "1" }}>
              <span style={{ fontSize: "10px", color: "#888" }}>Height</span>
              {heightInput}
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
            {keepCheck}
            Keep aspect ratio
          </label>
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
            Preset
          </label>
          {presetBtn}
        </div>

        {applyBtn}
      </div>
    ) as HTMLElement;

    subSidebar.innerHTML = "";
    subSidebar.appendChild(panel);
  }

  /**
   * 4. Transparent (openTransparent)
   * Clear canvas, reset background layer image, render transparent checkerboard
   */
  openTransparent(): void {
    const canvas = this.layerManager.mainCanvas;
    const W = canvas.width || 1200;
    const H = canvas.height || 600;

    const bgLayer = this.layerManager.getBackgroundLayer();
    bgLayer.image = undefined;
    bgLayer.clear();

    const dropzone = document.getElementById("dropzone");
    if (dropzone) dropzone.classList.add("hidden");
    canvas.style.display = "block";

    this.layerManager.render();
    eventBus.emit("background:transparent", { width: W, height: H });
  }
}
