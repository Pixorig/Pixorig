/**
 * Panel State Store
 * Lưu trạng thái mốc (snapshot) của panel theo panelId + layerId.
 * Dùng cho nút Reset: trả về trạng thái tại LÚC PANEL ĐƯỢC MỞ gần nhất.
 *
 * Hành vi mong đợi của người dùng:
 *   1. Mở panel (slider = 50), kéo lên 80 → Reset → về 50.
 *   2. Kéo lên 90, Back ra, vào lại (slider = 90), kéo xuống 30 → Reset → về 90.
 * => Mốc luôn được GHI ĐÈ mỗi lần panel được mở.
 */

export interface PanelSnapshot {
  [key: string]: number | string | boolean;
}

// Map key: "panelId:layerId" -> snapshot giá trị lúc mở panel gần nhất
const store = new Map<string, PanelSnapshot>();

function makeKey(panelId: string, layerId: number | string): string {
  return `${panelId}:${layerId}`;
}

/**
 * Lưu snapshot trạng thái khi mở panel.
 * Luôn ghi đè mốc cũ — Reset luôn về giá trị tại lúc mở panel gần nhất.
 */
export function captureSnapshot(
  panelId: string,
  layerId: number | string,
  values: PanelSnapshot
): void {
  store.set(makeKey(panelId, layerId), { ...values });
}

/**
 * Lấy snapshot đã lưu.
 */
export function getSnapshot(
  panelId: string,
  layerId: number | string
): PanelSnapshot | undefined {
  return store.get(makeKey(panelId, layerId));
}

/**
 * Xóa snapshot của MỘT panel cho layer (dùng khi layer bị xóa / cần reset mốc có chủ đích).
 */
export function clearSnapshot(panelId: string, layerId: number | string): void {
  store.delete(makeKey(panelId, layerId));
}

/**
 * Xóa toàn bộ snapshot của một layer (khi chọn layer khác hoặc đổi nội dung text).
 * Lần mở panel kế tiếp sẽ ghi mốc mới.
 */
export function clearAllSnapshotsForLayer(layerId: number | string): void {
  for (const key of Array.from(store.keys())) {
    if (key.endsWith(`:${layerId}`)) store.delete(key);
  }
}
