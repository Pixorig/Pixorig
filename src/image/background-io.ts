import type { LayerManager } from "../core/layer";
import { eventBus } from "../core/event-bus";

/**
 * Background image IO — moved verbatim from background-subpanel.tsx so the
 * WarmJS ports (camera/upload modals, transparent) stay pixel-logic free.
 * No JSX here; safe to import from anywhere in Pixorig.
 */

/** Draw an image over the whole background (resizes canvas + layers). */
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

/** Read a file blob and load it into the background. */
export function loadFileIntoBackground(
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

/** Clear the background to transparent (checkerboard). */
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
