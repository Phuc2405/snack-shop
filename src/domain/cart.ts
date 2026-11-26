import type { Product } from '@/types/domain';

/**
 * Logic giỏ hàng dạng hàm thuần (pure functions): không đụng localStorage hay React,
 * nên test được trực tiếp. Store Zustand (`stores/cart.store.ts`) chỉ gọi các hàm này.
 */

export const MAX_QTY_PER_ITEM = 20;
export const MAX_LINES = 30; // khớp giới hạn items.size() <= 30 trong firestore.rules

export interface CartLine {
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  category: Product['category'];
  qty: number;
}

export type AddResult = 'added' | 'capped' | 'unavailable' | 'full';

export function addLine(lines: CartLine[], p: Product, qty = 1): { lines: CartLine[]; result: AddResult } {
  if (!p.available) return { lines, result: 'unavailable' };
  const existing = lines.find((l) => l.productId === p.id);
  if (!existing && lines.length >= MAX_LINES) return { lines, result: 'full' };
  const wanted = (existing?.qty ?? 0) + qty;
  const next: CartLine = {
    productId: p.id,
    name: p.name,
    price: p.price,
    imageUrl: p.imageUrl,
    category: p.category,
    qty: Math.min(wanted, MAX_QTY_PER_ITEM),
  };
  return {
    lines: existing ? lines.map((l) => (l.productId === p.id ? next : l)) : [...lines, next],
    result: wanted > MAX_QTY_PER_ITEM ? 'capped' : 'added',
  };
}

export function setLineQty(lines: CartLine[], productId: string, qty: number): CartLine[] {
  const q = Math.min(Math.max(0, Math.floor(qty)), MAX_QTY_PER_ITEM);
  return lines.map((l) => (l.productId === productId ? { ...l, qty: q } : l)).filter((l) => l.qty > 0);
}

export const countItems = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0);
export const subtotalOf = (lines: { price: number; qty: number }[]) => lines.reduce((n, l) => n + l.price * l.qty, 0);

export interface CartChange {
  name: string;
  kind: 'removed' | 'price_changed';
}

/**
 * Đối chiếu giỏ với menu mới nhất: bỏ món đã xoá / tạm hết, cập nhật giá.
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
    if (p.price !== l.price) changes.push({ name: p.name, kind: 'price_changed' });
    return [{ ...l, name: p.name, price: p.price, imageUrl: p.imageUrl, category: p.category }];
  });
  return { lines: next, changes };
}
