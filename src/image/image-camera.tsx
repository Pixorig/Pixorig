/**
 * ImageCameraModule - From Camera for Image layer
 * Tạo layer mới type="image" thay vì ghi đè background
 */

import { h } from "../ui/jsx";
import { showPopup } from "../ui/Popup";
import { LayerManager } from "../core/layer";

export class ImageCameraModule {
  static open(layerManager: LayerManager): void {
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
        const msgEl = document.createElement("p");
        msgEl.style.color = "#e74c3c";
        msgEl.style.margin = "0 0 8px";
        msgEl.textContent = "Camera access denied or not available";
        const errEl = document.createElement("p");
        errEl.style.fontSize = "12px";
        errEl.style.color = "#999";
        errEl.style.margin = "0";
        errEl.textContent = err?.message || String(err);
        placeholderEl.textContent = "";
        placeholderEl.appendChild(msgEl);
        placeholderEl.appendChild(errEl);
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
          layerManager.createImageLayer(img);
        };
        img.src = capturedDataUrl;
      }
      stopCamera();
      popup.close();
    });

    startCamera();
  }
}
