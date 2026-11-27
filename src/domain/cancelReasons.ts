/**
 * Lý do huỷ đơn. Huỷ là BẮT BUỘC chọn lý do (rules từ chối nếu thiếu); ghi chú không bắt buộc,
 * trừ "Lý do khác" (không ghi thì không ai biết lý do là gì).
 * id PHẢI khớp danh sách trong firestore.rules (customerCancels / staffUpdates) — có unit test so khớp.
 */
export interface CancelReason {
  id: string;
  label: string;
}

export const CUSTOMER_CANCEL_REASONS: CancelReason[] = [
  { id: 'changed_mind', label: 'Đổi ý, không muốn đặt nữa' },
  { id: 'wrong_items', label: 'Đặt nhầm món / số lượng' },
  { id: 'wrong_info', label: 'Sai địa chỉ / số điện thoại' },
  { id: 'too_slow', label: 'Chờ lâu quá' },
  { id: 'other', label: 'Lý do khác' },
];

export const SHOP_CANCEL_REASONS: CancelReason[] = [
  { id: 'sold_out', label: 'Hết món' },
  { id: 'shop_busy', label: 'Quán quá tải / sắp đóng cửa' },
  { id: 'no_contact', label: 'Không liên lạc được khách' },
  { id: 'out_of_area', label: 'Ngoài khu vực giao hàng' },
  { id: 'customer_request', label: 'Khách gọi yêu cầu huỷ' },
  { id: 'other', label: 'Lý do khác' },
];

export const CANCEL_NOTE_MAX = 200;
/** "Lý do khác" bắt buộc ghi chú ít nhất chừng này ký tự (khớp rules) */
export const OTHER_NOTE_MIN = 3;

export function cancelReasonLabel(id: string | undefined, by: 'customer' | 'shop' | undefined): string {
  if (!id) return '';
  const list = by === 'shop' ? SHOP_CANCEL_REASONS : CUSTOMER_CANCEL_REASONS;
  return (list.find((r) => r.id === id) ?? [...SHOP_CANCEL_REASONS, ...CUSTOMER_CANCEL_REASONS].find((r) => r.id === id))?.label ?? id;
}

/** Lỗi (tiếng Việt) nếu lựa chọn chưa hợp lệ, null nếu được */
export function validateCancel(reason: string, note: string, list: CancelReason[]): string | null {
  if (!reason || !list.some((r) => r.id === reason)) return 'Bạn chọn giúp lý do huỷ nhé.';
  if (note.length > CANCEL_NOTE_MAX) return `Ghi chú tối đa ${CANCEL_NOTE_MAX} ký tự.`;
  if (reason === 'other' && note.trim().length < OTHER_NOTE_MIN) return 'Chọn "Lý do khác" thì ghi rõ lý do giúp tiệm nhé.';
  return null;
}
