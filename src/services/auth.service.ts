import { doc, getDoc } from 'firebase/firestore/lite';
import type { User } from 'firebase/auth';
import { db, getAuthLazy, ready } from '@/lib/firebase';
import { AppError, toAppError } from '@/lib/errors';
import type { StaffProfile } from '@/types/domain';

/** Mã lỗi cho biết phiên đăng nhập trên máy không còn dùng được (cần tạo phiên mới). */
const DEAD_SESSION = new Set([
  'auth/invalid-refresh-token',
  'auth/user-token-expired',
  'auth/user-not-found',
  'auth/user-disabled',
  'auth/invalid-user-token',
]);

/**
 * Hai kiểu người dùng, hai phiên riêng (xem lib/firebase.ts):
 *  - Khách (`guest`): đăng nhập ẨN DANH tự động khi đặt món, nhờ vậy rules biết đơn nào của ai
 *    và khách theo dõi được đơn của mình.
 *  - Nhân viên (`staff`): email + mật khẩu, và phải có doc `staff/{uid}` (tạo trong Firebase Console).
 */
export const authService = {
  /** Phiên khách hiện tại (không tự tạo). */
  async currentGuest(): Promise<User | null> {
    const auth = await getAuthLazy('guest');
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user) return null;
    try {
      await user.getIdToken();
      return user;
    } catch (e) {
      if (!DEAD_SESSION.has((e as { code?: string }).code ?? '')) throw e;
      const { signOut } = await import('firebase/auth');
      await signOut(auth); // phiên chết → coi như khách mới (đơn cũ không còn đọc được)
      return null;
    }
  },

  /**
   * Trả về uid của khách; tạo phiên ẩn danh nếu chưa có.
   * Phiên lưu trên máy có thể đã "chết" (tài khoản ẩn danh bị dọn / vô hiệu hoá trên server,
   * hoặc dữ liệu emulator bị xoá) → token không làm mới được. Khi đó đăng xuất và tạo phiên mới,
   * thay vì để khách kẹt ở lỗi không đặt được đơn.
   */
  async ensureGuest(): Promise<string> {
    try {
      const auth = await getAuthLazy('guest');
      await auth.authStateReady();
      const { signInAnonymously, signOut } = await import('firebase/auth');
      if (auth.currentUser) {
        try {
          await auth.currentUser.getIdToken();
          return auth.currentUser.uid;
        } catch (e) {
          if (!DEAD_SESSION.has((e as { code?: string }).code ?? '')) throw e;
          await signOut(auth);
        }
      }
      const cred = await signInAnonymously(auth);
      return cred.user.uid;
    } catch (e) {
      throw toAppError(e);
    }
  },

  async staffSignIn(email: string, password: string): Promise<StaffProfile> {
    try {
      const auth = await getAuthLazy('staff');
      const { signInWithEmailAndPassword, signOut } = await import('firebase/auth');
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const profile = await this.getStaff(cred.user);
      if (!profile) {
        await signOut(auth);
        throw new AppError('not-staff', 'Tài khoản này chưa được cấp quyền quản lý tiệm.');
      }
      return profile;
    } catch (e) {
      throw toAppError(e);
    }
  },

  async getStaff(user: User | null): Promise<StaffProfile | null> {
    if (!user || user.isAnonymous) return null;
    await ready();
    const snap = await getDoc(doc(db('staff'), 'staff', user.uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    return { uid: user.uid, name: typeof d.name === 'string' ? d.name : '', email: user.email ?? '' };
  },

  async staffSignOut(): Promise<void> {
    const auth = await getAuthLazy('staff');
    const { signOut } = await import('firebase/auth');
    await signOut(auth);
  },
};
