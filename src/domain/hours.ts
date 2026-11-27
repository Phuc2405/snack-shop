import type { ShopSettings } from '@/types/domain';

/**
 * Giờ mở cửa: đọc từ ô "Giờ mở cửa" chủ tiệm tự gõ (VD "8:00 – 22:00 hằng ngày", "8h - 22h", "18h30-2h").
 * Không đọc được → coi như mở cả ngày (không chặn nhầm khách).
 * Giờ tính theo Việt Nam (Asia/Ho_Chi_Minh), khách ở múi giờ khác vẫn thấy đúng.
 *
 * Ngoài giờ KHÔNG chặn đặt món: khách vẫn đặt trước, tiệm xác nhận khi mở cửa.
 * Muốn chặn hẳn thì tắt "Nhận đơn online" (rules mới thật sự chặn).
 */

export interface OpenHours {
  /** phút tính từ 0:00 */
  open: number;
  close: number;
}

const RANGE = /(\d{1,2})\s*(?:[:h.giờ]+\s*(\d{2})?)?\s*(?:–|—|-|đến|tới|to)\s*(\d{1,2})\s*(?:[:h.giờ]+\s*(\d{2})?)?/i;

export function parseOpenHours(text: string): OpenHours | null {
  const m = RANGE.exec(text);
  if (!m) return null;
  const [h1, m1, h2, m2] = [m[1], m[2], m[3], m[4]].map((v) => (v ? Number(v) : 0)) as [number, number, number, number];
  if (h1 > 24 || h2 > 24 || m1 > 59 || m2 > 59) return null;
  const open = (h1 % 24) * 60 + m1;
  const close = (h2 % 24) * 60 + m2;
  if (open === close) return null; // "0h - 24h" ~ cả ngày
  return { open, close };
}

/** Phút hiện tại trong ngày theo giờ Việt Nam */
export function vnMinutes(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(now)
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  return Number(parts.hour) * 60 + Number(parts.minute);
}

export function isWithinHours(h: OpenHours, minutes: number): boolean {
  // Ca qua đêm (VD 18:00 – 2:00): close < open
  return h.open < h.close ? minutes >= h.open && minutes < h.close : minutes >= h.open || minutes < h.close;
}

export const formatMinutes = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;

export type ShopPhase =
  /** Đang mở, nhận đơn bình thường */
  | { kind: 'open' }
  /** Ngoài giờ nhưng vẫn nhận đặt trước; `tomorrow` = mở lại vào ngày mai (đã qua giờ đóng cửa) */
  | { kind: 'after-hours'; opensAt: string; tomorrow: boolean }
  /** Chủ tiệm tắt "Nhận đơn online" */
  | { kind: 'paused' };

export function shopPhase(s: Pick<ShopSettings, 'isOpen' | 'openHours'>, now: Date = new Date()): ShopPhase {
  if (!s.isOpen) return { kind: 'paused' };
  const h = parseOpenHours(s.openHours);
  if (!h) return { kind: 'open' };
  const m = vnMinutes(now);
  if (isWithinHours(h, m)) return { kind: 'open' };
  // Sau giờ đóng cửa, hoặc đêm khuya (trước 5h) → "ngày mai"; sáng sớm (5h–giờ mở) → "lát nữa mở cửa"
  const tomorrow = h.open < h.close && (m >= h.close || m < 5 * 60);
  return { kind: 'after-hours', opensAt: formatMinutes(h.open), tomorrow };
}

/** Câu ngắn cho khách khi đặt ngoài giờ (không nêu giờ cụ thể — giờ mở cửa đã hiện ở đầu trang) */
export function afterHoursNote(p: Extract<ShopPhase, { kind: 'after-hours' }>): string {
  return `Khách ơi, tiệm đang đóng cửa. Bạn cứ đặt trước, ${p.tomorrow ? 'ngày mai' : 'lát nữa mở cửa'} tiệm sẽ xác nhận và gọi cho bạn nhé!`;
}

/** Bản rất ngắn cho dải thông báo trên trang menu */
export function afterHoursShort(p: Extract<ShopPhase, { kind: 'after-hours' }>): string {
  return `Tiệm đang đóng cửa. Bạn cứ đặt trước, ${p.tomorrow ? 'ngày mai' : 'lát nữa mở cửa'} tiệm xác nhận nhé!`;
}
