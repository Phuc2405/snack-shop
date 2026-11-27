import { create } from 'zustand';
import type { Product, ShopSettings } from '@/types/domain';
import { DEFAULT_SETTINGS } from '@/config/catalog';
import { productRepo } from '@/services/product.repo';
import { settingsRepo } from '@/services/settings.repo';
import { toProduct, toSettings } from '@/services/mappers';
import { isFirebaseConfigured } from '@/lib/firebase';
import { DEMO } from '@/lib/demo';
import type { AppError } from '@/lib/errors';
import { toAppError } from '@/lib/errors';
import { useCartStore } from './cart.store';
import { describeChanges, type CartChange } from '@/domain/cart';

export { describeChanges };
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
    const c = JSON.parse(raw) as { at?: unknown; products?: unknown; settings?: unknown };
    if (typeof c.at !== 'number' || Date.now() - c.at > CACHE_MAX_AGE || !Array.isArray(c.products)) return null;
    // Cache có thể do bản app CŨ ghi (vd. trước khi món có `options`) → chuẩn hoá lại như dữ liệu từ Firestore,
    // không thì thiếu field làm vỡ trang chủ trước khi kịp tải menu mới.
    const products = c.products
      .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object' && typeof p.id === 'string')
      .map((p) => toProduct(p.id as string, p))
      .filter((p) => !p.hidden);
    const settings = c.settings && typeof c.settings === 'object' ? toSettings(c.settings as Record<string, unknown>) : DEFAULT_SETTINGS;
    return { at: c.at, products, settings };
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
  /** Lúc tải menu thành công gần nhất (ms) — để biết menu trên máy đã cũ chưa */
  loadedAt: number;
  /** Thay đổi giỏ ở lần đối chiếu gần nhất (món vừa tạm hết / đổi giá) — trang Đặt món hiện rõ cho khách */
  lastChanges: CartChange[];
  /** Tải menu + cấu hình mới, đối chiếu giỏ. Trả về các thay đổi của giỏ. */
  load: (opts?: { silent?: boolean }) => Promise<CartChange[]>;
  /** Tải lại nếu menu trên máy cũ hơn `maxAgeMs` (mở lại tab, quay lại trang…) */
  refreshIfStale: (maxAgeMs?: number) => Promise<void>;
  /** Kiểm tra lại 1 món ngay trên server (vừa thêm vào giỏ). false = món đã tạm hết / bị ẩn / bị xoá. */
  verifyProduct: (id: string) => Promise<boolean>;
  clearChanges: () => void;
  /** Cập nhật cục bộ sau khi nhân viên sửa (không cần tải lại cả menu) */
  setProducts: (fn: (list: Product[]) => Product[]) => void;
  setSettings: (s: ShopSettings) => void;
}

const cached = typeof window !== 'undefined' ? readCache() : null;
let inflight: Promise<CartChange[]> | null = null;
/** Kết quả kiểm tra từng món gần đây — bấm "+" liên tục không đọc lại server mỗi lần */
const verifiedAt = new Map<string, number>();
const VERIFY_TTL = 30_000;

export const useShopStore = create<ShopState>()((set, get) => ({
  products: cached?.products ?? [],
  settings: cached?.settings ?? DEFAULT_SETTINGS,
  status: cached ? 'ready' : 'idle',
  stale: Boolean(cached),
  error: null,
  loadedAt: 0,
  lastChanges: [],

  load: (opts) => {
    if (!isFirebaseConfigured && !DEMO) {
      set({ status: 'error', error: toAppError({ code: 'NOT_CONFIGURED' }), stale: false });
      return Promise.resolve([]);
    }
    // Gộp các lần gọi trùng (nhiều component cùng mount) thành 1 request
    inflight ??= (async () => {
      if (get().status !== 'ready') set({ status: 'loading' });
      try {
        const [all, settings] = await Promise.all([productRepo.list(), settingsRepo.get()]);
        const products = all.filter((p) => !p.hidden); // rules đã lọc; lọc thêm cho chắc (cache, dữ liệu cũ)
        set({ products, settings, status: 'ready', stale: false, error: null, loadedAt: Date.now() });
        writeCache(products, settings);
        const changes = useCartStore.getState().reconcile(products);
        if (changes.length) set({ lastChanges: changes });
        if (changes.length && !opts?.silent) toast.info(describeChanges(changes));
        return changes;
      } catch (e) {
        const err = toAppError(e);
        // Có cache thì vẫn cho xem (offline), chỉ báo lỗi khi chưa có gì để hiện
        set(get().products.length ? { error: err, stale: true } : { status: 'error', error: err });
        return [];
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  },

  refreshIfStale: async (maxAgeMs = 60_000) => {
    if (DEMO || get().status === 'loading') return;
    if (Date.now() - get().loadedAt > maxAgeMs) await get().load();
  },

  verifyProduct: async (id) => {
    if (DEMO || !isFirebaseConfigured) return true;
    const at = verifiedAt.get(id);
    if (at && Date.now() - at < VERIFY_TTL) return true;
    try {
      const fresh = await productRepo.get(id);
      if (fresh && fresh.available && !fresh.hidden) {
        verifiedAt.set(id, Date.now());
        // Giá / tuỳ chọn có thể vừa đổi → cập nhật thẻ món + giỏ theo bản mới
        get().setProducts((list) => list.map((p) => (p.id === id ? fresh : p)));
        const changes = useCartStore.getState().reconcile(get().products);
        if (changes.length) toast.info(describeChanges(changes));
        return true;
      }
      // Tạm hết → thẻ món hiện "Tạm hết"; bị ẩn / xoá → biến khỏi menu. Tự báo khách (mọi đường bấm đều có)
      const name = get().products.find((p) => p.id === id)?.name ?? 'Món này';
      const hadInCart = useCartStore.getState().lines.some((l) => l.productId === id);
      toast.error(`Xin lỗi, “${name}” vừa hết món${hadInCart ? ', mình đã bỏ khỏi giỏ' : ''}.`);
      get().setProducts((list) => (fresh ? list.map((p) => (p.id === id ? { ...p, available: false } : p)) : list.filter((p) => p.id !== id)));
      useCartStore.getState().reconcile(get().products);
      return false;
    } catch {
      return true; // mất mạng: không chặn khách, bước đặt món sẽ kiểm lại
    }
  },

  clearChanges: () => set({ lastChanges: [] }),

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

