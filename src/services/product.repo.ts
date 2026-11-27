import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore/lite';
import { db, ready } from '@/lib/firebase';
import { toAppError } from '@/lib/errors';
import type { Product, ProductInput } from '@/types/domain';
import { sortProducts, toProduct } from './mappers';
import { SAMPLE_MENU } from '@/config/catalog';
import { DEMO } from '@/lib/demo';

/** Repository: mọi thao tác với collection `products`. Đọc bằng phiên khách (công khai), ghi bằng phiên nhân viên. */

const MENU_LIMIT = 200; // khớp `request.query.limit <= 200` trong firestore.rules

export const productRepo = {
  /** Menu cho khách: chỉ món đang hiện (rules từ chối truy vấn thiếu where hidden == false). */
  async list(): Promise<Product[]> {
    if (DEMO) return sortProducts(SAMPLE_MENU.filter((p) => !p.hidden).map((p, i) => ({ ...p, id: `demo-${i}`, updatedAt: null })));
    try {
      await ready();
      const snap = await getDocs(query(collection(db(), 'products'), where('hidden', '==', false), limit(MENU_LIMIT)));
      return sortProducts(snap.docs.map((d) => toProduct(d.id, d.data())));
    } catch (e) {
      throw toAppError(e);
    }
  },

  /**
   * Đọc lại 1 món ngay trên server (khách vừa bấm thêm). null = món bị ẩn (rules từ chối) hoặc đã xoá.
   * Chỉ 1 lượt đọc, rẻ hơn tải lại cả menu.
   */
  async get(id: string): Promise<Product | null> {
    try {
      await ready();
      const snap = await getDoc(doc(db(), 'products', id));
      return snap.exists() ? toProduct(snap.id, snap.data()) : null;
    } catch (e) {
      const err = toAppError(e);
      if (err.code === 'permission-denied') return null; // món ẩn: rules không cho khách đọc
      throw err;
    }
  },

  /** Trang quản lý: mọi món kể cả món ẩn (phiên nhân viên). */
  async listAll(): Promise<Product[]> {
    try {
      await ready();
      const snap = await getDocs(query(collection(db('staff'), 'products'), limit(MENU_LIMIT)));
      return sortProducts(snap.docs.map((d) => toProduct(d.id, d.data())));
    } catch (e) {
      throw toAppError(e);
    }
  },

  async create(input: ProductInput): Promise<string> {
    try {
      await ready();
      const ref = await addDoc(collection(db('staff'), 'products'), {
        ...input,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ref.id;
    } catch (e) {
      throw toAppError(e);
    }
  },

  async update(id: string, patch: Partial<ProductInput>): Promise<void> {
    try {
      await ready();
      await updateDoc(doc(db('staff'), 'products', id), { ...patch, updatedAt: serverTimestamp() });
    } catch (e) {
      throw toAppError(e);
    }
  },

  async remove(id: string): Promise<void> {
    try {
      await ready();
      await deleteDoc(doc(db('staff'), 'products', id));
    } catch (e) {
      throw toAppError(e);
    }
  },

  /** Tạo menu mẫu khi DB còn trống (1 batch → hoặc tạo hết, hoặc không tạo gì). */
  async seedSample(): Promise<void> {
    try {
      await ready();
      const batch = writeBatch(db('staff'));
      for (const p of SAMPLE_MENU) {
        batch.set(doc(collection(db('staff'), 'products')), { ...p, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
      await batch.commit();
    } catch (e) {
      throw toAppError(e);
    }
  },
};
