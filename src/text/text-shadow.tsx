import { h } from "../ui/jsx";
import { PanelHeader } from "../ui/PanelHeader";
import { SliderControl } from "../ui/SliderControl";
import { LayerManager, Layer } from "../core/layer";
import { TextTransform } from "./text-transform";
import { ColorModule } from "../modules/color";
import { captureSnapshot, getSnapshot } from "../core/panel-state-store";

export class TextShadowModule {
  private layerManager: LayerManager;
  private textTransform: TextTransform;

  constructor(layerManager: LayerManager, textTransform: TextTransform) {
    this.layerManager = layerManager;
    this.textTransform = textTransform;
  }

  private getTargetLayer(): Layer | null {
    let layer = this.textTransform.selectedLayer;
    if (!layer || layer.id === 0) {
      const active = this.layerManager.getActiveLayer();
      if (active && active.id !== 0) layer = active;
    }
    return layer?.type === "text" ? layer : null;
  }

  private redrawAndSync(layer: Layer): void {
    this.textTransform.redrawTextLayer(layer);
    this.layerManager.render();
    if (this.textTransform.selectedLayer === layer) {
      this.textTransform.drawSelectionOverlay(layer);
    }
  }

  open(containerGroup: HTMLElement, opts: { captureSnapshotValues?: boolean } = {}): void {
    if (!containerGroup) return;

    if (!containerGroup.querySelector(".shadow-panel")) {
      containerGroup.dataset._savedInner = containerGroup.innerHTML;
    }

    const layer = this.getTargetLayer();

    // Ghi mốc THAM SỐ LÚC MỞ PANEL (giống Item Background): opacity, blur,
    // offset X/Y và Outer glow (0/1). Reset phục hồi các giá trị này,
    // KHÔNG tắt hiệu ứng và KHÔNG đụng màu (màu có nút xóa riêng).
    // Chỉ ghi khi mở TỪ MENU — re-render nội bộ (toggle glow, sau Reset)
    // KHÔNG được ghi đè mốc, nếu không Reset sẽ không về đúng mốc ban đầu.
    if (layer && opts.captureSnapshotValues !== false) {
      captureSnapshot("shadow", layer.id, {
        shadowOpacity: layer.shadowOpacity ?? 0.5,
        shadowBlur: layer.shadowBlur ?? 4,
        shadowOffsetX: layer.shadowOffsetX ?? 0,
        shadowOffsetY: layer.shadowOffsetY ?? 4,
        shadowOuterGlow: layer.shadowOuterGlow ? 1 : 0,
      });
    }

    const panelEl = (
      <div
        class="shadow-panel"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          userSelect: "none",
          padding: "12px 8px",
        }}
      ></div>
    ) as HTMLElement;

    // Back button
    // Reset = phục hồi THAM SỐ về mốc lúc mở panel gần nhất (giống Size/Padding):
    // opacity, blur, offset X/Y và công tắc Outer glow (0/1).
    // Không tắt hiệu ứng, không đụng màu — xóa shadow dùng nút xóa riêng.
    const backBtn = PanelHeader({
      title: "Shadow",
      onBack: () => this.close(containerGroup),
      onReset: () => {
        const l = this.getTargetLayer();
        if (l) {
          const snap = getSnapshot("shadow", l.id);
          l.shadowOpacity = snap ? Number(snap.shadowOpacity) : 0.5;
          l.shadowBlur = snap ? Number(snap.shadowBlur) : 4;
          l.shadowOffsetX = snap ? Number(snap.shadowOffsetX) : 0;
          l.shadowOffsetY = snap ? Number(snap.shadowOffsetY) : 4;
          l.shadowOuterGlow = snap ? Number(snap.shadowOuterGlow) === 1 : false;
          this.redrawAndSync(l);
          // Re-render để slider + công tắc Outer glow hiển thị lại giá trị đã reset
          // KHÔNG ghi lại mốc khi re-render
          this.open(containerGroup, { captureSnapshotValues: false });
        }
      },
    });
    panelEl.appendChild(backBtn);

    // Color row: [Select Color][Xóa]
    const hasColor = !!layer?.shadowEnabled;
    const selectColorBtn = (
      <button
        type="button"
        style={{
          flex: "1",
          background: "#2a2a2a",
          border: "1px solid #444",
          borderRadius: "4px",
          color: "#fff",
          padding: "6px 10px",
          cursor: "pointer",
          fontSize: "12px",
        }}
        onClick={() => {
          containerGroup.dataset._savedInner_shadow = containerGroup.innerHTML;
          ColorModule.open(containerGroup, {
            layerManager: this.layerManager,
            onColorChange: (color) => {
              const l = this.getTargetLayer();
              if (!l) return;
              if (typeof color === "string") {
                l.shadowColor = color;
              } else if (typeof color === "object" && color !== null) {
                const fill = color as any;
                if (fill.kind === "solid") {
                  l.shadowColor = fill.hex;
                } else {
                  // Giữ nguyên gradient/preset: renderer tô silhouette
                  // shadow bằng gradient (canvas shadowColor chỉ nhận string)
                  l.shadowColor = fill;
                }
              }
              l.shadowEnabled = true;
              this.redrawAndSync(l);
            },
            onClose: () => {
              this.open(containerGroup);
            },
          });
        }}
      >
        Select Color
      </button>
    );

    const deleteBtn = (
      <button
        type="button"
        style={{
          background: "#2a2a2a",
          border: "1px solid #444",
          borderRadius: "4px",
          color: hasColor ? "#ff4d4d" : "#666",
          padding: "6px 10px",
          cursor: hasColor ? "pointer" : "not-allowed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        disabled={!hasColor}
        onClick={() => {
          const l = this.getTargetLayer();
          if (l) {
            l.shadowEnabled = false;
            this.redrawAndSync(l);
            this.open(containerGroup);
          }
        }}
      >
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path
            fill="currentColor"
            d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
          />
        </svg>
      </button>
    );

    const colorRow = (
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {selectColorBtn}
        {deleteBtn}
      </div>
    ) as HTMLElement;
    panelEl.appendChild(colorRow);

    // Opacity slider
    const opacitySlider = SliderControl({
      label: "Opacity",
      value: Math.round((layer?.shadowOpacity ?? 0.5) * 100),
      min: 0,
      max: 100,
      sliderMin: 0,
      sliderMax: 100,
      btnStep: 1,
      onChange: (val) => {
        const l = this.getTargetLayer();
        if (!l) return;
        l.shadowOpacity = val / 100;
        this.redrawAndSync(l);
      },
    });
    panelEl.appendChild(opacitySlider);

    // Blur radius slider
    const blurSlider = SliderControl({
      label: "Blur radius",
      value: layer?.shadowBlur ?? 4,
      min: 0,
      max: 50,
      sliderMin: 0,
      sliderMax: 50,
      btnStep: 1,
      onChange: (val) => {
        const l = this.getTargetLayer();
        if (!l) return;
        l.shadowBlur = Math.round(val);
        this.redrawAndSync(l);
      },
    });
    panelEl.appendChild(blurSlider);

    // Outer glow toggle row
    const outerGlowEnabled = layer?.shadowOuterGlow ?? false;
    const toggleId = "shadow-outer-glow-toggle";
    const outerGlowRow = (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 0",
        }}
      >
        <span style={{ fontSize: "12px", color: "#ccc" }}>Outer glow</span>
        <label
          style={{
            position: "relative",
            display: "inline-block",
            width: "36px",
            height: "20px",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            id={toggleId}
            checked={outerGlowEnabled}
            style={{ opacity: "0", width: "0", height: "0", position: "absolute" }}
            onChange={(e: Event) => {
              const l = this.getTargetLayer();
              if (!l) return;
              l.shadowOuterGlow = (e.target as HTMLInputElement).checked;
              this.redrawAndSync(l);
            }}
          />
          <span
            style={{
              position: "absolute",
              top: "0",
              left: "0",
              right: "0",
              bottom: "0",
              background: outerGlowEnabled ? "#4f8ef7" : "#444",
              borderRadius: "20px",
              transition: "background 0.2s",
            }}
          ></span>
          <span
            style={{
              position: "absolute",
              height: "14px",
              width: "14px",
              left: outerGlowEnabled ? "19px" : "3px",
              bottom: "3px",
              background: "#fff",
              borderRadius: "50%",
              transition: "left 0.2s",
            }}
          ></span>
        </label>
      </div>
    ) as HTMLElement;

    // Make toggle actually reactive on click
    const checkboxEl = outerGlowRow.querySelector("input[type='checkbox']") as HTMLInputElement | null;
    if (checkboxEl) {
      checkboxEl.addEventListener("change", () => {
        const l = this.getTargetLayer();
        if (!l) return;
        l.shadowOuterGlow = checkboxEl.checked;
        this.redrawAndSync(l);
        // Re-open để cập nhật thumb position — KHÔNG ghi lại mốc tham số
        this.open(containerGroup, { captureSnapshotValues: false });
      });
    }
    panelEl.appendChild(outerGlowRow);

    // Offset X slider
    const offsetXSlider = SliderControl({
      label: "Offset X",
      value: layer?.shadowOffsetX ?? 0,
      min: -100,
      max: 100,
      sliderMin: -100,
      sliderMax: 100,
      btnStep: 1,
      onChange: (val) => {
        const l = this.getTargetLayer();
        if (!l) return;
        l.shadowOffsetX = Math.round(val);
        this.redrawAndSync(l);
      },
    });
    panelEl.appendChild(offsetXSlider);

    // Offset Y slider
    const offsetYSlider = SliderControl({
      label: "Offset Y",
      value: layer?.shadowOffsetY ?? 4,
      min: -100,
      max: 100,
      sliderMin: -100,
      sliderMax: 100,
      btnStep: 1,
      onChange: (val) => {
        const l = this.getTargetLayer();
        if (!l) return;
        l.shadowOffsetY = Math.round(val);
        this.redrawAndSync(l);
      },
    });
    panelEl.appendChild(offsetYSlider);

    containerGroup.innerHTML = "";
    containerGroup.appendChild(panelEl);
  }

  close(containerGroup: HTMLElement): void {
    if (!containerGroup) return;
    if (containerGroup.dataset._savedInner) {
      containerGroup.innerHTML = containerGroup.dataset._savedInner;
      delete containerGroup.dataset._savedInner;
    }
  }
}
