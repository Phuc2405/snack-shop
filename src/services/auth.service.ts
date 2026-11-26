import { doc, getDoc } from 'firebase/firestore/lite';
import type { User } from 'firebase/auth';
import { db, getAuthLazy, ready } from '@/lib/firebase';
import { AppError, toAppError } from '@/lib/errors';
import type { StaffProfile } from '@/types/domain';

/**
 * Hai kiểu người dùng:
 *  - Khách: đăng nhập ẨN DANH tự động khi đặt món (không cần tạo tài khoản), nhờ vậy
 *    rules biết đơn nào của ai và khách theo dõi được đơn của mình.
 *  - Nhân viên: email + mật khẩu, và phải có doc `staff/{uid}` (tạo trong Firebase Console).
 */
export const authService = {
  async currentUser(): Promise<User | null> {
    const auth = await getAuthLazy();
    await auth.authStateReady();
    return auth.currentUser;
  },

  /** Trả về uid của khách; tạo phiên ẩn danh nếu chưa có. */
  async ensureGuest(): Promise<string> {
    try {
      const auth = await getAuthLazy();
      await auth.authStateReady();
      if (auth.currentUser) return auth.currentUser.uid;
      const { signInAnonymously } = await import('firebase/auth');
      const cred = await signInAnonymously(auth);
      return cred.user.uid;
    } catch (e) {
      throw toAppError(e);
    }
  },

  async staffSignIn(email: string, password: string): Promise<StaffProfile> {
    try {
      const auth = await getAuthLazy();
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
    const snap = await getDoc(doc(db(), 'staff', user.uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    return { uid: user.uid, name: typeof d.name === 'string' ? d.name : '', email: user.email ?? '' };
  },

  async signOut(): Promise<void> {
    const auth = await getAuthLazy();
    const { signOut } = await import('firebase/auth');
    await signOut(auth);
  },
};
