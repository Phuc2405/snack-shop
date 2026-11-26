import { create } from 'zustand';
import type { StaffProfile } from '@/types/domain';
import { authService } from '@/services/auth.service';
import { getAuthLazy, isFirebaseConfigured } from '@/lib/firebase';

type Status = 'idle' | 'loading' | 'ready';

interface StaffState {
  status: Status;
  staff: StaffProfile | null;
  /** Gọi 1 lần khi vào khu quản lý; trả về hàm huỷ đăng ký. */
  init: () => () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

/** Bộ đếm thế hệ: kết quả cũ về muộn (đổi tài khoản nhanh) bị bỏ qua. */
let gen = 0;

export const useStaffStore = create<StaffState>()((set) => ({
  status: 'idle',
  staff: null,

  init: () => {
    if (!isFirebaseConfigured) {
      set({ status: 'ready' });
      return () => {};
    }
    set({ status: 'loading' });
    let unsub: (() => void) | null = null;
    let disposed = false;
    void getAuthLazy().then(async (auth) => {
      const { onAuthStateChanged } = await import('firebase/auth');
      if (disposed) return;
      unsub = onAuthStateChanged(auth, async (user) => {
        const g = ++gen;
        try {
          const staff = await authService.getStaff(user);
          if (g === gen) set({ staff, status: 'ready' });
        } catch {
          if (g === gen) set({ staff: null, status: 'ready' });
        }
      });
    });
    return () => {
      disposed = true;
      unsub?.();
    };
  },

  signIn: async (email, password) => {
    const staff = await authService.staffSignIn(email, password);
    set({ staff, status: 'ready' });
  },

  signOut: async () => {
    await authService.signOut();
    set({ staff: null });
  },
}));
