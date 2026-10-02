import { h } from "../ui/jsx";
import { PanelHeader } from "../ui/PanelHeader";
import { SliderControl } from "../ui/SliderControl";
import { SectionHeader } from "../ui/SectionHeader";
import { LayerManager, Layer } from "../core/layer";
import { TextTransform } from "./text-transform";
import { captureSnapshot, getSnapshot } from "../core/panel-state-store";

export class TextEmbossModule {
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

  open(containerGroup: HTMLElement, opts: { autoEnable?: boolean } = {}): void {
    if (!containerGroup) return;

    if (!containerGroup.querySelector(".emboss-panel")) {
      containerGroup.dataset._savedInner = containerGroup.innerHTML;
    }

    const layer = this.getTargetLayer();
    // Mở panel từ menu = bật hiệu ứng luôn (UX nhanh).
    // Reset gọi renderUI() trực tiếp (autoEnable: false) nên không bật lại.
    const autoEnable = opts.autoEnable !== false;
    if (layer && autoEnable && !layer.embossEnabled) {
      layer.embossEnabled = true;
    }

    // Ghi mốc THAM SỐ LÚC MỞ PANEL (giống Size/Padding): light angle,
    // intensity, ambient, hardness, bevel. Reset phục hồi các giá trị này
    // — KHÔNG tắt hiệu ứng. Chỉ ghi khi mở TỪ MENU; re-render nội bộ
    // (sau Reset) không được ghi đè mốc.
    if (layer && opts.autoEnable !== false) {
      captureSnapshot("emboss", layer.id, {
        embossAngle: layer.embossAngle ?? 90,
        embossIntensity: layer.embossIntensity ?? 50,
        embossAmbient: layer.embossAmbient ?? 50,
        embossHardness: layer.embossHardness ?? 20,
        embossBevel: layer.embossBevel ?? 3,
      });
    }

    const panelEl = (
      <div
        class="emboss-panel"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          userSelect: "none",
          padding: "12px 8px",
        }}
      ></div>
    ) as HTMLElement;

    // Header bar: Back + Toggle button
    // Reset = phục hồi THAM SỐ về mốc lúc mở panel gần nhất (giống Size/Padding):
    // light angle, intensity, ambient, hardness, bevel. Không tắt hiệu ứng —
    // tắt Emboss sẽ thêm công tắc Enabled riêng (việc khác).
    const headerRow = PanelHeader({
      title: "Emboss",
      onBack: () => this.close(containerGroup),
      onReset: () => {
        const l = this.getTargetLayer();
        if (l) {
          const snap = getSnapshot("emboss", l.id);
          l.embossAngle = snap ? Number(snap.embossAngle) : 90;
          l.embossIntensity = snap ? Number(snap.embossIntensity) : 50;
          l.embossAmbient = snap ? Number(snap.embossAmbient) : 50;
          l.embossHardness = snap ? Number(snap.embossHardness) : 20;
          l.embossBevel = snap ? Number(snap.embossBevel) : 3;
          this.redrawAndSync(l);
          // Re-render panel (knob + slider hiển thị lại giá trị mốc),
          // KHÔNG bật lại hiệu ứng và KHÔNG ghi đè mốc
          this.open(containerGroup, { autoEnable: false });
        }
      },
    }) as HTMLElement;
    panelEl.appendChild(headerRow);

    // Light angle UI
    const angleContainer = document.createElement("div");
    angleContainer.style.display = "flex";
    angleContainer.style.flexDirection = "column";
    angleContainer.style.alignItems = "center";
    angleContainer.style.gap = "8px";
    angleContainer.style.padding = "4px 0";

    const angleTitle = document.createElement("div");
    angleTitle.style.width = "100%";
    angleTitle.style.display = "flex";
    angleTitle.style.justifyContent = "space-between";
    angleTitle.style.fontSize = "12px";
    angleTitle.style.color = "#ccc";

    let currentAngle = layer?.embossAngle ?? 90;

    const angleLabel = document.createElement("span");
    angleLabel.textContent = "Light angle";
    const angleDegree = document.createElement("span");
    angleDegree.textContent = `${currentAngle}°`;
    angleTitle.appendChild(angleLabel);
    angleTitle.appendChild(angleDegree);
    angleContainer.appendChild(angleTitle);

    // Knob container
    const knobRadius = 45;
    const knobSize = knobRadius * 2;
    const knobEl = document.createElement("div");
    knobEl.style.width = `${knobSize}px`;
    knobEl.style.height = `${knobSize}px`;
    knobEl.style.borderRadius = "50%";
    knobEl.style.border = "2px solid #444";
    knobEl.style.backgroundColor = "#222";
    knobEl.style.position = "relative";
    knobEl.style.cursor = "grab";
    knobEl.style.display = "flex";
    knobEl.style.alignItems = "center";
    knobEl.style.justifyContent = "center";

    // Center display of degree
    const centerDisplay = document.createElement("span");
    centerDisplay.style.fontSize = "12px";
    centerDisplay.style.fontWeight = "bold";
    centerDisplay.style.color = "#fff";
    centerDisplay.style.userSelect = "none";
    centerDisplay.textContent = `${currentAngle}°`;
    knobEl.appendChild(centerDisplay);

    // Pointer dot/line
    const pointerDot = document.createElement("div");
    pointerDot.style.position = "absolute";
    pointerDot.style.width = "8px";
    pointerDot.style.height = "8px";
    pointerDot.style.borderRadius = "50%";
    pointerDot.style.backgroundColor = "#00f260";
    pointerDot.style.pointerEvents = "none";
    knobEl.appendChild(pointerDot);

    function updateKnobUI(deg: number): void {
      const rad = ((deg - 90) * Math.PI) / 180;
      const dotDist = knobRadius - 10;
      const x = knobRadius + dotDist * Math.cos(rad) - 4;
      const y = knobRadius + dotDist * Math.sin(rad) - 4;
      pointerDot.style.left = `${x}px`;
      pointerDot.style.top = `${y}px`;
      centerDisplay.textContent = `${deg}°`;
      angleDegree.textContent = `${deg}°`;
    }

    updateKnobUI(currentAngle);

    // Drag interaction for knob
    let isDragging = false;
    const handleKnobMove = (clientX: number, clientY: number) => {
      const rect = knobEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      let deg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI) + 90;
      if (deg < 0) deg += 360;
      deg = deg % 360;
      currentAngle = deg;
      updateKnobUI(deg);
      numInput.value = String(deg);
      const l = this.getTargetLayer();
      if (l) {
        l.embossAngle = deg;
        this.redrawAndSync(l);
      }
    };

    knobEl.addEventListener("mousedown", (e) => {
      isDragging = true;
      knobEl.style.cursor = "grabbing";
      handleKnobMove(e.clientX, e.clientY);
      const onMouseMove = (ev: MouseEvent) => {
        if (!isDragging) return;
        handleKnobMove(ev.clientX, ev.clientY);
      };
      const onMouseUp = () => {
        isDragging = false;
        knobEl.style.cursor = "grab";
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    });

    angleContainer.appendChild(knobEl);

    // Number input box for angle
    const numInput = document.createElement("input");
    numInput.type = "number";
    numInput.min = "0";
    numInput.max = "360";
    numInput.value = String(currentAngle);
    numInput.style.width = "70px";
    numInput.style.padding = "4px 8px";
    numInput.style.fontSize = "12px";
    numInput.style.textAlign = "center";
    numInput.style.backgroundColor = "#2a2a2a";
    numInput.style.border = "1px solid #444";
    numInput.style.borderRadius = "4px";
    numInput.style.color = "#fff";
    numInput.addEventListener("change", () => {
      let val = parseInt(numInput.value, 10);
      if (isNaN(val)) val = 0;
      val = ((val % 360) + 360) % 360;
      numInput.value = String(val);
      currentAngle = val;
      updateKnobUI(val);
      const l = this.getTargetLayer();
      if (l) {
        l.embossAngle = val;
        this.redrawAndSync(l);
      }
    });
    angleContainer.appendChild(numInput);
    panelEl.appendChild(angleContainer);

    // Advanced Header with Divider
    panelEl.appendChild(SectionHeader({ title: "Advanced" }));

    // Intensity: 0 - 100
    const intensitySlider = SliderControl({
      label: "Intensity",
      value: layer?.embossIntensity ?? 50,
      min: 0,
      max: 100,
      sliderMin: 0,
      sliderMax: 100,
      btnStep: 1,
      onChange: (val) => {
        const l = this.getTargetLayer();
        if (!l) return;
        l.embossIntensity = Math.round(val);
        this.redrawAndSync(l);
      },
    });
    panelEl.appendChild(intensitySlider);

    // Ambient light: 0 - 100
    const ambientSlider = SliderControl({
      label: "Ambient light",
      value: layer?.embossAmbient ?? 50,
      min: 0,
      max: 100,
      sliderMin: 0,
      sliderMax: 100,
      btnStep: 1,
      onChange: (val) => {
        const l = this.getTargetLayer();
        if (!l) return;
        l.embossAmbient = Math.round(val);
        this.redrawAndSync(l);
      },
    });
    panelEl.appendChild(ambientSlider);

    // Specular Hardness: 0 - 100
    const hardnessSlider = SliderControl({
      label: "Specular Hardness",
      value: layer?.embossHardness ?? 20,
      min: 0,
      max: 100,
      sliderMin: 0,
      sliderMax: 100,
      btnStep: 1,
      onChange: (val) => {
        const l = this.getTargetLayer();
        if (!l) return;
        l.embossHardness = Math.round(val);
        this.redrawAndSync(l);
      },
    });
    panelEl.appendChild(hardnessSlider);

    // Bevel: 0 - 100
    const bevelSlider = SliderControl({
      label: "Bevel",
      value: layer?.embossBevel ?? 3,
      min: 0,
      max: 100,
      sliderMin: 0,
      sliderMax: 100,
      btnStep: 1,
      onChange: (val) => {
        const l = this.getTargetLayer();
        if (!l) return;
        l.embossBevel = Math.round(val);
        this.redrawAndSync(l);
      },
    });
    panelEl.appendChild(bevelSlider);

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
