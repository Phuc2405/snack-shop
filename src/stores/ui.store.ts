import { create } from 'zustand';
import type { Product } from '@/types/domain';

export type LoginMode = 'signin' | 'signup' | 'reset';

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
  /** Hộp đăng nhập / tạo tài khoản / quên mật khẩu; `afterLogin` chạy sau khi đăng nhập xong */
  loginOpen: boolean;
  loginMode: LoginMode;
  loginReason: string;
  afterLogin: (() => void) | null;
  openLogin: (opts?: { reason?: string; then?: () => void; mode?: LoginMode }) => void;
  closeLogin: () => void;
  /** Sổ địa chỉ nhận hàng của tài khoản */
  profilesOpen: boolean;
  openProfiles: () => void;
  closeProfiles: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  cartOpen: false,
  openCart: () => set({ cartOpen: true, viewing: null }),
  closeCart: () => set({ cartOpen: false }),
  viewing: null,
  view: (viewing) => set({ viewing }),
  bump: 0,
  bumpCart: () => set((s) => ({ bump: s.bump + 1 })),
  loginOpen: false,
  loginMode: 'signin',
  loginReason: '',
  afterLogin: null,
  openLogin: (opts) =>
    set({
      loginOpen: true,
      cartOpen: false,
      viewing: null,
      loginMode: opts?.mode ?? 'signin',
      loginReason: opts?.reason ?? '',
      afterLogin: opts?.then ?? null,
    }),
  closeLogin: () => set({ loginOpen: false, afterLogin: null }),
  profilesOpen: false,
  openProfiles: () => set({ profilesOpen: true }),
  closeProfiles: () => set({ profilesOpen: false }),
}));
