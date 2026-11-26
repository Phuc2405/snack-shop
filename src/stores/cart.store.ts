import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Product, SelectedOption } from '@/types/domain';
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
  add: (p: Product, qty?: number, options?: SelectedOption[], note?: string) => AddResult;
  /** Thay toàn bộ giỏ (đăng nhập: giỏ đã gộp; đăng xuất: giỏ trống) */
  replace: (lines: CartLine[]) => void;
  /** key = CartLine.key (món + tuỳ chọn) */
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  reconcile: (menu: Product[]) => CartChange[];
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      pendingOrderId: autoId(),
      add: (p, qty = 1, options = [], note = '') => {
        const { lines, result } = addLine(get().lines, p, qty, options, note);
        if (result === 'added' || result === 'capped') set({ lines, pendingOrderId: autoId() });
        return result;
      },
      setQty: (key, qty) => set({ lines: setLineQty(get().lines, key, qty), pendingOrderId: autoId() }),
      remove: (key) => set({ lines: get().lines.filter((l) => l.key !== key), pendingOrderId: autoId() }),
      clear: () => set({ lines: [], pendingOrderId: autoId() }),
      replace: (lines) => set({ lines, pendingOrderId: autoId() }),
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
      version: 3,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines, pendingOrderId: s.pendingOrderId }),
      // v1 (trước khi có tuỳ chọn món): dòng chưa có key/options → bổ sung; v2: chưa có ghi chú món. Giỏ cũ không mất
      migrate: (persisted, version) => {
        const st = (persisted ?? {}) as { lines?: Partial<CartLine>[]; pendingOrderId?: string };
        if (version < 2) {
          st.lines = (st.lines ?? []).map((l) => ({ ...l, key: l.key ?? l.productId, options: l.options ?? [] }));
        }
        if (version < 3) st.lines = (st.lines ?? []).map((l) => ({ ...l, note: l.note ?? '' }));
        return st as Pick<CartState, 'lines' | 'pendingOrderId'>;
      },
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
