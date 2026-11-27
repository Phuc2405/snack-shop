import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore/lite';
import type { User } from 'firebase/auth';
import { db, getAuthLazy, ready } from '@/lib/firebase';
import { AppError, toAppError } from '@/lib/errors';
import type { Account, UserDoc } from '@/types/domain';
import { toUserDoc } from './mappers';

/**
 * Tài khoản KHÁCH: email + mật khẩu (Firebase Auth), chạy trên phiên `guest` (xem lib/firebase.ts).
 *  - Đăng ký khi đang có phiên ẩn danh (đã từng đặt đơn) → NÂNG CẤP phiên đó thành tài khoản
 *    (linkWithCredential), giữ nguyên uid nên các đơn đã đặt trên máy này vẫn thuộc tài khoản.
 *  - Quên mật khẩu → Firebase gửi email có link đặt lại (miễn phí, giống resetPasswordForEmail của Supabase).
 *  - Tài khoản có doc staff/{uid} (chủ tiệm / nhân viên) → đăng nhập luôn phiên `staff` để bấm "Quản lý"
 *    là vào thẳng, không phải nhập lại. Quyền thật vẫn do firestore.rules kiểm tra.
 */

async function isStaff(uid: string): Promise<boolean> {
  try {
    await ready();
    return (await getDoc(doc(db(), 'staff', uid))).exists();
  } catch {
    return false;
  }
}

async function toAccount(user: User): Promise<Account> {
  return { uid: user.uid, email: user.email ?? '', isStaff: await isStaff(user.uid) };
}

/** Phiên quản lý dùng chung mật khẩu vừa nhập — lỗi ở đây không làm hỏng việc đăng nhập phía khách. */
async function openStaffSession(email: string, password: string) {
  try {
    const auth = await getAuthLazy('staff');
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    if (auth.currentUser?.email !== email) await signInWithEmailAndPassword(auth, email, password);
  } catch {
    /* vào /admin sẽ được mời đăng nhập lại */
  }
}

export const customerService = {
  async signIn(email: string, password: string): Promise<Account> {
    try {
      const auth = await getAuthLazy('guest');
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const account = await toAccount(cred.user);
      if (account.isStaff) await openStaffSession(email, password);
      return account;
    } catch (e) {
      throw toAppError(e);
    }
  },

  async signUp(email: string, password: string): Promise<Account> {
    try {
      const auth = await getAuthLazy('guest');
      await auth.authStateReady();
      const m = await import('firebase/auth');
      const current = auth.currentUser;
      if (current?.isAnonymous) {
        // Giữ uid ẩn danh → đơn đã đặt trước khi có tài khoản vẫn hiện trong "Đơn của tôi"
        await m.linkWithCredential(current, m.EmailAuthProvider.credential(email, password));
        // Đăng nhập lại để token mới mang provider "password" + email (rules users/{uid} cần)
        const cred = await m.signInWithEmailAndPassword(auth, email, password);
        return await toAccount(cred.user);
      }
      const cred = await m.createUserWithEmailAndPassword(auth, email, password);
      return await toAccount(cred.user);
    } catch (e) {
      throw toAppError(e);
    }
  },

  /**
   * Gửi email đặt lại mật khẩu. Luôn báo "đã gửi" kể cả khi email chưa đăng ký
   * (không cho người lạ dò email nào có tài khoản — Email enumeration protection).
   */
  async sendPasswordReset(email: string): Promise<void> {
    try {
      const auth = await getAuthLazy('guest');
      auth.languageCode = 'vi';
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, email);
    } catch (e) {
      const err = toAppError(e);
      if (err.code === 'auth/user-not-found') return;
      throw err;
    }
  },

  /** Chỉ khi chạy emulator: emulator không gửi email thật → lấy link đặt lại để test trên máy. */
  async devResetLink(email: string): Promise<string | null> {
    // So sánh trực tiếp import.meta.env để bản production bỏ hẳn đoạn này (không ship địa chỉ emulator)
    if (import.meta.env.VITE_USE_EMULATORS !== 'true') return null;
    try {
      const project = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      const res = await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${project}/oobCodes`);
      const { oobCodes } = (await res.json()) as { oobCodes: { email: string; requestType: string; oobLink: string }[] };
      const link = [...oobCodes].reverse().find((c) => c.email === email && c.requestType === 'PASSWORD_RESET');
      if (!link) return null;
      const code = new URL(link.oobLink).searchParams.get('oobCode');
      return code ? `${location.origin}/auth/action?mode=resetPassword&oobCode=${encodeURIComponent(code)}` : null;
    } catch {
      return null;
    }
  },

  async signOut(): Promise<void> {
    const { signOut } = await import('firebase/auth');
    const [guest, staff] = await Promise.all([getAuthLazy('guest'), getAuthLazy('staff')]);
    // Đăng xuất phía khách thì đóng luôn phiên quản lý cùng tài khoản (máy dùng chung không bị bỏ ngỏ)
    if (staff.currentUser && staff.currentUser.uid === guest.currentUser?.uid) await signOut(staff);
    await signOut(guest);
  },

  /** Theo dõi tài khoản khách (null = chưa đăng nhập hoặc chỉ có phiên ẩn danh). Trả về hàm huỷ. */
  async watch(cb: (account: Account | null) => void): Promise<() => void> {
    const auth = await getAuthLazy('guest');
    const { onAuthStateChanged } = await import('firebase/auth');
    let gen = 0;
    return onAuthStateChanged(auth, async (user) => {
      const g = ++gen;
      const account = user && !user.isAnonymous ? await toAccount(user) : null;
      if (g === gen) cb(account); // bỏ kết quả cũ về muộn khi đổi tài khoản nhanh
    });
  },
};

/** Sổ địa chỉ: doc users/{uid}, chỉ chính chủ đọc/ghi (firestore.rules). */
export const userRepo = {
  async get(uid: string): Promise<UserDoc> {
    try {
      await ready();
      const snap = await getDoc(doc(db(), 'users', uid));
      return toUserDoc(snap.exists() ? snap.data() : undefined);
    } catch (e) {
      throw toAppError(e);
    }
  },

  async save(uid: string, d: UserDoc): Promise<void> {
    try {
      await ready();
      await setDoc(doc(db(), 'users', uid), {
        addresses: d.addresses.map(({ id, name, phone, address }) => ({ id, name, phone, address })),
        defaultAddressId: d.defaultAddressId,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      const err = toAppError(e);
      if (err.code === 'permission-denied') throw new AppError('session', 'Phiên đăng nhập đã hết, vui lòng đăng nhập lại.', e);
      throw err;
    }
  },
};
