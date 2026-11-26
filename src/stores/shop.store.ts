import { create } from 'zustand';
import type { Product, ShopSettings } from '@/types/domain';
import { DEFAULT_SETTINGS } from '@/config/catalog';
import { productRepo } from '@/services/product.repo';
import { settingsRepo } from '@/services/settings.repo';
import { isFirebaseConfigured } from '@/lib/firebase';
import type { AppError } from '@/lib/errors';
import { toAppError } from '@/lib/errors';
import { useCartStore } from './cart.store';
import { toast } from './toast.store';

/**
 * Menu + cấu hình tiệm, dùng chung toàn app.
 * Stale-while-revalidate: hiện ngay bản cache trong localStorage (lần mở sau thấy menu tức thì),
 * đồng thời tải bản mới; tải xong thì đối chiếu lại giỏ hàng.
 */

const CACHE_KEY = 'nb-shop-cache-v1';
const CACHE_MAX_AGE = 1000 * 60 * 60 * 24; // 1 ngày — cũ hơn thì bỏ, tránh hiện giá quá cũ

interface Cache {
  at: number;
  products: Product[];
  settings: ShopSettings;
}

function readCache(): Cache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Cache;
    if (Date.now() - c.at > CACHE_MAX_AGE || !Array.isArray(c.products)) return null;
    return { ...c, products: c.products.map((p) => ({ ...p, updatedAt: null })) };
  } catch {
    return null;
  }
}

function writeCache(products: Product[], settings: ShopSettings) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), products, settings }));
  } catch {
    /* hết dung lượng / chế độ riêng tư — bỏ qua */
  }
}

type Status = 'idle' | 'loading' | 'ready' | 'error';

interface ShopState {
  products: Product[];
  settings: ShopSettings;
  status: Status;
  /** true khi đang hiện dữ liệu cache, bản mới chưa về */
  stale: boolean;
  error: AppError | null;
  load: (opts?: { silent?: boolean }) => Promise<void>;
  /** Cập nhật cục bộ sau khi nhân viên sửa (không cần tải lại cả menu) */
  setProducts: (fn: (list: Product[]) => Product[]) => void;
  setSettings: (s: ShopSettings) => void;
}

const cached = typeof window !== 'undefined' ? readCache() : null;
let inflight: Promise<void> | null = null;

export const useShopStore = create<ShopState>()((set, get) => ({
  products: cached?.products ?? [],
  settings: cached?.settings ?? DEFAULT_SETTINGS,
  status: cached ? 'ready' : 'idle',
  stale: Boolean(cached),
  error: null,

  load: (opts) => {
    if (!isFirebaseConfigured) {
      set({ status: 'error', error: toAppError({ code: 'NOT_CONFIGURED' }), stale: false });
      return Promise.resolve();
    }
    // Gộp các lần gọi trùng (nhiều component cùng mount) thành 1 request
    inflight ??= (async () => {
      if (get().status !== 'ready') set({ status: 'loading' });
      try {
        const [products, settings] = await Promise.all([productRepo.list(), settingsRepo.get()]);
        set({ products, settings, status: 'ready', stale: false, error: null });
        writeCache(products, settings);
        const changes = useCartStore.getState().reconcile(products);
        if (changes.length && !opts?.silent) {
          const removed = changes.filter((c) => c.kind === 'removed').map((c) => c.name);
          const repriced = changes.filter((c) => c.kind === 'price_changed').map((c) => c.name);
          if (removed.length) toast.info(`Đã bỏ khỏi giỏ vì tạm hết: ${removed.join(', ')}`);
          if (repriced.length) toast.info(`Giá vừa cập nhật: ${repriced.join(', ')}`);
        }
      } catch (e) {
        const err = toAppError(e);
        // Có cache thì vẫn cho xem (offline), chỉ báo lỗi khi chưa có gì để hiện
        set(get().products.length ? { error: err, stale: true } : { status: 'error', error: err });
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  },

  setProducts: (fn) => {
    const products = fn(get().products);
    set({ products });
    writeCache(products, get().settings);
  },
  setSettings: (settings) => {
    set({ settings });
    writeCache(get().products, settings);
  },
}));
