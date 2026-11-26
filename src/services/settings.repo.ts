import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore/lite';
import { db, ready } from '@/lib/firebase';
import { toAppError } from '@/lib/errors';
import type { ShopSettings } from '@/types/domain';
import { toSettings } from './mappers';

/** Repository: doc duy nhất `settings/shop`. */
export const settingsRepo = {
  async get(): Promise<ShopSettings> {
    try {
      await ready();
      const snap = await getDoc(doc(db(), 'settings', 'shop'));
      return toSettings(snap.exists() ? snap.data() : undefined);
    } catch (e) {
      throw toAppError(e);
    }
  },

  async save(s: ShopSettings): Promise<void> {
    try {
      await ready();
      // Ghi đè cả doc (không merge) để field lạ do sửa tay trong Console không làm rules từ chối
      await setDoc(doc(db(), 'settings', 'shop'), { ...s, updatedAt: serverTimestamp() });
    } catch (e) {
      throw toAppError(e);
    }
  },
};
