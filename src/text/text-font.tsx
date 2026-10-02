/**
 * Module Font - chọn font cho text layer
 */
import { h } from "../ui/jsx";
import { PanelHeader } from "../ui/PanelHeader";
import { Layer, LayerManager } from "../core/layer";
import { TextTransform } from "./text-transform";

const SYSTEM_FONTS = [
  "Arial",
  "Georgia",
  "Times New Roman",
  "Verdana",
  "Trebuchet MS",
  "Comic Sans MS",
  "Impact",
  "Courier New",
  "Palatino Linotype",
  "Tahoma",
  "Lucida Console",
  "Garamond",
];

const STORAGE_KEY = "pixorig_custom_fonts";
const MAX_FONT_SIZE = 10 * 1024 * 1024; // 10MB

interface CustomFont {
  name: string;
  dataUrl: string;
}

const ALLOWED_EXTENSIONS = ["ttf", "otf", "woff", "woff2"];
const ALLOWED_MIME_TYPES = [
  "font/ttf",
  "font/otf",
  "font/woff",
  "font/woff2",
  "application/font-woff",
  "application/font-woff2",
  "application/x-font-ttf",
  "application/x-font-otf",
  "application/vnd.ms-fontobject",
];

function sanitizeFontName(raw: string): string {
  // Chỉ cho phép a-zA-Z0-9 space _ -
  return raw.replace(/[^a-zA-Z0-9 _\-]/g, "").trim();
}

function getCustomFonts(): CustomFont[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CustomFont[];
  } catch {
    return [];
  }
}

function saveCustomFonts(fonts: CustomFont[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fonts));
  } catch {
    // quota exceeded — bỏ qua
  }
}

async function loadFontFromDataUrl(name: string, dataUrl: string): Promise<void> {
  try {
    const font = new FontFace(name, `url(${dataUrl})`);
    await font.load();
    document.fonts.add(font);
  } catch {
    // font lỗi — bỏ qua
  }
}

export class TextFontModule {
  private layerManager: LayerManager;
  private textTransform: TextTransform;
  private customFonts: CustomFont[] = [];

  constructor(layerManager: LayerManager, textTransform: TextTransform) {
    this.layerManager = layerManager;
    this.textTransform = textTransform;
    this.initCustomFonts();
  }

  private async initCustomFonts(): Promise<void> {
    const stored = getCustomFonts();
    this.customFonts = stored;
    for (const cf of stored) {
      await loadFontFromDataUrl(cf.name, cf.dataUrl);
    }
  }

  private getTargetLayer(): Layer | null {
    let layer = this.textTransform.selectedLayer;
    if (!layer || layer.id === 0) {
      const active = this.layerManager.getActiveLayer();
      if (active && active.id !== 0) layer = active;
    }
    return layer?.type === "text" ? layer : null;
  }

  private redrawAndSync(layer?: Layer | null): void {
    const target = layer || this.getTargetLayer();
    if (!target) return;
    this.textTransform.redrawTextLayer(target);
    this.layerManager.render();
    if (this.textTransform.selectedLayer === target) {
      this.textTransform.drawSelectionOverlay(target);
    }
  }

  private async handleUpload(file: File, onDone: () => void): Promise<void> {
    // Kiểm tra extension
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      alert("Chỉ chấp nhận file .ttf, .otf, .woff, .woff2");
      return;
    }

    // Kiểm tra MIME type (tolerant)
    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
      alert("Định dạng file không được hỗ trợ.");
      return;
    }

    // Kiểm tra kích thước
    if (file.size > MAX_FONT_SIZE) {
      alert("Font vượt quá 10MB. Vui lòng chọn file nhỏ hơn.");
      return;
    }

    // Sanitize tên font từ tên file (bỏ extension)
    const rawName = file.name.replace(/\.[^.]+$/, "");
    const safeName = sanitizeFontName(rawName) || "CustomFont";

    // Đọc file dưới dạng ArrayBuffer để load FontFace
    const arrayBuffer = await file.arrayBuffer();
    try {
      const font = new FontFace(safeName, arrayBuffer);
      await font.load();
      document.fonts.add(font);
    } catch {
      alert("Không thể load font. File có thể bị lỗi.");
      return;
    }

    // Chuyển sang dataUrl để lưu LocalStorage
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Thêm vào danh sách (tránh trùng tên)
    const existing = this.customFonts.findIndex((f) => f.name === safeName);
    if (existing >= 0) {
      this.customFonts[existing] = { name: safeName, dataUrl };
    } else {
      this.customFonts.push({ name: safeName, dataUrl });
    }
    saveCustomFonts(this.customFonts);

    onDone();
  }

  open(containerGroup: HTMLElement): void {
    if (!containerGroup) return;

    if (!containerGroup.dataset._savedInner) {
      containerGroup.dataset._savedInner = containerGroup.innerHTML;
    }

    const renderUI = () => {
      const layer = this.getTargetLayer();
      const currentFont = layer?.fontFamily ?? "Arial";
      containerGroup.innerHTML = "";

      const panel = (
        <div
          class="font-panel"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            userSelect: "none",
            padding: "8px 4px",
            height: "100%",
          }}
        ></div>
      ) as HTMLElement;

      // 1. Header
      // Font là panel chọn một lần (bấm font = áp dụng ngay) và Reset cũ ép
      // fontFamily = "Arial" cứng — giống lỗi Color, mất font người dùng đang có.
      // Ngoài ra nó còn làm méo fontSize (Math.round). Vì vậy ẩn nút Reset;
      // muốn hoàn tác dùng chọn lại font hoặc Undo trên topbar.
      const headerRow = PanelHeader({
        title: "Font",
        showReset: false,
        onBack: () => this.close(containerGroup),
        onReset: () => {},
      });
      panel.appendChild(headerRow);

      // 2. Nút Upload
      const uploadBtn = (
        <button
          type="button"
          style={{
            background: "#2a2a2a",
            border: "1px solid #555",
            borderRadius: "6px",
            color: "#fff",
            cursor: "pointer",
            padding: "8px 12px",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".ttf,.otf,.woff,.woff2";
            input.onchange = async () => {
              const file = input.files?.[0];
              if (file) {
                await this.handleUpload(file, () => renderUI());
              }
            };
            input.click();
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Upload Font (.ttf/.otf/.woff/.woff2)
        </button>
      ) as HTMLElement;
      panel.appendChild(uploadBtn);

      // 3. Search input
      const searchInput = (
        <input
          type="text"
          placeholder="Tìm kiếm font..."
          style={{
            background: "#1e1e1e",
            border: "1px solid #444",
            borderRadius: "6px",
            color: "#fff",
            padding: "6px 10px",
            fontSize: "13px",
            outline: "none",
            width: "100%",
            boxSizing: "border-box",
          }}
        />
      ) as HTMLInputElement;
      panel.appendChild(searchInput);

      // 4. Danh sách font
      const listContainer = document.createElement("div");
      listContainer.style.cssText =
        "display:flex;flex-direction:column;gap:4px;overflow-y:auto;flex:1;max-height:320px;";
      panel.appendChild(listContainer);

      const allFonts = [
        ...SYSTEM_FONTS,
        ...this.customFonts.map((f) => f.name),
      ];

      const renderList = (filter: string) => {
        listContainer.innerHTML = "";
        const lower = filter.toLowerCase();
        const filtered = allFonts.filter((name) =>
          name.toLowerCase().includes(lower)
        );
        for (const fontName of filtered) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.textContent = fontName;
          const isActive = fontName === currentFont;
          btn.style.cssText = [
            "background:" + (isActive ? "#00f260" : "#2a2a2a"),
            "border:1px solid " + (isActive ? "#00f260" : "#444"),
            "border-radius:6px",
            "color:" + (isActive ? "#000" : "#fff"),
            "cursor:pointer",
            "padding:8px 12px",
            "text-align:left",
            "font-size:14px",
            "font-family:" + fontName,
            "transition:background 0.15s",
          ].join(";");
          if (isActive) btn.className = "active";
          btn.addEventListener("click", () => {
            const target = this.getTargetLayer();
            if (target) {
              target.fontFamily = fontName;
              this.redrawAndSync(target);
            }
            renderUI();
          });
          listContainer.appendChild(btn);
        }
      };

      renderList("");
      searchInput.addEventListener("input", () => {
        renderList(searchInput.value);
      });

      containerGroup.appendChild(panel);
    };

    renderUI();
  }

  close(containerGroup: HTMLElement): void {
    if (!containerGroup) return;
    if (containerGroup.dataset._savedInner) {
      containerGroup.innerHTML = containerGroup.dataset._savedInner;
      delete containerGroup.dataset._savedInner;
    }
  }
}
