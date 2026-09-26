import { LayerManager, Layer } from "./core/layer";
import { TextTransform } from "./text/text-transform";
import { TextHandler } from "./text/text";
import { createLayerListPanel } from "./ui/LayerList";
import { RotateModule } from "./modules/rotate";
import { OpacityModule } from "./modules/opacity";
import { RelativePositionModule } from "./modules/relative-position";
import { ColorModule } from "./modules/color";
import { CropModule } from "./modules/crop";
import { CurveModule } from "./modules/curve";
import { TextureModule } from "./modules/texture";
import { GradientModule } from "./modules/gradient";
import { BackgroundSubpanel } from "./modules/background-subpanel";
import { CutoutModule } from "./modules/cutout";
import { BarActions } from "./core/bar-actions";
import { eventBus } from "./core/event-bus";
import { showDropdown } from "./ui/Popup";

console.log("[Pixorig] Initialized full app with Vite + TS/TSX");

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const dropzone = document.getElementById("dropzone") as HTMLElement;

if (canvas) {
  const layerManager = new LayerManager(canvas);
  const textTransform = new TextTransform(canvas, layerManager);
  const textHandler = new TextHandler(layerManager, textTransform);

  const curveModule = new CurveModule(layerManager, textTransform);
  const textureModule = new TextureModule(layerManager, textTransform);
  const barActions = new BarActions(layerManager);
  const backgroundSubpanel = new BackgroundSubpanel({ layerManager });

  // Gradient custom popup listener
  eventBus.on("gradient:open-custom", (payload?: { targetLayer?: Layer; onApply?: (data: any) => void }) => {
    GradientModule.open({
      layerManager,
      textTransform,
      targetLayer: payload?.targetLayer,
      onApply: payload?.onApply,
    });
  });

  // Setup Layer Sidebar (TSX Real DOM)
  const layerListContainer = document.getElementById("layer-list");
  if (layerListContainer) {
    createLayerListPanel({
      container: layerListContainer,
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
            if (item.action === "add-text") {
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
      CropModule.open({
        layerManager,
        sourceImage: bgLayer.image || null,
      });
    } else if (subType === "bg-color") {
      const subSidebar = document.getElementById("sub-sidebar");
      const bgLayer = layerManager.getBackgroundLayer();
      ColorModule.open(subSidebar, {
        layerManager,
        targetLayer: bgLayer,
      });
    } else if (subType === "bg-from-camera") {
      backgroundSubpanel.openCamera();
    } else if (subType === "bg-from-upload") {
      backgroundSubpanel.openUpload();
    } else if (subType === "bg-size") {
      backgroundSubpanel.openSizePanel();
    } else if (subType === "bg-transparent") {
      backgroundSubpanel.openTransparent();
    } else if (subType === "img-cutout") {
      const imgGroup = document.querySelector('.sub-group[data-section="image"]') as HTMLElement;
      if (imgGroup) {
        CutoutModule.open(imgGroup, { layerManager });
      }
    }
  });

  // Property clicks on sub-items (Text properties)
  document.addEventListener("click", (e) => {
    const propItem = (e.target as HTMLElement).closest("[data-prop]");
    if (!propItem) return;

    const propType = propItem.getAttribute("data-prop");
    const container = document.querySelector('.sub-group[data-section="text-props"]') as HTMLElement;
    if (!container) return;

    if (propType === "rotate") {
      RotateModule.open(container, { layerManager });
    } else if (propType === "opacity") {
      OpacityModule.open(container, { layerManager });
    } else if (propType === "relative-position") {
      RelativePositionModule.open(container, { layerManager });
    } else if (propType === "color") {
      ColorModule.open(container, { layerManager });
    } else if (propType === "curve") {
      curveModule.open(container);
    } else if (propType === "texture") {
      textureModule.open(container);
    }
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

    ColorModule.lastBackground = {
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

  const announcement = document.getElementById("rename-announcement-modal");
  const closeAnnouncement = () => {
    if (announcement) announcement.style.display = "none";
  };

  document
    .getElementById("close-announcement-btn")
    ?.addEventListener("click", closeAnnouncement);
  document
    .getElementById("dismiss-announcement-btn")
    ?.addEventListener("click", closeAnnouncement);
  announcement?.addEventListener("click", (event) => {
    if (event.target === announcement) closeAnnouncement();
  });
}
