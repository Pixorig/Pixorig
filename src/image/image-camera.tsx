/** @jsx h */
/** @jsxFrag Fragment */
import { h, render, Fragment } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { LayerManager } from "../core/layer";
import { PreactModal } from "../panels/common/gradient-panel";

/**
 * ImageCameraModal - From Camera for Image layer
 * Tạo layer mới type="image" thay vì ghi đè background
 */

function ImageCameraModal({
  layerManager,
  onClose,
}: {
  layerManager: LayerManager;
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

  const startCameraAgain = async () => {
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
  };

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
    setTimeout(() => {
      startCameraAgain();
    }, 0);
  };

  const handleUse = () => {
    if (capturedDataUrl) {
      const img = new Image();
      img.onload = () => {
        layerManager.createImageLayer(img);
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

export function openImageCameraModal(layerManager: LayerManager): void {
  const host = document.createElement("div");
  document.body.appendChild(host);

  const close = () => {
    render(null, host);
    if (host.parentNode) host.parentNode.removeChild(host);
  };

  render(
    <PreactModal title="Capture from Camera" width="520px" onClose={close}>
      <ImageCameraModal layerManager={layerManager} onClose={close} />
    </PreactModal>,
    host
  );
}
