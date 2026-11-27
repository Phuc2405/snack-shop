import type { Product, SelectedOption } from '@/types/domain';
import { lineKey, optionsTotal, repriceOptions } from './options';

/**
 * Logic giỏ hàng dạng hàm thuần (pure functions): không đụng localStorage hay React,
 * nên test được trực tiếp. Store Zustand (`stores/cart.store.ts`) chỉ gọi các hàm này.
 */

export const MAX_QTY_PER_ITEM = 20;
export const MAX_LINES = 30; // khớp giới hạn items.size() <= 30 trong firestore.rules

export interface CartLine {
  /** productId + tuỳ chọn + ghi chú — khác nhau dù chỉ 1 chi tiết là 2 dòng riêng */
  key: string;
  productId: string;
  name: string;
  /** Đơn giá = giá món + giá tuỳ chọn */
  price: number;
  imageUrl: string;
  category: Product['category'];
  options: SelectedOption[];
  /** Ghi chú riêng cho món, vd "ít đá", "không hành" */
  note: string;
  qty: number;
}

export const MAX_NOTE = 100;

/** Gọn khoảng trắng, cắt độ dài → "ít  đá " và "ít đá" là cùng 1 ghi chú */
export const normalizeNote = (note: string) => note.replace(/\s+/g, ' ').trim().slice(0, MAX_NOTE);

/** Khoá dòng giỏ: món + tuỳ chọn (không phụ thuộc thứ tự) + ghi chú (không phân biệt hoa thường) */
export function cartLineKey(productId: string, options: Pick<SelectedOption, 'group' | 'choice'>[], note = ''): string {
  const base = lineKey(productId, options);
  const n = normalizeNote(note).toLowerCase();
  return n ? `${base}#${n}` : base;
}

export type AddResult = 'added' | 'capped' | 'unavailable' | 'full';

export function addLine(
  lines: CartLine[],
  p: Product,
  qty = 1,
  options: SelectedOption[] = [],
  rawNote = '',
): { lines: CartLine[]; result: AddResult } {
  if (!p.available) return { lines, result: 'unavailable' };
  const note = normalizeNote(rawNote);
  const key = cartLineKey(p.id, options, note);
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
    note,
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
    return [{ ...l, key: cartLineKey(p.id, options, l.note ?? ''), note: l.note ?? '', name: p.name, price, options, imageUrl: p.imageUrl, category: p.category }];
  });
  return { lines: next, changes };
}

/**
 * Gộp giỏ lúc đăng nhập: `account` = giỏ đã lưu của tài khoản, `guest` = giỏ vừa chọn khi chưa đăng nhập.
 * - Cùng món + cùng tuỳ chọn + cùng ghi chú (cùng key) → giữ SỐ LƯỢNG LỚN HƠN (7 và 5 → 7), không cộng dồn.
 * - Khác dù chỉ 1 chi tiết (size, % đường, topping, ghi chú) → 2 dòng riêng.
 * - Món chỉ có ở một bên → thêm vào như thường (giữ thứ tự: giỏ tài khoản trước, món mới sau).
 */
export function mergeCarts(account: CartLine[], guest: CartLine[]): { lines: CartLine[]; merged: number; added: number; dropped: number } {
  const lines = account.map((l) => ({ ...l }));
  let merged = 0;
  let added = 0;
  let dropped = 0;
  for (const g of guest) {
    const same = lines.find((l) => l.key === g.key);
    if (same) {
      if (g.qty > same.qty) same.qty = Math.min(g.qty, MAX_QTY_PER_ITEM);
      merged++;
    } else if (lines.length < MAX_LINES) {
      lines.push({ ...g });
      added++;
    } else dropped++;
  }
  return { lines, merged, added, dropped };
}

/** "Đã bỏ khỏi giỏ vì tạm hết: A, B · Giá vừa cập nhật: C" */
export function describeChanges(changes: CartChange[]): string {
  const removed = changes.filter((c) => c.kind !== 'price_changed').map((c) => c.name);
  const repriced = changes.filter((c) => c.kind === 'price_changed').map((c) => c.name);
  return [
    removed.length ? `Đã bỏ khỏi giỏ vì vừa tạm hết: ${[...new Set(removed)].join(', ')}` : '',
    repriced.length ? `Giá vừa cập nhật: ${[...new Set(repriced)].join(', ')}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Tổng số phần của 1 món trong giỏ (cộng mọi size / tuỳ chọn / ghi chú) — số hiện trên thẻ món */
export const qtyOfProduct = (lines: CartLine[], productId: string) =>
  lines.reduce((n, l) => (l.productId === productId ? n + l.qty : n), 0);

export type UpdateResult = 'updated' | 'merged' | 'unavailable' | 'missing';

/**
 * Sửa 1 dòng đã có trong giỏ (đổi size / đường / ghi chú / số lượng) — giữ nguyên vị trí dòng.
 * Sửa thành y hệt một dòng khác (cùng món + tuỳ chọn + ghi chú) → GỘP 2 dòng, cộng số lượng (tối đa MAX_QTY_PER_ITEM).
 */
export function updateLine(
  lines: CartLine[],
  oldKey: string,
  p: Product,
  qty: number,
  options: SelectedOption[],
  rawNote = '',
): { lines: CartLine[]; result: UpdateResult } {
  if (!p.available) return { lines, result: 'unavailable' };
  const idx = lines.findIndex((l) => l.key === oldKey);
  if (idx < 0) return { lines, result: 'missing' };
  const note = normalizeNote(rawNote);
  const key = cartLineKey(p.id, options, note);
  const q = Math.min(Math.max(1, Math.floor(qty)), MAX_QTY_PER_ITEM);
  const updated: CartLine = {
    ...lines[idx]!,
    key,
    name: p.name,
    price: p.price + optionsTotal(options),
    imageUrl: p.imageUrl,
    category: p.category,
    options,
    note,
    qty: q,
  };
  const other = lines.findIndex((l, i) => i !== idx && l.key === key);
  if (other < 0) return { lines: lines.map((l, i) => (i === idx ? updated : l)), result: 'updated' };
  const merged = { ...updated, qty: Math.min(updated.qty + lines[other]!.qty, MAX_QTY_PER_ITEM) };
  return { lines: lines.map((l, i) => (i === idx ? merged : l)).filter((_, i) => i !== other), result: 'merged' };
}
