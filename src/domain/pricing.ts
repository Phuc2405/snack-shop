import type { Fulfillment, Order, PaymentMethod, Product, ShopSettings } from '@/types/domain';
import { MAX_NOTE, MAX_QTY_PER_ITEM, subtotalOf } from './cart';

/** Tên món tối đa (khớp validProduct: isStr(d.name, 1, 80) trong firestore.rules) */
const MAX_ITEM_NAME = 80;
import { optionsTotal, repriceOptions } from './options';

type ShipSettings = Pick<ShopSettings, 'deliveryFee' | 'freeShipFrom' | 'shipFeeMode'>;

/**
 * Phí ship tiệm thu (nằm trong tổng đơn). PHẢI giống expectedDeliveryFee() trong firestore.rules (có test).
 *  - Ghé lấy: 0
 *  - Đặt ship, phí "trả tài xế" (shipFeeMode = 'driver'): 0 — khách trả phí cho tài xế khi nhận
 *  - Đặt ship, đồng giá: miễn phí nếu bật freeship (freeShipFrom > 0) và tạm tính ≥ freeShipFrom, ngược lại = deliveryFee
 */
export function deliveryFeeFor(subtotal: number, fulfillment: Fulfillment, s: ShipSettings): number {
  if (fulfillment === 'pickup') return 0;
  if (s.shipFeeMode === 'driver') return 0;
  if (s.freeShipFrom > 0 && subtotal >= s.freeShipFrom) return 0;
  return s.deliveryFee;
}

/** Đơn ship mà phí ship khách tự trả cho tài xế (để hiện "Phí ship: trả tài xế" thay vì "Miễn phí"). */
export const shipsToDriver = (fulfillment: Fulfillment, s: Pick<ShopSettings, 'shipFeeMode'>) =>
  fulfillment === 'delivery' && s.shipFeeMode === 'driver';

/** Còn thiếu bao nhiêu để được freeship (null = không áp dụng / đã đạt / phí ship trả tài xế). */
export function freeShipRemaining(subtotal: number, s: Pick<ShopSettings, 'freeShipFrom'> & Partial<Pick<ShopSettings, 'shipFeeMode'>>): number | null {
  if (s.shipFeeMode === 'driver') return null;
  if (s.freeShipFrom <= 0 || subtotal >= s.freeShipFrom) return null;
  return s.freeShipFrom - subtotal;
}

/**
 * Cách thanh toán được phép. PHẢI giống điều kiện paymentMethod trong firestore.rules (có test).
 *  - Chuyển khoản chỉ khi tiệm đã khai báo tài khoản.
 *  - Bật "đơn ship phải chuyển khoản trước": đơn ship chỉ còn chuyển khoản (chống bom hàng).
 */
export function allowedPayments(
  fulfillment: Fulfillment,
  s: Pick<ShopSettings, 'bankAccount' | 'bankBin' | 'shipPrepaid'>,
): PaymentMethod[] {
  const canTransfer = Boolean(s.bankAccount && s.bankBin);
  if (!canTransfer) return ['cod'];
  if (fulfillment === 'delivery' && s.shipPrepaid) return ['transfer'];
  return ['cod', 'transfer'];
}

export type PriceIssue =
  | { kind: 'subtotal_mismatch'; expected: number; actual: number }
  | { kind: 'total_mismatch'; expected: number; actual: number }
  | { kind: 'price_differs'; name: string; menuPrice: number; orderPrice: number }
  | { kind: 'unknown_option'; name: string }
  | { kind: 'unknown_product'; name: string }
  | { kind: 'bad_qty'; name: string; qty: number }
  | { kind: 'count_mismatch'; expected: number; actual: number }
  | { kind: 'long_text'; name: string; field: 'name' | 'note'; length: number }
  /** Món trong đơn hiện đang Tạm hết / bị Ẩn (khách đặt từ trang cũ chưa tải lại menu) */
  | { kind: 'unavailable'; name: string; hidden: boolean };

/**
 * Kiểm tra chéo đơn hàng với menu hiện tại (chạy ở dashboard nhân viên).
 *
 * Vì sao cần: Firestore Rules không lặp được qua danh sách món, và kiểm theo vị trí 0..29 vượt giới hạn
 * 1000 biểu thức / request (đo 2026-11-27: chỉ kiểm số lượng đã hỏng từ ~18 dòng). Rules chặn mọi thứ khác
 * (chủ đơn, trạng thái, phí ship, số dòng, tiệm mở cửa…); từng dòng món (giá, tuỳ chọn, số lượng, độ dài chữ)
 * và tổng của các dòng được kiểm ở đây và báo cho nhân viên trước khi nhận đơn.
 * Muốn kiểm hoàn toàn ở server: thêm Cloud Function (cần gói Blaze) — xem docs/SECURITY.md.
 */
export function auditOrder(
  order: Pick<Order, 'items' | 'subtotal' | 'deliveryFee' | 'total'> & Partial<Pick<Order, 'itemCount'>>,
  menu: Product[],
): PriceIssue[] {
  const issues: PriceIssue[] = [];
  const byId = new Map(menu.map((p) => [p.id, p]));
  const sum = subtotalOf(order.items);
  if (sum !== order.subtotal) issues.push({ kind: 'subtotal_mismatch', expected: sum, actual: order.subtotal });
  const count = order.items.reduce((n, it) => n + it.qty, 0);
  if (order.itemCount !== undefined && order.itemCount !== count) {
    issues.push({ kind: 'count_mismatch', expected: count, actual: order.itemCount });
  }
  if (order.subtotal + order.deliveryFee !== order.total) {
    issues.push({ kind: 'total_mismatch', expected: order.subtotal + order.deliveryFee, actual: order.total });
  }
  for (const it of order.items) {
    // Số lượng âm / lẻ / quá giới hạn làm tạm tính "khớp" mà khách nhận nhiều hơn số tiền trả (BUG-001)
    if (!Number.isInteger(it.qty) || it.qty < 1 || it.qty > MAX_QTY_PER_ITEM) {
      issues.push({ kind: 'bad_qty', name: it.name, qty: it.qty });
    }
    // Chữ dài hơn giao diện cho phép = đơn không đi qua app (BUG-002)
    if (it.name.length > MAX_ITEM_NAME) issues.push({ kind: 'long_text', name: it.name.slice(0, 30), field: 'name', length: it.name.length });
    if ((it.note ?? '').length > MAX_NOTE) issues.push({ kind: 'long_text', name: it.name.slice(0, 30), field: 'note', length: it.note.length });
    const p = byId.get(it.productId);
    if (!p) {
      issues.push({ kind: 'unknown_product', name: it.name });
      continue;
    }
    if (!p.available || p.hidden) issues.push({ kind: 'unavailable', name: it.name, hidden: p.hidden });
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
