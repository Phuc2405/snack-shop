import type { Order, Product } from '@/types/domain';
import { subtotalOf } from './cart';

export type PriceIssue =
  | { kind: 'subtotal_mismatch'; expected: number; actual: number }
  | { kind: 'total_mismatch'; expected: number; actual: number }
  | { kind: 'price_differs'; name: string; menuPrice: number; orderPrice: number }
  | { kind: 'unknown_product'; name: string };

/**
 * Kiểm tra chéo đơn hàng với menu hiện tại (chạy ở dashboard nhân viên).
 *
 * Vì sao cần: Firestore Rules không lặp được qua danh sách món, nên không tự kiểm từng giá
 * được. Rules đã chặn mọi thứ khác (chủ đơn, trạng thái, phí ship, số món, tiệm mở cửa…);
 * phần giá từng món được kiểm ở đây và báo cho nhân viên trước khi nhận đơn.
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
    if (!p) issues.push({ kind: 'unknown_product', name: it.name });
    else if (p.price !== it.price) issues.push({ kind: 'price_differs', name: it.name, menuPrice: p.price, orderPrice: it.price });
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
