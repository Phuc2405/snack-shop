import { create } from 'zustand';
import type { Product } from '@/types/domain';
import { productRepo } from '@/services/product.repo';
import { toAppError, type AppError } from '@/lib/errors';
import { useShopStore } from './shop.store';

/**
 * Menu ĐẦY ĐỦ cho trang quản lý (kể cả món ẩn), đọc bằng phiên nhân viên.
 * Tách khỏi shop.store (menu khách, chỉ món đang hiện, có cache localStorage) để món ẩn
 * không bao giờ lọt vào trang bán hàng hay cache trên máy.
 */
interface AdminMenuState {
  products: Product[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: AppError | null;
  load: () => Promise<void>;
  setProducts: (fn: (list: Product[]) => Product[]) => void;
}

export const useAdminMenu = create<AdminMenuState>()((set, get) => ({
  products: [],
  status: 'idle',
  error: null,
  load: async () => {
    if (get().status !== 'ready') set({ status: 'loading' });
    try {
      set({ products: await productRepo.listAll(), status: 'ready', error: null });
    } catch (e) {
      set({ status: get().products.length ? 'ready' : 'error', error: toAppError(e) });
    }
  },
  setProducts: (fn) => {
    set({ products: fn(get().products) });
    // Trang bán hàng tải lại menu ở lần xem tới (không giữ bản cũ đã sửa)
    void useShopStore.getState().load({ silent: true });
  },
}));
