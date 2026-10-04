import type { Layer } from "../layer";

export const SYSTEM_FONTS = [
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

export interface CustomFont {
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

export interface TextFontContext {
  getTargetLayer: () => Layer | null | undefined;
  redrawAndSync: (layer?: Layer | null) => void;
}

export class TextFontService {
  private static customFonts: CustomFont[] = [];
  private static isInitialized = false;

  static sanitizeFontName(raw: string): string {
    return raw.replace(/[^a-zA-Z0-9 _\-]/g, "").trim();
  }

  static async initCustomFonts(): Promise<CustomFont[]> {
    if (this.isInitialized) return this.customFonts;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.customFonts = JSON.parse(raw) as CustomFont[];
      }
    } catch {
      this.customFonts = [];
    }

    for (const cf of this.customFonts) {
      await this.loadFontFromDataUrl(cf.name, cf.dataUrl);
    }

    this.isInitialized = true;
    return this.customFonts;
  }

  static getCustomFonts(): CustomFont[] {
    return this.customFonts;
  }

  static getAllFonts(): string[] {
    return [...SYSTEM_FONTS, ...this.customFonts.map((f) => f.name)];
  }

  private static saveCustomFonts(fonts: CustomFont[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fonts));
    } catch {
      // Quota exceeded
    }
  }

  private static async loadFontFromDataUrl(
    name: string,
    dataUrl: string
  ): Promise<void> {
    try {
      const font = new FontFace(name, `url(${dataUrl})`);
      await font.load();
      document.fonts.add(font);
    } catch {
      // Font load error
    }
  }

  static async uploadFontFile(file: File): Promise<{ success: boolean; fontName?: string; error?: string }> {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return { success: false, error: "Chỉ chấp nhận file .ttf, .otf, .woff, .woff2" };
    }

    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return { success: false, error: "Định dạng file không được hỗ trợ." };
    }

    if (file.size > MAX_FONT_SIZE) {
      return { success: false, error: "Font vượt quá 10MB. Vui lòng chọn file nhỏ hơn." };
    }

    const rawName = file.name.replace(/\.[^.]+$/, "");
    const safeName = this.sanitizeFontName(rawName) || "CustomFont";

    const arrayBuffer = await file.arrayBuffer();
    try {
      const font = new FontFace(safeName, arrayBuffer);
      await font.load();
      document.fonts.add(font);
    } catch {
      return { success: false, error: "Không thể load font. File có thể bị lỗi." };
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const existingIndex = this.customFonts.findIndex((f) => f.name === safeName);
    if (existingIndex >= 0) {
      this.customFonts[existingIndex] = { name: safeName, dataUrl };
    } else {
      this.customFonts.push({ name: safeName, dataUrl });
    }
    this.saveCustomFonts(this.customFonts);

    return { success: true, fontName: safeName };
  }

  static applyFontFamily(
    fontName: string,
    context: TextFontContext
  ): void {
    const target = context.getTargetLayer();
    if (target && target.type === "text") {
      target.fontFamily = fontName;
      context.redrawAndSync(target);
    }
  }

  static getCurrentFontFamily(layer: Layer | null | undefined): string {
    return layer?.fontFamily ?? "Arial";
  }
}
