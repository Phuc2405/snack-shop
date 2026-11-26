import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore/lite';
import type { Auth } from 'firebase/auth';
import type { Firestore as RealtimeFirestore } from 'firebase/firestore';
import { AppError } from './errors';

/**
 * Facade duy nhất chạm tới Firebase SDK. Phần còn lại của app chỉ gọi qua `services/*`.
 *
 * Chiến lược tải (latency):
 *  - Trang khách chỉ cần `firebase/app` + `firestore/lite` (~nhẹ, không realtime) → menu hiện nhanh.
 *  - `firebase/auth` chỉ tải khi khách bấm đặt món / xem đơn, hoặc ở trang quản lý.
 *  - `firebase/firestore` (bản đầy đủ, có realtime onSnapshot) chỉ tải trong dashboard nhân viên.
 *  - App Check (reCAPTCHA v3) chỉ bật khi có VITE_APPCHECK_SITE_KEY.
 */

const env = import.meta.env;
export const usingEmulators = env.VITE_USE_EMULATORS === 'true';
export const isFirebaseConfigured = Boolean(env.VITE_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_API_KEY);

const EMU_HOST = '127.0.0.1';

const app: FirebaseApp | null = isFirebaseConfigured
  ? initializeApp({
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    })
  : null;

if (!isFirebaseConfigured && import.meta.env.DEV) {
  console.warn('[firebase] Chưa cấu hình. Copy .env.example thành .env, hoặc chạy: npm run dev -- --mode emulator');
}

function requireApp(): FirebaseApp {
  if (!app) throw new AppError('NOT_CONFIGURED', 'Cửa hàng chưa kết nối cơ sở dữ liệu.');
  return app;
}

/** App Check phải sẵn sàng TRƯỚC request đầu tiên, nên mọi repository `await ready()`. */
const appCheckReady: Promise<void> =
  app && env.VITE_APPCHECK_SITE_KEY && !usingEmulators
    ? import('firebase/app-check').then(({ initializeAppCheck, ReCaptchaV3Provider }) => {
        initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(env.VITE_APPCHECK_SITE_KEY!),
          isTokenAutoRefreshEnabled: true,
        });
      })
    : Promise.resolve();

export const ready = () => appCheckReady;

// ---------- Firestore lite (đọc/ghi một lần) ----------
let liteDb: Firestore | null = null;
export function db(): Firestore {
  if (liteDb) return liteDb;
  liteDb = getFirestore(requireApp());
  if (usingEmulators) connectFirestoreEmulator(liteDb, EMU_HOST, 8080);
  return liteDb;
}

// ---------- Auth (tải lười) ----------
let authPromise: Promise<Auth> | null = null;
export function getAuthLazy(): Promise<Auth> {
  const a = requireApp();
  authPromise ??= import('firebase/auth').then((m) => {
    // initializeAuth (thay vì getAuth) để KHÔNG kéo theo code popup/redirect — app không dùng.
    const auth = m.initializeAuth(a, {
      persistence: [m.indexedDBLocalPersistence, m.browserLocalPersistence],
    });
    if (usingEmulators) m.connectAuthEmulator(auth, `http://${EMU_HOST}:9099`, { disableWarnings: true });
    return auth;
  });
  return authPromise;
}

// ---------- Firestore đầy đủ (realtime, chỉ dashboard) ----------
let rtPromise: Promise<RealtimeFirestore> | null = null;
export function getRealtimeDb(): Promise<RealtimeFirestore> {
  const a = requireApp();
  rtPromise ??= import('firebase/firestore').then((m) => {
    const rt = m.getFirestore(a);
    if (usingEmulators) m.connectFirestoreEmulator(rt, EMU_HOST, 8080);
    return rt;
  });
  return rtPromise;
}
