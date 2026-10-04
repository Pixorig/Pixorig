/** @jsx h */
import { h, render } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import {
  TextFontService,
  type TextFontContext,
} from "../../core/text/text-font-service";
import { PreactPanelHeader } from "../../ui/base/panel-header";
import type { Layer } from "../../core/layer";

export interface TextFontPanelProps {
  initialFont: string;
  context: TextFontContext;
  onBack: () => void;
}

export function TextFontPanel({
  initialFont,
  context,
  onBack,
}: TextFontPanelProps) {
  const [currentFont, setCurrentFont] = useState<string>(initialFont);
  const [filterText, setFilterText] = useState<string>("");
  const [fonts, setFonts] = useState<string[]>(TextFontService.getAllFonts());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    TextFontService.initCustomFonts().then(() => {
      setFonts(TextFontService.getAllFonts());
    });
  }, []);

  const handleSelectFont = (fontName: string) => {
    setCurrentFont(fontName);
    TextFontService.applyFontFamily(fontName, context);
  };

  const handleFileChange = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const res = await TextFontService.uploadFontFile(file);
    input.value = ""; // Cho phép chọn lại cùng 1 file
    if (!res.success) {
      alert(res.error || "Lỗi tải font");
      return;
    }

    setFonts(TextFontService.getAllFonts());
    if (res.fontName) {
      handleSelectFont(res.fontName);
    }
  };

  const filteredFonts = fonts.filter((f) =>
    f.toLowerCase().includes(filterText.toLowerCase().trim())
  );

  return (
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
    >
      <PreactPanelHeader
        title="Font"
        onBack={onBack}
        onReset={() => {}}
      />

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".ttf,.otf,.woff,.woff2"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Upload button */}
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
        onClick={() => fileInputRef.current?.click()}
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Upload Font (.ttf/.otf/.woff/.woff2)
      </button>

      {/* Search Input */}
      <input
        type="text"
        placeholder="Tìm kiếm font..."
        value={filterText}
        onInput={(e) => setFilterText((e.target as HTMLInputElement).value)}
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

      {/* Font list */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          overflowY: "auto",
          flex: "1",
          maxHeight: "320px",
        }}
      >
        {filteredFonts.map((fontName) => {
          const isActive = fontName === currentFont;
          return (
            <button
              key={fontName}
              type="button"
              class={isActive ? "active" : ""}
              style={{
                background: isActive ? "#00f260" : "#2a2a2a",
                border: "1px solid " + (isActive ? "#00f260" : "#444"),
                borderRadius: "6px",
                color: isActive ? "#000" : "#fff",
                cursor: "pointer",
                padding: "8px 12px",
                textAlign: "left",
                fontSize: "14px",
                fontFamily: fontName,
                transition: "background 0.15s",
              }}
              onClick={() => handleSelectFont(fontName)}
            >
              {fontName}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Mount TextFontPanel into container
 */
export function mountTextFontPanel(
  container: HTMLElement,
  targetLayer: Layer | null | undefined,
  context: TextFontContext,
  onBack: () => void
): () => void {
  const initialFont = TextFontService.getCurrentFontFamily(targetLayer);

  const preactRoot = document.createElement("div");
  preactRoot.className = "preact-font-panel-wrapper";
  container.innerHTML = "";
  container.appendChild(preactRoot);

  render(
    <TextFontPanel
      initialFont={initialFont}
      context={context}
      onBack={() => {
        render(null, preactRoot);
        onBack();
      }}
    />,
    preactRoot
  );

  return () => {
    render(null, preactRoot);
  };
}
