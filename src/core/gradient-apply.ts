import type { LayerManager, Layer } from "./layer";
import type { TextTransform } from "../text/text-transform";
import { ColorService } from "./layer/color-service";
import type { WarmGradientData } from "@warmjs/ui";

export interface GradientApplyContext {
  layerManager?: LayerManager;
  textTransform?: TextTransform;
  targetLayer?: Layer | null;
  onApply?: (data: WarmGradientData) => void;
}

/**
 * Applies custom gradient data to the target (text layer fontColor or
 * background fill) and registers it as a preset. Moved verbatim from
 * the former GradientPanel.handleApply so the WarmJS editor port
 * stays pixel-logic free.
 */
export function applyCustomGradient(
  gradData: WarmGradientData,
  ctx: GradientApplyContext
): void {
  const { layerManager, textTransform, onApply } = ctx;
  let targetLayer: Layer | null =
    ctx.targetLayer !== undefined
      ? ctx.targetLayer
      : textTransform
        ? textTransform.selectedLayer
        : null;

  if (!targetLayer && layerManager) {
    const active = layerManager.getActiveLayer();
    if (active && active.id !== 0) targetLayer = active;
  }

  if (targetLayer && targetLayer.type === "text" && targetLayer.id !== 0) {
    targetLayer.fontColor = {
      kind: "custom",
      data: JSON.parse(JSON.stringify(gradData)),
    };
    if (textTransform) textTransform.redrawTextLayer(targetLayer);
    if (layerManager) layerManager.render();
    if (textTransform && textTransform.selectedLayer === targetLayer) {
      textTransform.drawSelectionOverlay(targetLayer);
    }
  } else if (layerManager) {
    const bg = layerManager.getBackgroundLayer();
    const canvas = layerManager.mainCanvas;
    if (bg && canvas) {
      ColorService.renderBackgroundFill(
        bg.ctx,
        canvas.width,
        canvas.height,
        { kind: "custom", data: gradData }
      );
      ColorService.lastBackground = { kind: "custom", data: gradData };
      layerManager.render();
    }
  }

  ColorService.addGradientPreset(
    gradData,
    gradData.type === "linear" ? "Linear Custom" : "Radial Custom"
  );

  if (onApply) onApply(gradData);
}
