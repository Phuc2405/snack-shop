import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mergeCarts } from '@/domain/cart';
import type { Account, Address } from '@/types/domain';
import type { ProfileValues } from '@/schemas/checkout.schema';
import { accountCartRepo } from '@/services/account.repo';
import { MAX_ADDRESSES } from '@/services/mappers';
import { isFirebaseConfigured } from '@/lib/firebase';
import { DEMO } from '@/lib/demo';
import { autoId } from '@/lib/id';
import { useCartStore } from './cart.store';

export interface LoginResult {
  /** Món trùng (cùng món + tuỳ chọn + ghi chú) → giữ số lượng lớn hơn */
  merged: number;
  /** Món mới từ giỏ lúc chưa đăng nhập */
  added: number;
  /** Bị bỏ vì giỏ đã đủ số dòng tối đa */
  dropped: number;
}

/** Tải lười service (firebase/auth ~ 60 KB) → trang menu không phải tải khi khách chưa đụng tới tài khoản. */
const svc = () => import('@/services/customer.service');

interface AccountState {
  /** 'idle' = chưa kiểm tra phiên đăng nhập (chưa tải firebase/auth) */
  status: 'idle' | 'loading' | 'ready';
  account: Account | null;
  addresses: Address[];
  defaultAddressId: string;
  /** Bắt đầu theo dõi phiên (gọi khi cần biết chắc: có gợi ý đăng nhập cũ, mở trang đặt món / đơn của tôi). */
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<LoginResult>;
  signUp: (email: string, password: string) => Promise<LoginResult>;
  signOut: () => Promise<void>;
  /** Thêm (không có id) hoặc sửa địa chỉ; luôn đặt làm mặc định. Trả về địa chỉ đã lưu. */
  saveAddress: (v: ProfileValues, id?: string) => Promise<Address>;
  removeAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string) => Promise<void>;
}

const sameAddr = (a: ProfileValues, b: ProfileValues) =>
  a.phone === b.phone && a.name.toLowerCase() === b.name.toLowerCase() && a.address.toLowerCase() === b.address.toLowerCase();

let initPromise: Promise<void> | null = null;

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => {
      /** Sau khi có tài khoản: gộp giỏ đã cất của tài khoản với giỏ đang chọn, tải sổ địa chỉ. */
      const afterLogin = async (account: Account): Promise<LoginResult> => {
        const r = mergeCarts(accountCartRepo.get(account.uid), useCartStore.getState().lines);
        useCartStore.getState().replace(r.lines);
        set({ account, status: 'ready' });
        await loadAddresses(account.uid);
        return { merged: r.merged, added: r.added, dropped: r.dropped };
      };

      const loadAddresses = async (uid: string) => {
        try {
          const { userRepo } = await svc();
          const d = await userRepo.get(uid);
          if (get().account?.uid === uid) set({ addresses: d.addresses, defaultAddressId: d.defaultAddressId });
        } catch {
          /* mất mạng: giữ bản đã lưu trên máy */
        }
      };

      const persistAddresses = async (addresses: Address[], defaultAddressId: string) => {
        const account = get().account;
        if (!account) throw new Error('Chưa đăng nhập');
        const prev = { addresses: get().addresses, defaultAddressId: get().defaultAddressId };
        set({ addresses, defaultAddressId }); // lạc quan, lỗi thì trả lại
        try {
          const { userRepo } = await svc();
          await userRepo.save(account.uid, { addresses, defaultAddressId });
        } catch (e) {
          set(prev);
          throw e;
        }
      };

      return {
        status: 'idle',
        account: null,
        addresses: [],
        defaultAddressId: '',

        init: () => {
          if (DEMO || !isFirebaseConfigured) {
            set({ status: 'ready', account: null });
            return Promise.resolve();
          }
          initPromise ??= (async () => {
            if (get().status === 'idle') set({ status: 'loading' });
            const { customerService } = await svc();
            await customerService.watch((account) => {
              const prev = get().account;
              if (!account) {
                if (prev) accountCartRepo.save(prev.uid, useCartStore.getState().lines);
                set({ account: null, addresses: [], defaultAddressId: '', status: 'ready' });
                return;
              }
              set({ account, status: 'ready' });
              if (prev?.uid !== account.uid) void loadAddresses(account.uid);
            });
          })();
          return initPromise;
        },

        signIn: async (email, password) => {
          const { customerService } = await svc();
          return afterLogin(await customerService.signIn(email, password));
        },

        signUp: async (email, password) => {
          const { customerService } = await svc();
          return afterLogin(await customerService.signUp(email, password));
        },

        signOut: async () => {
          const account = get().account;
          // Cất giỏ vào tài khoản → máy này về giỏ trống (máy dùng chung không lộ giỏ người trước)
          if (account) accountCartRepo.save(account.uid, useCartStore.getState().lines);
          const { customerService } = await svc();
          await customerService.signOut();
          set({ account: null, addresses: [], defaultAddressId: '' });
          useCartStore.getState().replace([]);
        },

        saveAddress: async (v, id) => {
          const { addresses } = get();
          const dup = addresses.find((a) => a.id !== id && sameAddr(a, v));
          if (dup) {
            await persistAddresses(addresses, dup.id);
            return dup;
          }
          const existing = id ? addresses.find((a) => a.id === id) : undefined;
          const saved: Address = { id: existing?.id ?? autoId().slice(0, 12), ...v };
          const next = existing
            ? addresses.map((a) => (a.id === id ? saved : a))
            : [saved, ...addresses].slice(0, MAX_ADDRESSES);
          await persistAddresses(next, saved.id);
          return saved;
        },

        removeAddress: async (id) => {
          const { addresses, defaultAddressId } = get();
          const next = addresses.filter((a) => a.id !== id);
          await persistAddresses(next, defaultAddressId === id ? (next[0]?.id ?? '') : defaultAddressId);
        },

        setDefaultAddress: async (id) => {
          await persistAddresses(get().addresses, id);
        },
      };
    },
    {
      name: 'nb-account',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // Chỉ là GỢI Ý để vẽ header ngay (không chờ tải firebase/auth); phiên thật được kiểm lại bằng init()
      partialize: (s) => ({ account: s.account, addresses: s.addresses, defaultAddressId: s.defaultAddressId }),
      migrate: () => ({ account: null, addresses: [], defaultAddressId: '' }) as never,
    },
  ),
);

/** Địa chỉ mặc định (null nếu chưa đăng nhập / sổ trống) */
export const selectDefaultAddress = (s: AccountState): Address | null =>
  s.account ? (s.addresses.find((a) => a.id === s.defaultAddressId) ?? s.addresses[0] ?? null) : null;

if (typeof window !== 'undefined') {
  // Đang đăng nhập: giỏ thay đổi thì cất luôn vào tài khoản (tắt trình duyệt rồi mở lại vẫn còn)
  useCartStore.subscribe((cart) => {
    const { account } = useAccountStore.getState();
    if (account) accountCartRepo.save(account.uid, cart.lines);
  });
  // Có gợi ý đã đăng nhập từ lần trước → kiểm tra phiên thật khi trình duyệt rảnh (không chặn lần vẽ đầu)
  if (useAccountStore.getState().account) {
    const start = () => void useAccountStore.getState().init();
    if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 3000 });
    else setTimeout(start, 1500);
  }
  // Đăng nhập / đăng xuất ở tab khác → tab này theo
  window.addEventListener('storage', (e) => {
    if (e.key === 'nb-account') void useAccountStore.persist.rehydrate();
  });
}
