/** @jsx h */
import { h, render } from "preact";
import { useState } from "preact/hooks";
import {
  ColorService,
  MONOCHROME_COLORS,
  type ColorModuleOptions,
  type PresetGradientItem,
  type BackgroundFill,
} from "../../core/layer/color-service";
import { PreactPanelHeader } from "../../ui/base/panel-header";
import { PreactTabBar } from "../../ui/base/tab-bar";
import { eventBus } from "../../core/event-bus";

interface ColorPanelProps {
  options: ColorModuleOptions;
  onBack: () => void;
}

function ColorPanel({ options, onBack }: ColorPanelProps) {
  const [tab, setTab] = useState<"monochrome" | "gradient">("monochrome");

  const handleColorClick = (hex: string) => {
    ColorService.applyColor(hex, options);
  };

  const handleCustomColor = () => {
    const input = document.createElement("input");
    input.type = "color";
    input.value = "#ffffff";
    input.addEventListener("input", () => {
      ColorService.applyColor(input.value, options);
    });
    input.click();
  };

  const handleGradientClick = (preset: PresetGradientItem) => {
    ColorService.applyGradient(preset, options);
  };

  const handleCustomGradient = () => {
    eventBus.emit("gradient:open-custom", {
      targetLayer: options.targetLayer,
      onApply: options.onColorChange
        ? (gradData: any) => {
            if (options.onColorChange) {
              options.onColorChange({ kind: "custom", data: gradData } as BackgroundFill);
            }
          }
        : undefined,
    });
  };

  const allPresets = ColorService.getAllPresets();

  const getPresetBgStyle = (g: PresetGradientItem): string => {
    if (g.isCustom && g.data) {
      if (g.data.type === "linear") {
        const dx = g.data.endPoint.x - g.data.startPoint.x;
        const dy = g.data.endPoint.y - g.data.startPoint.y;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const cssAngle = angle + 90;
        const stopStrs = g.data.stops
          .map((s: any) => `${s.color} ${Math.round(s.offset * 100)}%`)
          .join(", ");
        return `linear-gradient(${Math.round(cssAngle)}deg, ${stopStrs})`;
      } else if (Array.isArray(g.data.meshPoints)) {
        const bgImages = g.data.meshPoints.map((p: any) => {
          const x = Math.round(p.x * 100);
          const y = Math.round(p.y * 100);
          const r = Math.round((p.radius !== undefined ? p.radius : 1.0) * 80);
          return `radial-gradient(circle at ${x}% ${y}%, ${p.color} 0%, transparent ${r}%)`;
        });
        return bgImages.join(", ");
      }
    }
    const dir = g.colors.length > 2 ? "135deg" : "to right";
    return `linear-gradient(${dir}, ${g.colors.join(", ")})`;
  };

  return (
    <div
      class="color-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        userSelect: "none",
        padding: "12px 8px",
      }}
    >
      <PreactPanelHeader
        title="Color"
        onBack={onBack}
        onReset={() => {}}
      />
      <PreactTabBar
        tabs={[
          { id: "monochrome", label: "Monochrome" },
          { id: "gradient", label: "Gradient" },
        ]}
        active={tab}
        onChange={(id) => setTab(id as "monochrome" | "gradient")}
      />

      {tab === "monochrome" ? (
        <div class="color-monochrome-wrap">
          <div style={{ marginTop: "4px", fontSize: "11px", color: "#999", marginBottom: "6px" }}>
            Custom Color
          </div>
          <div class="color-grid">
            <button
              type="button"
              class="color-swatch color-plus"
              title="Custom color picker"
              onClick={handleCustomColor}
            >
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
            </button>
            {MONOCHROME_COLORS.map((c) => (
              <button
                type="button"
                class="color-swatch"
                title={c.name}
                style={{
                  background: c.hex,
                  border: ColorService.isLightColor(c.hex) ? "1px solid #666" : "none",
                }}
                onClick={() => handleColorClick(c.hex)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div class="color-gradient-wrap">
          <div style={{ fontSize: "11px", color: "#999", marginBottom: "6px" }}>
            Custom Gradient
          </div>
          <button
            type="button"
            class="gradient-preset"
            title="Create custom gradient"
            onClick={handleCustomGradient}
          >
            <span
              class="gradient-plus-icon"
              style={{
                width: "36px",
                height: "24px",
                borderRadius: "4px",
                border: "1px solid #555",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#333",
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
            </span>
            <span class="gradient-name" style={{ color: "#999" }}>
              Custom...
            </span>
          </button>
          <div style={{ marginTop: "8px", fontSize: "11px", color: "#999", marginBottom: "6px" }}>
            Presets
          </div>
          <div class="gradient-grid">
            {allPresets.map((g) => (
              <button
                type="button"
                class="gradient-preset"
                title={g.name}
                onClick={() => handleGradientClick(g)}
              >
                <span
                  class="gradient-preview"
                  style={{ background: getPresetBgStyle(g), backgroundColor: "#000" }}
                />
                <span class="gradient-name">{g.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Mount ColorPanel into container
 */
export function mountColorPanel(
  container: HTMLElement,
  options: ColorModuleOptions = {},
  onBack: () => void
): () => void {
  const preactRoot = document.createElement("div");
  preactRoot.className = "preact-color-panel-wrapper";
  container.innerHTML = "";
  container.appendChild(preactRoot);

  render(
    <ColorPanel
      options={options}
      onBack={() => {
        render(null, preactRoot);
        if (options.onClose) options.onClose();
        onBack();
      }}
    />,
    preactRoot
  );

  return () => {
    render(null, preactRoot);
  };
}
