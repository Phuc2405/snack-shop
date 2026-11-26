import { getRealtimeDb, ready } from '@/lib/firebase';
import { toAppError, type AppError } from '@/lib/errors';
import type { Order, OrderStatus } from '@/types/domain';
import { ACTIVE_STATUSES, canTransition } from '@/domain/orderStatus';
import { toOrder } from './mappers';

/**
 * Phía NHÂN VIÊN: nghe đơn hàng realtime (Observer pattern qua onSnapshot).
 * Chỉ file này import `firebase/firestore` bản đầy đủ → khách không phải tải code realtime.
 */

type Unsub = () => void;

/** Đơn đang xử lý + đơn xong/huỷ trong hôm nay. Gọi lại `onChange` mỗi khi có thay đổi. */
export function subscribeOrders(onChange: (orders: Order[]) => void, onError: (e: AppError) => void): Unsub {
  let unsubs: Unsub[] = [];
  let cancelled = false;
  let active: Order[] = [];
  let today: Order[] = [];
  const emit = () => {
    const map = new Map<string, Order>();
    for (const o of [...today, ...active]) map.set(o.id, o);
    onChange([...map.values()].sort((a, b) => (b.createdAt?.getTime() ?? Infinity) - (a.createdAt?.getTime() ?? Infinity)));
  };

  void (async () => {
    try {
      await ready();
      const rt = await getRealtimeDb();
      const { collection, query, where, orderBy, limit, onSnapshot, Timestamp } = await import('firebase/firestore');
      if (cancelled) return;
      const col = collection(rt, 'orders');
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      unsubs = [
        onSnapshot(
          query(col, where('status', 'in', [...ACTIVE_STATUSES]), orderBy('createdAt', 'desc'), limit(200)),
          (snap) => {
            active = snap.docs.map((d) => toOrder(d.id, d.data({ serverTimestamps: 'estimate' })));
            emit();
          },
          (e) => onError(toAppError(e)),
        ),
        onSnapshot(
          query(col, where('createdAt', '>=', Timestamp.fromDate(startOfDay)), orderBy('createdAt', 'desc'), limit(300)),
          (snap) => {
            today = snap.docs.map((d) => toOrder(d.id, d.data({ serverTimestamps: 'estimate' })));
            emit();
          },
          (e) => onError(toAppError(e)),
        ),
      ];
    } catch (e) {
      onError(toAppError(e));
    }
  })();

  return () => {
    cancelled = true;
    unsubs.forEach((u) => u());
  };
}

export async function setOrderStatus(order: Order, to: OrderStatus, staffNote?: string): Promise<void> {
  if (!canTransition(order.status, to)) throw toAppError({ code: 'permission-denied' });
  try {
    const rt = await getRealtimeDb();
    const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
    await updateDoc(doc(rt, 'orders', order.id), {
      status: to,
      updatedAt: serverTimestamp(),
      ...(to === 'cancelled' ? { cancelledBy: 'shop' } : {}),
      ...(staffNote !== undefined ? { staffNote } : {}),
    });
  } catch (e) {
    throw toAppError(e);
  }
}

/** Lịch sử: đơn trong khoảng ngày (cho trang thống kê). Đọc 1 lần, không realtime. */
export async function listOrdersBetween(from: Date, to: Date): Promise<Order[]> {
  try {
    await ready();
    const rt = await getRealtimeDb();
    const { collection, query, where, orderBy, limit, getDocs, Timestamp } = await import('firebase/firestore');
    const q = query(
      collection(rt, 'orders'),
      where('createdAt', '>=', Timestamp.fromDate(from)),
      where('createdAt', '<', Timestamp.fromDate(to)),
      orderBy('createdAt', 'desc'),
      limit(500),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => toOrder(d.id, d.data()));
  } catch (e) {
    throw toAppError(e);
  }
}
