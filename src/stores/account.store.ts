import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mergeCarts } from '@/domain/cart';
import { accountRepo, MAX_PROFILES, type AccountRecord, type Profile } from '@/services/account.repo';
import type { ProfileValues } from '@/schemas/checkout.schema';
import { autoId } from '@/lib/id';
import { useCartStore } from './cart.store';

export interface LoginResult {
  /** Món trùng (cùng món + tuỳ chọn + ghi chú) → giữ số lượng lớn hơn */
  merged: number;
  /** Món mới từ giỏ lúc chưa đăng nhập */
  added: number;
  /** Bị bỏ vì giỏ đã đủ số dòng tối đa */
  dropped: number;
  returning: boolean;
}

interface AccountState {
  /** SĐT đăng nhập; null = chưa đăng nhập */
  phone: string | null;
  profiles: Profile[];
  activeId: string;
  login: (v: ProfileValues) => LoginResult;
  logout: () => void;
  /** Tạo mới (không có id) hoặc sửa thông tin người đặt; luôn chọn nó làm thông tin đang dùng */
  saveProfile: (v: ProfileValues, id?: string) => Profile;
  selectProfile: (id: string) => void;
  removeProfile: (id: string) => void;
}

type Who = Pick<Profile, 'name' | 'phone' | 'address'>;
const same = (a: Who, b: Who) =>
  a.phone === b.phone && a.name.toLowerCase() === b.name.toLowerCase() && a.address.toLowerCase() === b.address.toLowerCase();

/** Ghi sổ thông tin người đặt vào tài khoản (giữ nguyên giỏ đã lưu) */
function persistRecord(s: Pick<AccountState, 'phone' | 'profiles' | 'activeId'>) {
  if (!s.phone) return;
  const prev = accountRepo.get(s.phone);
  accountRepo.save({ phone: s.phone, profiles: s.profiles, activeId: s.activeId, cart: prev?.cart ?? useCartStore.getState().lines });
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      phone: null,
      profiles: [],
      activeId: '',

      login: (v) => {
        const saved = accountRepo.get(v.phone);
        const rec: AccountRecord = saved ?? { phone: v.phone, profiles: [], activeId: '', cart: [] };
        let profile = rec.profiles.find((p) => same(p, v));
        if (!profile) {
          profile = { id: autoId(), ...v };
          rec.profiles = [profile, ...rec.profiles].slice(0, MAX_PROFILES);
        }
        rec.activeId = profile.id;

        // Giỏ lúc chưa đăng nhập gộp vào giỏ đã lưu của tài khoản (xem mergeCarts)
        const r = mergeCarts(rec.cart ?? [], useCartStore.getState().lines);
        rec.cart = r.lines;
        accountRepo.save(rec);
        set({ phone: rec.phone, profiles: rec.profiles, activeId: rec.activeId });
        useCartStore.getState().replace(r.lines);
        return { merged: r.merged, added: r.added, dropped: r.dropped, returning: !!saved };
      },

      logout: () => {
        const { phone } = get();
        if (phone) {
          const rec = accountRepo.get(phone);
          if (rec) accountRepo.save({ ...rec, cart: useCartStore.getState().lines });
        }
        set({ phone: null, profiles: [], activeId: '' });
        // Giỏ của tài khoản đã cất vào tài khoản → máy này về giỏ trống
        useCartStore.getState().replace([]);
      },

      saveProfile: (v, id) => {
        const s = get();
        const existing = id ? s.profiles.find((p) => p.id === id) : undefined;
        const dup = s.profiles.find((p) => p.id !== id && same(p, v));
        const profile: Profile = dup ?? { id: existing?.id ?? autoId(), ...v };
        const profiles = dup
          ? s.profiles
          : existing
            ? s.profiles.map((p) => (p.id === id ? profile : p))
            : [profile, ...s.profiles].slice(0, MAX_PROFILES);
        set({ profiles, activeId: profile.id });
        persistRecord(get());
        return profile;
      },

      selectProfile: (id) => {
        set({ activeId: id });
        persistRecord(get());
      },

      removeProfile: (id) => {
        const s = get();
        const profiles = s.profiles.filter((p) => p.id !== id);
        const first = profiles[0];
        if (!first) return; // luôn giữ ít nhất 1
        set({ profiles, activeId: s.activeId === id ? first.id : s.activeId });
        persistRecord(get());
      },
    }),
    {
      name: 'nb-session',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ phone: s.phone, profiles: s.profiles, activeId: s.activeId }),
    },
  ),
);

/** Thông tin người đặt đang chọn (null nếu chưa đăng nhập) */
export const selectActiveProfile = (s: AccountState): Profile | null =>
  s.phone ? (s.profiles.find((p) => p.id === s.activeId) ?? s.profiles[0] ?? null) : null;

if (typeof window !== 'undefined') {
  // Đang đăng nhập: mọi thay đổi giỏ lưu luôn vào tài khoản (đăng xuất rồi đăng nhập lại vẫn còn)
  useCartStore.subscribe((cart) => {
    const { phone } = useAccountStore.getState();
    if (!phone) return;
    const rec = accountRepo.get(phone);
    if (rec) accountRepo.save({ ...rec, cart: cart.lines });
  });
  // Đăng nhập / đăng xuất ở tab khác → tab này theo
  window.addEventListener('storage', (e) => {
    if (e.key === 'nb-session') void useAccountStore.persist.rehydrate();
  });
}
