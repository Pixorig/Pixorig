/**
 * Layer Geometry - hình học layer dùng chung cho các module tương tác canvas.
 *
 * ImageTransform (image layer) và TextTransform (text layer) cùng đăng ký
 * hit-test + khung bao cho loại layer của mình. Nhờ đó:
 * - Một thao tác chuột chỉ được xử lý bởi ĐÚNG MỘT layer: layer có zIndex cao
 *   nhất thực sự nằm dưới con trỏ (trước đây mỗi module tự hit-test riêng nên
 *   image và text chồng nhau thì cả hai cùng bị kéo).
 * - LayerManager có thể vẽ khung chọn cho MỌI layer đang chọn mà không cần
 *   biết chi tiết hình học của từng loại layer.
 */

import type { Layer, LayerManager } from "./layer";

export interface LayerBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayerGeometry {
  /** Con trỏ có thực sự chạm vào layer không? */
  hit(layer: Layer, x: number, y: number): boolean;
  /** Khung bao của layer (null nếu loại layer không có khung bao). */
  bounds(layer: Layer): LayerBounds | null;
}

const geometries = new Map<string, LayerGeometry>();

/**
 * Đăng ký hình học cho một loại layer (mỗi loại chỉ nên có một hình học).
 * Trả về hàm hủy đăng ký.
 */
export function registerLayerGeometry(
  type: string,
  geometry: LayerGeometry
): () => void {
  geometries.set(type, geometry);
  return () => {
    if (geometries.get(type) === geometry) geometries.delete(type);
  };
}

/**
 * Con trỏ có thực sự chạm vào layer không (theo hit-test của loại layer đó)?
 * Layer ẩn / bị khoá luôn coi như không chạm tới.
 */
export function isPointOnLayer(layer: Layer, x: number, y: number): boolean {
  if (!layer.visible || layer.locked) return false;
  const geometry = geometries.get(layer.type);
  if (!geometry) return false;
  return geometry.hit(layer, x, y);
}

/** Khung bao của layer theo loại layer (null nếu chưa đăng ký / không có). */
export function getLayerBounds(layer: Layer): LayerBounds | null {
  const geometry = geometries.get(layer.type);
  return geometry ? geometry.bounds(layer) : null;
}

/**
 * Có layer KHÁC LOẠI nằm trên `layer` (zIndex lớn hơn) và thực sự bị con trỏ
 * chạm tới tại (x, y) không?
 *
 * Dùng để nhường thao tác kéo cho layer trên cùng khi hai layer chồng nhau.
 * Layer cùng loại không xét ở đây, vì chính module tương tác đã tự chọn layer
 * trên cùng trong số các layer cùng loại (vd: `findImageLayerAt`).
 */
export function isPointObscuredByOtherType(
  layerManager: LayerManager,
  layer: Layer,
  x: number,
  y: number
): boolean {
  return layerManager.layers.some(
    (other) =>
      other.id !== layer.id &&
      other.type !== layer.type &&
      other.zIndex > layer.zIndex &&
      isPointOnLayer(other, x, y)
  );
}
