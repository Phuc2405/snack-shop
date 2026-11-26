// Tạo dữ liệu mẫu cho Firebase EMULATOR (không bao giờ chạy vào project thật).
// Dùng: (1) npm run dev:emu   (2) cửa sổ khác: npm run seed:emu   (3) npm run dev -- --mode emulator
//
// Tạo: tài khoản nhân viên + doc staff/{uid} + settings/shop (đang mở nhận đơn).
// Menu: đăng nhập trang /admin → Món ăn → "Tạo menu mẫu" (đi qua đúng luồng + rules thật).
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

const PROJECT = 'demo-snack-shop'; // tiền tố demo- = chỉ emulator, không thể trỏ tới project thật
const AUTH = 'http://127.0.0.1:9099';
const EMAIL = 'staff@nhabong.test';
const PASSWORD = 'nhabong123';

async function ensureStaffUser() {
  const url = (path) => `${AUTH}/identitytoolkit.googleapis.com/v1/${path}?key=demo-key`;
  const body = JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true });
  const opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body };
  let res = await fetch(url('accounts:signUp'), opts);
  if (!res.ok) res = await fetch(url('accounts:signInWithPassword'), opts); // đã tạo từ lần trước
  if (!res.ok) throw new Error(`Không tạo được tài khoản trên Auth emulator: ${await res.text()}`);
  return (await res.json()).localId;
}

try {
  const uid = await ensureStaffUser();
  const env = await initializeTestEnvironment({
    projectId: PROJECT,
    firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const now = firebase.firestore.Timestamp.now();
    await db.doc(`staff/${uid}`).set({ name: 'Chủ tiệm (demo)', email: EMAIL });
    await db.doc('settings/shop').set({
      name: 'Con Nhà Bảy Food',
      tagline: 'Trà sữa mát lạnh, bánh ngọt mỗi ngày',
      hotline: '0909 123 456',
      address: '123 Nguyễn Trãi, Quận 5, TP.HCM',
      openHours: '8:00 – 22:00 hằng ngày',
      isOpen: true,
      deliveryFee: 15000,
      freeShipFrom: 100000,
      minOrder: 0,
      announcement: 'Freeship cho đơn từ 100k!',
      // Tài khoản GIẢ chỉ để demo mã VietQR trên emulator — đổi thành tài khoản thật trong Cài đặt tiệm
      bankBin: '970436',
      bankAccount: '0123456789',
      bankAccountName: 'CON NHA BAY FOOD DEMO',
      updatedAt: now,
    });
  });
  await env.cleanup();
  console.log(`\n✔ Đã seed emulator.\n  Đăng nhập /admin: ${EMAIL} / ${PASSWORD}\n  Sau đó vào "Món ăn" → "Tạo menu mẫu".\n`);
} catch (e) {
  console.error('✖ Seed thất bại. Emulator đã chạy chưa? (npm run dev:emu)\n', e.message);
  process.exit(1);
}
