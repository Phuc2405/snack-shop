import { create } from 'zustand';
import type { Product } from '@/types/domain';

interface UiState {
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  /** Món đang xem chi tiết (bottom sheet) */
  viewing: Product | null;
  view: (p: Product | null) => void;
  /** Tăng mỗi lần thêm món → icon giỏ "nảy" lên */
  bump: number;
  bumpCart: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  cartOpen: false,
  openCart: () => set({ cartOpen: true, viewing: null }),
  closeCart: () => set({ cartOpen: false }),
  viewing: null,
  view: (viewing) => set({ viewing }),
  bump: 0,
  bumpCart: () => set((s) => ({ bump: s.bump + 1 })),
}));
