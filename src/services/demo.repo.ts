import type { Order, OrderStatus } from '@/types/domain';
import { buildOrderPayload, type OrderDraft } from '@/domain/orderPayload';
import { AppError } from '@/lib/errors';

/** Bản demo không có tài khoản: đơn gắn với chính trình duyệt này (localStorage) */
const currentUid = (): string | null => 'demo-device';

/**
 * Repository đơn hàng cho bản DEMO: lưu trong localStorage của khách, không gửi đi đâu.
 * Trạng thái tự tiến theo thời gian (như có nhân viên xử lý) để xem được cả luồng theo dõi đơn.
 */

const KEY = 'nb-demo-orders';

interface Stored {
  id: string;
  at: number;
  cancelled?: boolean;
  cancelReason?: string;
  cancelNote?: string;
  payload: ReturnType<typeof buildOrderPayload>;
}

/** Giây kể từ lúc đặt → trạng thái giả lập */
const TIMELINE: [number, OrderStatus][] = [
  [130, 'done'],
  [90, 'delivering'],
  [50, 'preparing'],
  [25, 'confirmed'],
  [0, 'new'],
];

function readAll(): Stored[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

const writeAll = (list: Stored[]) => localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)));

function toOrder(s: Stored, now = Date.now()): Order {
  const sec = (now - s.at) / 1000;
  const status: OrderStatus = s.cancelled ? 'cancelled' : (TIMELINE.find(([t]) => sec >= t)?.[1] ?? 'new');
  const confirmed = status !== 'new' && status !== 'cancelled';
  return {
    ...s.payload,
    id: s.id,
    status,
    // Giả lập tiệm xác nhận đã nhận chuyển khoản khi nhận đơn
    paid: s.payload.paymentMethod === 'transfer' && confirmed,
    cancelledBy: s.cancelled ? 'customer' : undefined,
    cancelReason: s.cancelReason,
    cancelNote: s.cancelNote,
    staffNote: status === 'delivering' ? 'Bản demo: shipper đang trên đường (giả lập).' : undefined,
    createdAt: new Date(s.at),
    updatedAt: new Date(now),
  };
}

export const demoOrderRepo = {
  async place(orderId: string, draft: OrderDraft): Promise<Order> {
    const list = readAll();
    const uid = currentUid();
    if (!uid) throw new AppError('unauthenticated', 'Bạn đăng nhập để đặt món nhé.');
    const existing = list.find((o) => o.id === orderId);
    if (existing) return toOrder(existing); // bấm lại → vẫn 1 đơn (giống bản thật)
    const stored: Stored = { id: orderId, at: Date.now(), payload: buildOrderPayload(draft, uid) };
    writeAll([stored, ...list]);
    await new Promise((r) => setTimeout(r, 400)); // cảm giác gửi đơn như thật
    return toOrder(stored);
  },
  async listMine(): Promise<Order[]> {
    const uid = currentUid();
    return uid ? readAll().filter((s) => s.payload.customerUid === uid).map((s) => toOrder(s)) : [];
  },
  async getMine(id: string): Promise<Order | null> {
    const s = readAll().find((o) => o.id === id && o.payload.customerUid === currentUid());
    return s ? toOrder(s) : null;
  },
  async cancelMine(id: string, reason: string, note = ''): Promise<void> {
    const list = readAll();
    const s = list.find((o) => o.id === id);
    if (!s || toOrder(s).status !== 'new') {
      throw new AppError('cannot-cancel', 'Tiệm đã nhận đơn nên không tự huỷ được nữa. Vui lòng gọi hotline.');
    }
    s.cancelled = true;
    s.cancelReason = reason;
    s.cancelNote = note || undefined;
    writeAll(list);
  },
};
