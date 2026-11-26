const vnd = new Intl.NumberFormat('vi-VN');
const time = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' });
const dateTime = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

/** 35000 → "35.000đ" (gọn hơn "35.000 ₫" trên thẻ món) */
export const formatPrice = (value: number) => `${vnd.format(value)}đ`;
export const formatTime = (d: Date | null) => (d ? time.format(d) : '--:--');
export const formatDateTime = (d: Date | null) => (d ? dateTime.format(d) : '');

/** "vừa xong", "5 phút trước", "2 giờ trước" — cho dashboard đơn hàng */
export function timeAgo(d: Date | null, now = Date.now()): string {
  if (!d) return 'vừa xong';
  const min = Math.floor((now - d.getTime()) / 60000);
  if (min < 1) return 'vừa xong';
  if (min < 60) return `${min} phút trước`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} giờ trước`;
  return formatDateTime(d);
}

/** Chuẩn hoá số điện thoại VN: bỏ khoảng trắng/dấu chấm/gạch. */
export const normalizePhone = (s: string) => s.replace(/[\s.\-()]/g, '');
