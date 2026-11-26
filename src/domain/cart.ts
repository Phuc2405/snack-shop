import type { Product, SelectedOption } from '@/types/domain';
import { lineKey, optionsTotal, repriceOptions } from './options';

/**
 * Logic giỏ hàng dạng hàm thuần (pure functions): không đụng localStorage hay React,
 * nên test được trực tiếp. Store Zustand (`stores/cart.store.ts`) chỉ gọi các hàm này.
 */

export const MAX_QTY_PER_ITEM = 20;
export const MAX_LINES = 30; // khớp giới hạn items.size() <= 30 trong firestore.rules

export interface CartLine {
  /** productId + tuỳ chọn — cùng món khác tuỳ chọn là 2 dòng */
  key: string;
  productId: string;
  name: string;
  /** Đơn giá = giá món + giá tuỳ chọn */
  price: number;
  imageUrl: string;
  category: Product['category'];
  options: SelectedOption[];
  qty: number;
}

export type AddResult = 'added' | 'capped' | 'unavailable' | 'full';

export function addLine(
  lines: CartLine[],
  p: Product,
  qty = 1,
  options: SelectedOption[] = [],
): { lines: CartLine[]; result: AddResult } {
  if (!p.available) return { lines, result: 'unavailable' };
  const key = lineKey(p.id, options);
  const existing = lines.find((l) => l.key === key);
  if (!existing && lines.length >= MAX_LINES) return { lines, result: 'full' };
  const wanted = (existing?.qty ?? 0) + qty;
  const next: CartLine = {
    key,
    productId: p.id,
    name: p.name,
    price: p.price + optionsTotal(options),
    imageUrl: p.imageUrl,
    category: p.category,
    options,
    qty: Math.min(wanted, MAX_QTY_PER_ITEM),
  };
  return {
    lines: existing ? lines.map((l) => (l.key === key ? next : l)) : [...lines, next],
    result: wanted > MAX_QTY_PER_ITEM ? 'capped' : 'added',
  };
}

export function setLineQty(lines: CartLine[], key: string, qty: number): CartLine[] {
  const q = Math.min(Math.max(0, Math.floor(qty)), MAX_QTY_PER_ITEM);
  return lines.map((l) => (l.key === key ? { ...l, qty: q } : l)).filter((l) => l.qty > 0);
}

export const countItems = (lines: { qty: number }[]) => lines.reduce((n, l) => n + l.qty, 0);
export const subtotalOf = (lines: { price: number; qty: number }[]) => lines.reduce((n, l) => n + l.price * l.qty, 0);

export interface CartChange {
  name: string;
  kind: 'removed' | 'price_changed' | 'options_changed';
}

/**
 * Đối chiếu giỏ với menu mới nhất: bỏ món đã xoá / tạm hết / tuỳ chọn không còn, cập nhật giá.
 * Trả về danh sách thay đổi để báo cho khách (không thay đổi "im lặng").
 */
export function reconcileLines(lines: CartLine[], menu: Product[]): { lines: CartLine[]; changes: CartChange[] } {
  const byId = new Map(menu.map((p) => [p.id, p]));
  const changes: CartChange[] = [];
  const next = lines.flatMap<CartLine>((l) => {
    const p = byId.get(l.productId);
    if (!p || !p.available) {
      changes.push({ name: l.name, kind: 'removed' });
      return [];
    }
    const options = repriceOptions(p, l.options ?? []);
    if (!options) {
      changes.push({ name: p.name, kind: 'options_changed' });
      return [];
    }
    const price = p.price + optionsTotal(options);
    if (price !== l.price) changes.push({ name: p.name, kind: 'price_changed' });
    return [{ ...l, key: lineKey(p.id, options), name: p.name, price, options, imageUrl: p.imageUrl, category: p.category }];
  });
  return { lines: next, changes };
}
