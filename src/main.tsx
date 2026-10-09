/** @jsx h */
/** @jsxFrag Fragment */
import { h } from "preact";
import { LayerManager, Layer } from "./core/layer";
import { TextTransform } from "./text/text-transform";
import { TextHandler } from "./text/text";
import { mountLayerListPanel } from "./ui/LayerList";
import { ColorService } from "./core/layer/color-service";
import { mountColorPanel } from "./panels/common/color-panel";
import {
  openCropPanel,
  type CropPanelOptions,
} from "./panels/common/crop-panel";
import { openGradientPanel, type GradientModuleOptions } from "./panels/common/gradient-panel";
import {
  openCameraModal,
  openUploadModal,
  SizePanel,
  openTransparent,
} from "./panels/common/background-subpanel";
import { render } from "preact";
import { mountCutoutPanel } from "./panels/common/cutout-panel";
import { openImageUploadModal } from "./image/image-upload";
import { openImageCameraModal } from "./image/image-camera";
import { BarActions } from "./core/bar-actions";
import { ImageTransform } from "./core/image-transform";
import { eventBus } from "./core/event-bus";
import { clearAllSnapshotsForLayer } from "./core/panel-state-store";
import { showDropdown } from "./ui/dropdown";

console.log("[Pixorig] Initialized full app with Vite + TS/TSX");

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const dropzone = document.getElementById("dropzone") as HTMLElement;

if (canvas) {
  const layerManager = new LayerManager(canvas);
  const textTransform = new TextTransform(canvas, layerManager);
  const textHandler = new TextHandler(layerManager, textTransform);

  const barActions = new BarActions(layerManager);
  // Selection Box / Bounding Box cho image layer (di chuyển, resize, xoay)
  new ImageTransform(canvas, layerManager);

  // Persistent preact host for the background Size panel
  const sizePanelHost = document.createElement("div");

  const mountSizePanel = () => {
    const subSidebar = document.getElementById("sub-sidebar");
    if (!subSidebar) return;

    // Lưu nội dung hiện tại để Back khôi phục lại (giống bản modules cũ)
    if (!subSidebar.querySelector(".size-panel")) {
      subSidebar.dataset._savedInner = subSidebar.innerHTML;
    }
    subSidebar.innerHTML = "";
    subSidebar.appendChild(sizePanelHost);

    const restoreSubpanel = () => {
      render(null, sizePanelHost);
      if (sizePanelHost.parentNode) {
        sizePanelHost.parentNode.removeChild(sizePanelHost);
      }
      if (subSidebar.dataset._savedInner) {
        subSidebar.innerHTML = subSidebar.dataset._savedInner;
        delete subSidebar.dataset._savedInner;
      }
      eventBus.emit("subsidebar:restored");
    };

    render(
      <SizePanel layerManager={layerManager} onBack={restoreSubpanel} />,
      sizePanelHost
    );
  };

  // Gradient custom popup listener
  eventBus.on("gradient:open-custom", (payload?: { targetLayer?: Layer; onApply?: (data: any) => void }) => {
    openGradientPanel({
      layerManager,
      textTransform,
      targetLayer: payload?.targetLayer,
      onApply: payload?.onApply,
    } as GradientModuleOptions);
  });

  // Setup Layer Sidebar (Preact)
  const layerListContainer = document.getElementById("layer-list");
  if (layerListContainer) {
    mountLayerListPanel(layerListContainer, {
      layerManager,
      onSelect: (id) => layerManager.setActiveLayer(id),
      onDelete: (id) => layerManager.deleteLayer(id),
    });
  }

  // Load Image Drag & Drop
  function handleImageFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        layerManager.resizeAllLayers(img.width, img.height);
        const bgLayer = layerManager.getBackgroundLayer();
        bgLayer.drawImage(img, 0, 0);

        dropzone.classList.add("hidden");
        canvas.style.display = "block";
        layerManager.render();
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    const file = e.dataTransfer?.files[0];
    if (file && file.type.startsWith("image/")) {
      handleImageFile(file);
    }
  });

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.style.display = "none";
  fileInput.addEventListener("change", (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) handleImageFile(file);
  });
  document.body.appendChild(fileInput);
  dropzone.addEventListener("click", () => fileInput.click());

  // Top bar buttons
  document.querySelectorAll(".top-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = (btn as HTMLElement).dataset.action;

      if (action === "undo") {
        btn.classList.add("active");
        setTimeout(() => btn.classList.remove("active"), 200);
        barActions.undo();
        return;
      }

      if (action === "redo") {
        btn.classList.add("active");
        setTimeout(() => btn.classList.remove("active"), 200);
        barActions.redo();
        return;
      }

      if (action === "ruler") {
        btn.classList.toggle("active");
        return;
      }

      if (action === "layer") {
        btn.classList.toggle("active");
        const layerSidebar = document.getElementById("layer-sidebar");
        const body = document.getElementById("body");
        if (layerSidebar && body) {
          if (btn.classList.contains("active")) {
            layerSidebar.classList.remove("hidden");
            body.classList.add("layer-open");
          } else {
            layerSidebar.classList.add("hidden");
            body.classList.remove("layer-open");
          }
        }
        return;
      }

      if (action === "add") {
        showDropdown(btn as HTMLElement, {
          items: [
            {
              label: "Image",
              action: "add-image",
              icon: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>',
            },
            {
              label: "Text",
              action: "add-text",
              icon: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M5 4v3h5.5v12h3V7H19V4H5z"/></svg>',
            },
            {
              label: "Current Date",
              action: "add-date",
              icon: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>',
            },
          ],
          onItemClick: (item) => {
            if (item.action === "add-image") {
              openImageUploadModal(layerManager);
            } else if (item.action === "add-text") {
              textHandler.createNewTextLayer();
            } else if (item.action === "add-date") {
              const now = new Date().toLocaleDateString();
              layerManager.createTextLayer(now, 100, 100);
            }
          },
        });
        return;
      }

      if (action === "save") {
        showDropdown(btn as HTMLElement, {
          items: [
            {
              label: "Save as Project (.trp)",
              action: "save-project",
              icon: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>',
            },
            {
              label: "Save as PNG",
              action: "save-png",
              icon: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>',
            },
            {
              label: "Save as JPG",
              action: "save-jpg",
              icon: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>',
            },
          ],
          onItemClick: (item) => {
            if (item.action === "save-project") {
              barActions.saveProject();
            } else if (item.action === "save-png" || item.action === "save-jpg") {
              const mime = item.action === "save-png" ? "image/png" : "image/jpeg";
              const ext = item.action === "save-png" ? "png" : "jpg";
              const dataUrl = canvas.toDataURL(mime);
              const a = document.createElement("a");
              a.href = dataUrl;
              a.download = `pixorig-export-${Date.now()}.${ext}`;
              a.click();
            }
          },
        });
        return;
      }

      if (action === "more") {
        barActions.openMoreMenu(btn as HTMLElement);
        return;
      }
    });
  });

  // Khi image layer được chọn → hiện image-props group
  eventBus.on("image:selected", () => {
    document.querySelectorAll(".sub-group").forEach((g) => g.classList.add("hidden"));
    // Chuyển sidebar active sang image
    document.querySelectorAll(".sidebar-section").forEach((s) => s.classList.remove("active"));
    const imgSection = document.querySelector('.sidebar-section[data-section="image"]');
    if (imgSection) imgSection.classList.add("active");
    const propsGroup = document.querySelector('.sub-group[data-section="image-props"]');
    if (propsGroup) propsGroup.classList.remove("hidden");
  });

  // Khi image layer bị deselect → quay về image group với 2 nút
  eventBus.on("image:deselected", () => {
    const propsGroup = document.querySelector('.sub-group[data-section="image-props"]');
    if (propsGroup) propsGroup.classList.add("hidden");
    const imgGroup = document.querySelector('.sub-group[data-section="image"]');
    if (imgGroup) imgGroup.classList.remove("hidden");
  });

  // Sidebar navigation
  document.querySelectorAll(".sidebar-section").forEach((sec) => {
    sec.addEventListener("click", () => {
      document.querySelectorAll(".sidebar-section").forEach((s) => s.classList.remove("active"));
      sec.classList.add("active");
      const sectionName = sec.getAttribute("data-section");

      document.querySelectorAll(".sub-group").forEach((g) => g.classList.add("hidden"));
      const targetGroup = document.querySelector(`.sub-group[data-section="${sectionName}"]`);
      if (targetGroup) {
        targetGroup.classList.remove("hidden");
      }

      if (sectionName === "setting") {
        barActions.openSettingsModal();
      }
    });
  });

  // Background sub-items click (vd: Crop, Background color)
  document.addEventListener("click", (e) => {
    const subItem = (e.target as HTMLElement).closest("[data-sub]");
    if (!subItem) return;

    const subType = subItem.getAttribute("data-sub");
    if (subType === "bg-crop") {
      const bgLayer = layerManager.getBackgroundLayer();
      openCropPanel({
        layerManager,
        sourceImage: bgLayer.image || null,
      } as CropPanelOptions);
    } else if (subType === "bg-color") {
      const subSidebar = document.getElementById("sub-sidebar");
      const bgLayer = layerManager.getBackgroundLayer();
      if (subSidebar) {
        if (!subSidebar.querySelector(".color-panel")) {
          subSidebar.dataset._savedInner = subSidebar.innerHTML;
        }
        mountColorPanel(subSidebar, {
          layerManager,
          targetLayer: bgLayer,
        }, () => {
          if (subSidebar.dataset._savedInner) {
            subSidebar.innerHTML = subSidebar.dataset._savedInner;
            delete subSidebar.dataset._savedInner;
            eventBus.emit("subsidebar:restored");
          }
        });
      }
    } else if (subType === "bg-from-camera") {
      openCameraModal({ layerManager });
    } else if (subType === "bg-from-upload") {
      openUploadModal({ layerManager });
    } else if (subType === "bg-size") {
      mountSizePanel();
    } else if (subType === "bg-transparent") {
      openTransparent(layerManager);
    } else if (subType === "img-cutout") {
      const imgGroup = document.querySelector('.sub-group[data-section="image"]') as HTMLElement;
      if (imgGroup) {
        if (
          !imgGroup.querySelector(".cutout-panel") &&
          !imgGroup.querySelector(".preact-cutout-panel-wrapper")
        ) {
          imgGroup.dataset._savedInner = imgGroup.innerHTML;
        }
        mountCutoutPanel(imgGroup, { layerManager }, () => {
          if (imgGroup.dataset._savedInner) {
            imgGroup.innerHTML = imgGroup.dataset._savedInner;
            delete imgGroup.dataset._savedInner;
          }
        });
      }
    } else if (subType === "img-from-upload") {
      openImageUploadModal(layerManager);
    } else if (subType === "img-from-camera") {
      openImageCameraModal(layerManager);
    }
  });

  // Property clicks (Text properties) — xử lý duy nhất trong TextUIController,
  // không đăng ký listener trùng ở đây để tránh panel bị mở 2 lần (2 handlers onclick).

  // Sync selectedLayer của TextTransform khi user chọn layer qua Layer List
  // và xóa snapshot mốc panel (Reset sẽ lấy mốc mới ở lần mở kế tiếp).
  eventBus.on("layer:selected", (layer: Layer) => {
    textTransform.selectedLayer = layer && layer.type === "text" ? layer : null;
    clearAllSnapshotsForLayer(layer.id);
  });

  // Clear snapshot khi đổi nội dung text (mốc cũ không còn đúng)
  eventBus.on("text:content-changed", (payload: { layerId: number }) => {
    clearAllSnapshotsForLayer(payload.layerId);
  });

  // Initialize default canvas (2:1 ratio, 1200x600, Neon gradient: #00f260 -> #0575e6)
  function initDefaultCanvas(): void {
    const W = 1200;
    const H = 600;
    canvas.width = W;
    canvas.height = H;
    canvas.style.display = "block";
    dropzone.classList.add("hidden");

    layerManager.resizeAllLayers(W, H);

    // Default neon gradient: #00f260 -> #0575e6 on Background layer
    const bgLayer = layerManager.getBackgroundLayer();
    const bgGrad = bgLayer.ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, "#00f260");
    bgGrad.addColorStop(1, "#0575e6");
    bgLayer.ctx.fillStyle = bgGrad;
    bgLayer.ctx.fillRect(0, 0, W, H);

    ColorService.lastBackground = {
      kind: "preset",
      colors: ["#00f260", "#0575e6"],
      angleDeg: 135,
    };

    const bgImg = new Image();
    bgImg.onload = () => {
      bgLayer.image = bgImg;
    };
    bgImg.src = bgLayer.canvas.toDataURL();

    // Open Layer Sidebar and activate default Layer button
    const layerBtn = document.querySelector('.top-btn[data-action="layer"]');
    const layerSidebar = document.getElementById("layer-sidebar");
    const body = document.getElementById("body");
    if (layerBtn) layerBtn.classList.add("active");
    if (layerSidebar) layerSidebar.classList.remove("hidden");
    if (body) body.classList.add("layer-open");

    // Create initial text layer "Sample Text"
    layerManager.createTextLayer("Sample Text", W / 2, H / 2, 64, "Arial", "#ffffff");
    const sampleLayer = layerManager.getActiveLayer();
    if (sampleLayer && sampleLayer.type === "text") {
      sampleLayer.textAlign = "center";
      sampleLayer.drawText("Sample Text", W / 2, H / 2);
    }

    layerManager.render();
    eventBus.emit("layer:changed", layerManager.getLayersList());
  }

  initDefaultCanvas();
}
