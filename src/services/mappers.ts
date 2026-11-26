import type { Category, OptionGroup, Order, OrderItem, OrderStatus, Product, SelectedOption, ShopSettings } from '@/types/domain';
import { DEFAULT_SETTINGS } from '@/config/catalog';

/**
 * Adapter: doc Firestore (dữ liệu "ngoài", có thể thiếu field / sai kiểu do ai đó sửa tay
 * trong Console) → object domain an toàn. UI không bao giờ đọc dữ liệu thô từ Firestore.
 */

type Raw = Record<string, unknown>;

const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const bool = (v: unknown, d = false) => (typeof v === 'boolean' ? v : d);
/** Timestamp (cả bản lite lẫn đầy đủ đều có toDate) → Date */
const date = (v: unknown): Date | null =>
  v && typeof (v as { toDate?: unknown }).toDate === 'function' ? (v as { toDate: () => Date }).toDate() : null;

const CATEGORIES: Category[] = ['drink', 'cake', 'snack', 'combo'];
const STATUSES: OrderStatus[] = ['new', 'confirmed', 'preparing', 'delivering', 'done', 'cancelled'];

const arr = (v: unknown): Raw[] => (Array.isArray(v) ? v.filter((x): x is Raw => !!x && typeof x === 'object') : []);

function toOptionGroups(v: unknown): OptionGroup[] {
  return arr(v)
    .map((g, i) => ({
      id: str(g.id, `g${i}`),
      name: str(g.name, 'Tuỳ chọn'),
      multi: bool(g.multi),
      required: bool(g.required),
      choices: arr(g.choices)
        .map((c, j) => ({ id: str(c.id, `c${j}`), name: str(c.name), price: Math.max(0, num(c.price)) }))
        .filter((c) => c.name),
    }))
    .filter((g) => g.choices.length > 0);
}

function toSelected(v: unknown): SelectedOption[] {
  return arr(v).map((o) => ({ group: str(o.group), choice: str(o.choice), name: str(o.name), price: num(o.price) }));
}

export function toProduct(id: string, d: Raw): Product {
  const category = CATEGORIES.includes(d.category as Category) ? (d.category as Category) : 'snack';
  return {
    id,
    name: str(d.name, 'Món chưa đặt tên'),
    description: str(d.description),
    price: num(d.price),
    category,
    imageUrl: str(d.imageUrl),
    available: bool(d.available, true),
    featured: bool(d.featured),
    sortOrder: num(d.sortOrder, 999),
    options: toOptionGroups(d.options),
    updatedAt: date(d.updatedAt),
  };
}

export function toSettings(d: Raw | undefined): ShopSettings {
  if (!d) return DEFAULT_SETTINGS;
  return {
    name: str(d.name, DEFAULT_SETTINGS.name),
    tagline: str(d.tagline, DEFAULT_SETTINGS.tagline),
    hotline: str(d.hotline),
    address: str(d.address),
    openHours: str(d.openHours, DEFAULT_SETTINGS.openHours),
    isOpen: bool(d.isOpen),
    deliveryFee: num(d.deliveryFee, DEFAULT_SETTINGS.deliveryFee),
    freeShipFrom: num(d.freeShipFrom),
    minOrder: num(d.minOrder),
    announcement: str(d.announcement),
    bankBin: str(d.bankBin),
    bankAccount: str(d.bankAccount),
    bankAccountName: str(d.bankAccountName),
  };
}

function toItem(v: unknown): OrderItem {
  const d = (v ?? {}) as Raw;
  return { productId: str(d.productId), name: str(d.name), price: num(d.price), qty: num(d.qty, 1), options: toSelected(d.options), note: str(d.note) };
}

export function toOrder(id: string, d: Raw): Order {
  const c = (d.customer ?? {}) as Raw;
  return {
    id,
    code: str(d.code, id.slice(0, 6).toUpperCase()),
    customerUid: str(d.customerUid),
    customer: { name: str(c.name), phone: str(c.phone), address: str(c.address), note: str(c.note) },
    fulfillment: d.fulfillment === 'pickup' ? 'pickup' : 'delivery',
    items: Array.isArray(d.items) ? d.items.map(toItem) : [],
    itemCount: num(d.itemCount),
    subtotal: num(d.subtotal),
    deliveryFee: num(d.deliveryFee),
    total: num(d.total),
    status: STATUSES.includes(d.status as OrderStatus) ? (d.status as OrderStatus) : 'new',
    paymentMethod: d.paymentMethod === 'transfer' ? 'transfer' : 'cod',
    paid: bool(d.paid),
    cancelledBy: d.cancelledBy === 'customer' || d.cancelledBy === 'shop' ? d.cancelledBy : undefined,
    staffNote: typeof d.staffNote === 'string' ? d.staffNote : undefined,
    createdAt: date(d.createdAt),
    updatedAt: date(d.updatedAt),
  };
}

export const sortProducts = (list: Product[]) =>
  [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'vi'));
