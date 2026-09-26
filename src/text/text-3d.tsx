/**
 * Text 3D Module - TSX Real DOM
 * Cung cấp điều khiển UI cho tính năng 3D Text:
 * [Reset]
 * View type: <tab-bar> (Perspective | Oblique)
 * <SectionHeader> (Depth)
 * Depth: <slider-control> (giá trị từ 1 - 100)
 * <tab-bar> (Color | Auto)
 * [Select Color] [Xóa]
 * Darken: <slider-control> (giá trị từ 0% - 100%)
 */

import { h } from "../ui/jsx";
import { LayerManager, Layer } from "../core/layer";
import { TextTransform } from "./text-transform";
import { TabBar } from "../ui/TabBar";
import { SectionHeader } from "../ui/SectionHeader";
import { SliderControl } from "../ui/SliderControl";
import { ColorModule } from "../modules/color";

export class Text3DModule {
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

  private redrawAndSync(layer?: Layer | null): void {
    const target = layer || this.getTargetLayer();
    if (!target) return;
    this.textTransform.redrawTextLayer(target);
    this.layerManager.render();
    if (this.textTransform.selectedLayer === target) {
      this.textTransform.drawSelectionOverlay(target);
    }
  }

  open(containerGroup: HTMLElement): void {
    if (!containerGroup) return;

    if (!containerGroup.querySelector(".text-3d-panel")) {
      containerGroup.dataset._savedInner = containerGroup.innerHTML;
    }

    const renderUI = () => {
      containerGroup.innerHTML = "";
      const layer = this.getTargetLayer();

      const panel = (
        <div
          class="text-3d-panel"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            userSelect: "none",
            padding: "12px 10px",
          }}
        ></div>
      ) as HTMLElement;

      // 1. Header (Back button + Title + Reset button)
      const headerRow = (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            paddingBottom: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              class="btn-back-3d-text"
              style={{
                background: "transparent",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                padding: "4px",
              }}
              title="Quay lại"
              onClick={() => this.close(containerGroup)}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span style={{ fontWeight: "600", fontSize: "14px", color: "#fff" }}>3D Text</span>
          </div>

          <button
            type="button"
            class="btn-reset-3d-text"
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#ddd",
              fontSize: "11px",
              padding: "3px 8px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            onClick={() => {
              const l = this.getTargetLayer();
              if (l) {
                l.text3dEnabled = false;
                l.text3dViewType = "oblique";
                l.text3dDepth = 15;
                l.text3dColorMode = "auto";
                l.text3dColor = "#000000";
                l.text3dDarken = 30;
                l.text3dRotateX = 0;
                l.text3dRotateY = 0;
                l.text3dRotateZ = 0;
                l.text3dLightingEnabled = false;
                l.text3dLightAngle = 90;
                l.text3dLightIntensity = 80;
                l.text3dLightShadow = 40;
                l.text3dLightSpecular = 30;
                this.redrawAndSync(l);
                renderUI();
              }
            }}
          >
            Reset
          </button>
        </div>
      ) as HTMLElement;
      panel.appendChild(headerRow);

      // 2. View type label + TabBar (Perspective | Oblique)
      const viewTypeContainer = (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ fontSize: "12px", color: "#aaa" }}>View type:</span>
        </div>
      ) as HTMLElement;

      const currentViewType = layer?.text3dViewType || "oblique";
      const viewTabBar = TabBar({
        tabs: [
          { id: "perspective", label: "Perspective" },
          { id: "oblique", label: "Oblique" },
        ],
        active: currentViewType,
        onChange: (id) => {
          const l = this.getTargetLayer();
          if (!l) return;
          l.text3dViewType = id as "perspective" | "oblique";
          l.text3dEnabled = true;
          this.redrawAndSync(l);
        },
      });
      viewTypeContainer.appendChild(viewTabBar);
      panel.appendChild(viewTypeContainer);

      // 3. SectionHeader (Depth)
      const depthHeader = SectionHeader({
        title: "Depth",
      });
      panel.appendChild(depthHeader);

      // 4. Slider Depth: 1 - 100
      const currentDepth = layer?.text3dDepth ?? 15;
      const depthSlider = (
        <div class="control-row">
          <SliderControl
            label="Depth"
            value={currentDepth}
            min={1}
            max={100}
            step={1}
            onChange={(val) => {
              const l = this.getTargetLayer();
              if (!l) return;
              l.text3dDepth = Math.round(val);
              l.text3dEnabled = true;
              this.redrawAndSync(l);
            }}
          />
        </div>
      ) as HTMLElement;
      panel.appendChild(depthSlider);

      // 5. TabBar (Color | Auto)
      const currentColorMode = layer?.text3dColorMode || "auto";
      const colorModeTabBar = TabBar({
        tabs: [
          { id: "color", label: "Color" },
          { id: "auto", label: "Auto" },
        ],
        active: currentColorMode,
        onChange: (id) => {
          const l = this.getTargetLayer();
          if (!l) return;
          l.text3dColorMode = id as "color" | "auto";
          l.text3dEnabled = true;
          this.redrawAndSync(l);
          renderUI();
        },
      });
      panel.appendChild(colorModeTabBar);

      // 6. [Select Color] [Xóa] (Chỉ hiển thị / active khi ở tab Color hoặc tùy chỉnh)
      const hasCustomColor = !!(layer?.text3dColorMode === "color" && layer?.text3dColor);
      const isColorTab = (layer?.text3dColorMode ?? "auto") === "color";

      const selectColorBtn = (
        <button
          type="button"
          style={{
            flex: "1",
            background: isColorTab ? "#2a2a2a" : "rgba(255, 255, 255, 0.05)",
            border: "1px solid #444",
            borderRadius: "4px",
            color: isColorTab ? "#fff" : "#666",
            padding: "6px 10px",
            cursor: isColorTab ? "pointer" : "default",
            fontSize: "12px",
          }}
          disabled={!isColorTab}
          onClick={() => {
            if (!isColorTab) return;
            containerGroup.dataset._savedInner_3dText = containerGroup.innerHTML;
            ColorModule.open(containerGroup, {
              layerManager: this.layerManager,
              onColorChange: (color) => {
                const l = this.getTargetLayer();
                if (!l) return;
                if (typeof color === "string") {
                  l.text3dColor = color;
                } else if (typeof color === "object" && color !== null) {
                  const fill = color as any;
                  if (fill.kind === "solid") {
                    l.text3dColor = fill.hex;
                  } else {
                    l.text3dColor = fill;
                  }
                }
                l.text3dColorMode = "color";
                l.text3dEnabled = true;
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

      const deleteColorBtn = (
        <button
          type="button"
          style={{
            background: "#2a2a2a",
            border: "1px solid #444",
            borderRadius: "4px",
            color: hasCustomColor ? "#ff4d4d" : "#666",
            padding: "6px 10px",
            cursor: hasCustomColor ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          disabled={!hasCustomColor}
          onClick={() => {
            const l = this.getTargetLayer();
            if (l) {
              l.text3dColor = "#000000";
              l.text3dColorMode = "auto";
              this.redrawAndSync(l);
              renderUI();
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

      const colorActionsRow = (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {selectColorBtn}
          {deleteColorBtn}
        </div>
      ) as HTMLElement;
      panel.appendChild(colorActionsRow);

      // 7. Slider Darken: 0% - 100%
      const currentDarken = layer?.text3dDarken ?? 30;
      const darkenSlider = (
        <div class="control-row">
          <SliderControl
            label="Darken"
            value={currentDarken}
            min={0}
            max={100}
            step={1}
            unit="%"
            onChange={(val) => {
              const l = this.getTargetLayer();
              if (!l) return;
              l.text3dDarken = Math.round(val);
              l.text3dEnabled = true;
              this.redrawAndSync(l);
            }}
          />
        </div>
      ) as HTMLElement;
      panel.appendChild(darkenSlider);

      // 8. SectionHeader (3D Rotation) với nút Reset
      const rotationHeader = SectionHeader({
        title: "3D Rotation",
        action: {
          type: "button",
          label: "Reset",
          onClick: () => {
            const l = this.getTargetLayer();
            if (!l) return;
            l.text3dRotateX = 0;
            l.text3dRotateY = 0;
            l.text3dRotateZ = 0;
            this.redrawAndSync(l);
            renderUI();
          },
        },
      });
      panel.appendChild(rotationHeader);

      // 9. X rotation: -80° ~ 80°
      const currentRotX = layer?.text3dRotateX ?? 0;
      const rotXSlider = (
        <div class="control-row">
          <SliderControl
            label="X rotation"
            value={currentRotX}
            min={-80}
            max={80}
            step={1}
            unit="°"
            onChange={(val) => {
              const l = this.getTargetLayer();
              if (!l) return;
              l.text3dRotateX = Math.round(val);
              l.text3dEnabled = true;
              this.redrawAndSync(l);
            }}
          />
        </div>
      ) as HTMLElement;
      panel.appendChild(rotXSlider);

      // 10. Y rotation: -80° ~ 80°
      const currentRotY = layer?.text3dRotateY ?? 0;
      const rotYSlider = (
        <div class="control-row">
          <SliderControl
            label="Y rotation"
            value={currentRotY}
            min={-80}
            max={80}
            step={1}
            unit="°"
            onChange={(val) => {
              const l = this.getTargetLayer();
              if (!l) return;
              l.text3dRotateY = Math.round(val);
              l.text3dEnabled = true;
              this.redrawAndSync(l);
            }}
          />
        </div>
      ) as HTMLElement;
      panel.appendChild(rotYSlider);

      // 11. Z rotation: -180° ~ 180°
      const currentRotZ = layer?.text3dRotateZ ?? 0;
      const rotZSlider = (
        <div class="control-row">
          <SliderControl
            label="Z rotation"
            value={currentRotZ}
            min={-180}
            max={180}
            step={1}
            unit="°"
            onChange={(val) => {
              const l = this.getTargetLayer();
              if (!l) return;
              l.text3dRotateZ = Math.round(val);
              l.text3dEnabled = true;
              this.redrawAndSync(l);
            }}
          />
        </div>
      ) as HTMLElement;
      panel.appendChild(rotZSlider);

      // 12. SectionHeader (Simulate lighting, switch)
      const lightingEnabled = layer?.text3dLightingEnabled ?? false;
      const lightingHeader = SectionHeader({
        title: "Simulate lighting",
        action: {
          type: "switch",
          checked: lightingEnabled,
          onChange: (checked) => {
            const l = this.getTargetLayer();
            if (!l) return;
            l.text3dLightingEnabled = checked;
            l.text3dEnabled = true;
            this.redrawAndSync(l);
            renderUI();
          },
        },
      });
      panel.appendChild(lightingHeader);

      if (lightingEnabled) {
        // Light angle (Knob xoay + input số giống Emboss)
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

        let currentAngle = layer?.text3dLightAngle ?? 90;

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

        const centerDisplay = document.createElement("span");
        centerDisplay.style.fontSize = "12px";
        centerDisplay.style.fontWeight = "bold";
        centerDisplay.style.color = "#fff";
        centerDisplay.style.userSelect = "none";
        centerDisplay.textContent = `${currentAngle}°`;
        knobEl.appendChild(centerDisplay);

        const pointerDot = document.createElement("div");
        pointerDot.style.position = "absolute";
        pointerDot.style.width = "8px";
        pointerDot.style.height = "8px";
        pointerDot.style.borderRadius = "50%";
        pointerDot.style.backgroundColor = "#00f260";
        pointerDot.style.pointerEvents = "none";
        knobEl.appendChild(pointerDot);

        const updateKnobUI = (deg: number) => {
          const rad = ((deg - 90) * Math.PI) / 180;
          const dotDist = knobRadius - 10;
          const x = knobRadius + dotDist * Math.cos(rad) - 4;
          const y = knobRadius + dotDist * Math.sin(rad) - 4;
          pointerDot.style.left = `${x}px`;
          pointerDot.style.top = `${y}px`;
          centerDisplay.textContent = `${deg}°`;
          angleDegree.textContent = `${deg}°`;
        };

        updateKnobUI(currentAngle);

        const numInput = document.createElement("input");
        numInput.type = "number";
        numInput.min = "0";
        numInput.max = "360";
        numInput.value = String(currentAngle);
        numInput.style.width = "65px";
        numInput.style.backgroundColor = "#1e1e1e";
        numInput.style.border = "1px solid #3a3a3a";
        numInput.style.borderRadius = "4px";
        numInput.style.color = "#fff";
        numInput.style.padding = "4px 8px";
        numInput.style.fontSize = "12px";
        numInput.style.textAlign = "center";
        numInput.style.outline = "none";

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
            l.text3dLightAngle = deg;
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

        numInput.addEventListener("input", () => {
          let val = parseInt(numInput.value, 10);
          if (isNaN(val)) val = 0;
          val = ((val % 360) + 360) % 360;
          currentAngle = val;
          updateKnobUI(val);
          const l = this.getTargetLayer();
          if (l) {
            l.text3dLightAngle = val;
            this.redrawAndSync(l);
          }
        });

        angleContainer.appendChild(knobEl);
        angleContainer.appendChild(numInput);
        panel.appendChild(angleContainer);

        // Intensity: 0 ~ 100
        const currentIntensity = layer?.text3dLightIntensity ?? 80;
        const intensitySlider = (
          <div class="control-row">
            <SliderControl
              label="Intensity"
              value={currentIntensity}
              min={0}
              max={100}
              step={1}
              onChange={(val) => {
                const l = this.getTargetLayer();
                if (!l) return;
                l.text3dLightIntensity = Math.round(val);
                l.text3dEnabled = true;
                this.redrawAndSync(l);
              }}
            />
          </div>
        ) as HTMLElement;
        panel.appendChild(intensitySlider);

        // Shadow: 0 ~ 100
        const currentShadow = layer?.text3dLightShadow ?? 40;
        const shadowSlider = (
          <div class="control-row">
            <SliderControl
              label="Shadow"
              value={currentShadow}
              min={0}
              max={100}
              step={1}
              onChange={(val) => {
                const l = this.getTargetLayer();
                if (!l) return;
                l.text3dLightShadow = Math.round(val);
                l.text3dEnabled = true;
                this.redrawAndSync(l);
              }}
            />
          </div>
        ) as HTMLElement;
        panel.appendChild(shadowSlider);

        // Specular Hardness: 0 ~ 100
        const currentSpecular = layer?.text3dLightSpecular ?? 30;
        const specularSlider = (
          <div class="control-row">
            <SliderControl
              label="Specular Hardness"
              value={currentSpecular}
              min={0}
              max={100}
              step={1}
              onChange={(val) => {
                const l = this.getTargetLayer();
                if (!l) return;
                l.text3dLightSpecular = Math.round(val);
                l.text3dEnabled = true;
                this.redrawAndSync(l);
              }}
            />
          </div>
        ) as HTMLElement;
        panel.appendChild(specularSlider);
      }

      containerGroup.appendChild(panel);
    };

    renderUI();
  }

  close(containerGroup: HTMLElement): void {
    if (containerGroup && containerGroup.dataset._savedInner) {
      containerGroup.innerHTML = containerGroup.dataset._savedInner;
      delete containerGroup.dataset._savedInner;
    }
  }
}
