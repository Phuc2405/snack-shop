import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore/lite';
import type { Auth } from 'firebase/auth';
import type { Firestore as RealtimeFirestore } from 'firebase/firestore';
import { AppError } from './errors';

/**
 * Facade duy nhất chạm tới Firebase SDK. Phần còn lại của app chỉ gọi qua `services/*`.
 *
 * HAI "phiên" tách biệt (2 Firebase app instance, mỗi cái lưu đăng nhập riêng trong IndexedDB):
 *  - `guest`: khách — đăng nhập ẩn danh khi đặt món, đọc menu, xem đơn của mình.
 *  - `staff`: nhân viên — email/mật khẩu, quản lý món, xử lý đơn.
 * Nhờ vậy nhân viên đăng nhập trang quản lý trên cùng trình duyệt KHÔNG đá văng phiên khách
 * (trước đây: khách mất "Đơn của tôi"), và đăng xuất quản lý không ảnh hưởng giỏ/đơn của khách.
 *
 * Chiến lược tải (latency):
 *  - Trang khách chỉ cần `firebase/app` + `firestore/lite` → menu hiện nhanh.
 *  - `firebase/auth` chỉ tải khi khách đặt món / xem đơn, hoặc ở trang quản lý.
 *  - `firebase/firestore` bản đầy đủ (realtime onSnapshot) chỉ tải trong dashboard nhân viên.
 *  - App Check (reCAPTCHA v3) chỉ bật khi có VITE_APPCHECK_SITE_KEY.
 */

export type Scope = 'guest' | 'staff';

const env = import.meta.env;
export const usingEmulators = env.VITE_USE_EMULATORS === 'true';
export const isFirebaseConfigured = Boolean(env.VITE_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_API_KEY);

const EMU_HOST = '127.0.0.1';
const CONFIG = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

const apps: Record<Scope, FirebaseApp | null> = isFirebaseConfigured
  ? { guest: initializeApp(CONFIG), staff: initializeApp(CONFIG, 'staff') }
  : { guest: null, staff: null };

if (!isFirebaseConfigured && import.meta.env.DEV) {
  console.warn('[firebase] Chưa cấu hình. Copy .env.example thành .env, hoặc chạy: npm run dev -- --mode emulator');
}

function requireApp(scope: Scope): FirebaseApp {
  const app = apps[scope];
  if (!app) throw new AppError('NOT_CONFIGURED', 'Cửa hàng chưa kết nối cơ sở dữ liệu.');
  return app;
}

/** App Check phải sẵn sàng TRƯỚC request đầu tiên, nên mọi repository `await ready()`. */
const appCheckReady: Promise<void> =
  isFirebaseConfigured && env.VITE_APPCHECK_SITE_KEY && !usingEmulators
    ? import('firebase/app-check').then(({ initializeAppCheck, ReCaptchaV3Provider }) => {
        for (const app of Object.values(apps)) {
          if (app) {
            initializeAppCheck(app, { provider: new ReCaptchaV3Provider(env.VITE_APPCHECK_SITE_KEY!), isTokenAutoRefreshEnabled: true });
          }
        }
      })
    : Promise.resolve();

export const ready = () => appCheckReady;

// ---------- Firestore lite (đọc/ghi một lần) ----------
const liteDbs: Partial<Record<Scope, Firestore>> = {};
export function db(scope: Scope = 'guest'): Firestore {
  const cached = liteDbs[scope];
  if (cached) return cached;
  const d = getFirestore(requireApp(scope));
  if (usingEmulators) connectFirestoreEmulator(d, EMU_HOST, 8080);
  liteDbs[scope] = d;
  return d;
}

// ---------- Auth (tải lười) ----------
const authPromises: Partial<Record<Scope, Promise<Auth>>> = {};
export function getAuthLazy(scope: Scope): Promise<Auth> {
  const app = requireApp(scope);
  authPromises[scope] ??= import('firebase/auth').then((m) => {
    // initializeAuth (thay vì getAuth) để KHÔNG kéo theo code popup/redirect — app không dùng.
    const auth = m.initializeAuth(app, { persistence: [m.indexedDBLocalPersistence, m.browserLocalPersistence] });
    if (usingEmulators) m.connectAuthEmulator(auth, `http://${EMU_HOST}:9099`, { disableWarnings: true });
    return auth;
  });
  return authPromises[scope]!;
}

// ---------- Firestore đầy đủ (realtime) — chỉ phiên nhân viên ----------
let rtPromise: Promise<RealtimeFirestore> | null = null;
export function getRealtimeDb(): Promise<RealtimeFirestore> {
  const app = requireApp('staff');
  rtPromise ??= import('firebase/firestore').then((m) => {
    const rt = m.getFirestore(app);
    if (usingEmulators) m.connectFirestoreEmulator(rt, EMU_HOST, 8080);
    return rt;
  });
  return rtPromise;
}
