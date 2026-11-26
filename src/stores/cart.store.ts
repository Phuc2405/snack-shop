import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Product } from '@/types/domain';
import {
  addLine,
  countItems,
  reconcileLines,
  setLineQty,
  subtotalOf,
  type AddResult,
  type CartChange,
  type CartLine,
} from '@/domain/cart';
import { autoId } from '@/lib/id';

const KEY = 'nb-cart';

interface CartState {
  lines: CartLine[];
  /**
   * Id đơn sắp tạo (idempotency key). Giữ nguyên khi khách bấm "Đặt" lại sau lỗi mạng → không ra 2 đơn.
   * Đổi mới mỗi khi giỏ thay đổi hoặc sau khi đặt thành công.
   */
  pendingOrderId: string;
  add: (p: Product, qty?: number) => AddResult;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  reconcile: (menu: Product[]) => CartChange[];
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      pendingOrderId: autoId(),
      add: (p, qty = 1) => {
        const { lines, result } = addLine(get().lines, p, qty);
        if (result === 'added' || result === 'capped') set({ lines, pendingOrderId: autoId() });
        return result;
      },
      setQty: (productId, qty) => set({ lines: setLineQty(get().lines, productId, qty), pendingOrderId: autoId() }),
      remove: (productId) => set({ lines: get().lines.filter((l) => l.productId !== productId), pendingOrderId: autoId() }),
      clear: () => set({ lines: [], pendingOrderId: autoId() }),
      reconcile: (menu) => {
        if (get().lines.length === 0) return [];
        const { lines, changes } = reconcileLines(get().lines, menu);
        if (changes.length) set({ lines, pendingOrderId: autoId() });
        else set({ lines });
        return changes;
      },
    }),
    {
      name: KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines, pendingOrderId: s.pendingOrderId }),
    },
  ),
);

// Đồng bộ giỏ giữa các tab đang mở cùng lúc
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) void useCartStore.persist.rehydrate();
  });
}

export const selectCount = (s: CartState) => countItems(s.lines);
export const selectSubtotal = (s: CartState) => subtotalOf(s.lines);
