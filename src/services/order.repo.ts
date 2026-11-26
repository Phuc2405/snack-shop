import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore/lite';
import { db, ready } from '@/lib/firebase';
import { AppError, toAppError } from '@/lib/errors';
import type { Order } from '@/types/domain';
import { buildOrderPayload, type OrderDraft } from '@/domain/orderPayload';
import { authService } from './auth.service';
import { toOrder } from './mappers';

/** Repository phía KHÁCH cho collection `orders` (phía nhân viên: orders.live.ts). */

/** Tạo sẵn id đơn ở client → bấm lại / mạng chập chờn gửi lại vẫn chỉ ra 1 đơn (idempotency key). */
export const newOrderId = () => doc(collection(db(), 'orders')).id;

export const orderRepo = {
  async place(orderId: string, draft: OrderDraft): Promise<Order> {
    const uid = await authService.ensureGuest();
    await ready();
    const ref = doc(db(), 'orders', orderId);
    const payload = buildOrderPayload(draft, uid);
    const batch = writeBatch(db());
    batch.set(ref, { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    // Rules bắt buộc ghi throttle/{uid} trong cùng batch, tối đa 1 lần/60 giây → chống spam đơn
    batch.set(doc(db(), 'throttle', uid), { lastOrderAt: serverTimestamp() });
    try {
      await batch.commit();
    } catch (e) {
      const err = toAppError(e);
      if (err.code === 'permission-denied') {
        // Có thể lần gửi trước đã thành công nhưng mất phản hồi → đơn đã tồn tại thì coi như xong.
        const existing = await getDoc(ref).catch(() => null);
        if (existing?.exists()) return toOrder(existing.id, existing.data());
        throw new AppError(
          'order-rejected',
          'Chưa gửi được đơn. Có thể tiệm vừa tạm đóng nhận đơn, hoặc bạn vừa đặt một đơn cách đây chưa tới 1 phút. Vui lòng thử lại sau ít phút.',
          e,
        );
      }
      throw err;
    }
    return { ...payload, id: orderId, createdAt: new Date(), updatedAt: new Date() };
  },

  /** Đơn của khách trên thiết bị này (không tự tạo phiên ẩn danh nếu chưa từng đặt). */
  async listMine(): Promise<Order[]> {
    try {
      const user = await authService.currentUser();
      if (!user) return [];
      await ready();
      const q = query(
        collection(db(), 'orders'),
        where('customerUid', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(20),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => toOrder(d.id, d.data()));
    } catch (e) {
      throw toAppError(e);
    }
  },

  async getMine(id: string): Promise<Order | null> {
    try {
      const user = await authService.currentUser();
      if (!user) return null;
      await ready();
      const snap = await getDoc(doc(db(), 'orders', id));
      return snap.exists() ? toOrder(snap.id, snap.data()) : null;
    } catch (e) {
      const err = toAppError(e);
      if (err.code === 'permission-denied') return null; // đơn không phải của mình → coi như không có
      throw err;
    }
  },

  async cancelMine(id: string): Promise<void> {
    try {
      await ready();
      await updateDoc(doc(db(), 'orders', id), {
        status: 'cancelled',
        cancelledBy: 'customer',
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      const err = toAppError(e);
      if (err.code === 'permission-denied') {
        throw new AppError('cannot-cancel', 'Tiệm đã nhận đơn nên không tự huỷ được nữa. Vui lòng gọi hotline.', e);
      }
      throw err;
    }
  },
};
