import type { Fulfillment, Order, Product, ShopSettings } from '@/types/domain';
import { subtotalOf } from './cart';
import { optionsTotal, repriceOptions } from './options';

/**
 * Phí ship theo cấu hình tiệm. PHẢI giống điều kiện deliveryFee trong firestore.rules (có test).
 *  - Ghé lấy: 0
 *  - Giao hàng: miễn phí nếu bật freeship (freeShipFrom > 0) và tạm tính ≥ freeShipFrom, ngược lại = deliveryFee
 */
export function deliveryFeeFor(
  subtotal: number,
  fulfillment: Fulfillment,
  s: Pick<ShopSettings, 'deliveryFee' | 'freeShipFrom'>,
): number {
  if (fulfillment === 'pickup') return 0;
  if (s.freeShipFrom > 0 && subtotal >= s.freeShipFrom) return 0;
  return s.deliveryFee;
}

/** Còn thiếu bao nhiêu để được freeship (null = không áp dụng / đã đạt). */
export function freeShipRemaining(subtotal: number, s: Pick<ShopSettings, 'freeShipFrom'>): number | null {
  if (s.freeShipFrom <= 0 || subtotal >= s.freeShipFrom) return null;
  return s.freeShipFrom - subtotal;
}

export type PriceIssue =
  | { kind: 'subtotal_mismatch'; expected: number; actual: number }
  | { kind: 'total_mismatch'; expected: number; actual: number }
  | { kind: 'price_differs'; name: string; menuPrice: number; orderPrice: number }
  | { kind: 'unknown_option'; name: string }
  | { kind: 'unknown_product'; name: string };

/**
 * Kiểm tra chéo đơn hàng với menu hiện tại (chạy ở dashboard nhân viên).
 *
 * Vì sao cần: Firestore Rules không lặp được qua danh sách món, nên không tự kiểm từng giá
 * được. Rules đã chặn mọi thứ khác (chủ đơn, trạng thái, phí ship, số món, tiệm mở cửa…);
 * phần giá từng món (kể cả tuỳ chọn) được kiểm ở đây và báo cho nhân viên trước khi nhận đơn.
 * Muốn kiểm hoàn toàn ở server: thêm Cloud Function (cần gói Blaze) — xem docs/SECURITY.md.
 */
export function auditOrder(order: Pick<Order, 'items' | 'subtotal' | 'deliveryFee' | 'total'>, menu: Product[]): PriceIssue[] {
  const issues: PriceIssue[] = [];
  const byId = new Map(menu.map((p) => [p.id, p]));
  const sum = subtotalOf(order.items);
  if (sum !== order.subtotal) issues.push({ kind: 'subtotal_mismatch', expected: sum, actual: order.subtotal });
  if (order.subtotal + order.deliveryFee !== order.total) {
    issues.push({ kind: 'total_mismatch', expected: order.subtotal + order.deliveryFee, actual: order.total });
  }
  for (const it of order.items) {
    const p = byId.get(it.productId);
    if (!p) {
      issues.push({ kind: 'unknown_product', name: it.name });
      continue;
    }
    const opts = repriceOptions(p, it.options ?? []);
    if (!opts) {
      issues.push({ kind: 'unknown_option', name: it.name });
      continue;
    }
    const expected = p.price + optionsTotal(opts);
    if (expected !== it.price) issues.push({ kind: 'price_differs', name: it.name, menuPrice: expected, orderPrice: it.price });
  }
  return issues;
}

/** Mã đơn ngắn, dễ đọc qua điện thoại; bỏ các ký tự dễ nhầm (0/O, 1/I/L). */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export function makeOrderCode(random: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 5; i++) s += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return `NB-${s}`;
}
