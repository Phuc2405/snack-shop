// Chạy toàn bộ shop trên máy bằng MỘT lệnh, không cần Firebase thật: `npm run dev:local`
//   1. Bật Firebase Emulator (Auth + Firestore) — DB nằm trong RAM, tắt là xoá sạch.
//   2. Tự tạo dữ liệu mẫu: tài khoản nhân viên, cài đặt tiệm (đang nhận đơn), 12 món mẫu.
//   3. Mở web ở http://localhost:5173 (trang khách) và /admin (trang quản lý).
// Mỗi lần chạy lại đều có sẵn menu để test. Tắt: Ctrl+C.
// (Không dùng --export-on-exit: trên Windows firebase-tools hay lỗi EPERM khi đổi tên thư mục export.)
import { spawn } from 'node:child_process';

const FIRESTORE = 'http://127.0.0.1:8080';
const AUTH = 'http://127.0.0.1:9099';
const children = [];

function run(cmd, args) {
  const child = spawn(cmd, args, { stdio: 'inherit', shell: true });
  children.push(child);
  return child;
}

async function isUp(url) {
  try {
    await fetch(url);
    return true;
  } catch {
    return false;
  }
}

async function waitFor(url, seconds) {
  for (let i = 0; i < seconds * 2; i++) {
    if (await isUp(url)) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Emulator chưa sẵn sàng sau ${seconds}s (${url}). Cần Java 11+ — kiểm tra: java -version`);
}

if ((await isUp(FIRESTORE)) && (await isUp(AUTH))) {
  console.log('ℹ Emulator đã chạy sẵn, dùng luôn.');
} else {
  const emulator = run('npx', ['firebase', 'emulators:start', '--only', 'auth,firestore', '--project', 'demo-snack-shop']);
  emulator.on('exit', (code) => {
    console.log(code === 0 ? '\n✔ Đã tắt.' : `\n✖ Emulator dừng (mã ${code}). Cổng 4000/8080/9099 có đang bị chương trình khác giữ không?`);
    for (const c of children) c.kill();
    process.exit(code ?? 0);
  });
}

try {
  await waitFor(FIRESTORE, 90);
  await waitFor(AUTH, 30);
} catch (e) {
  console.error(`✖ ${e.message}`);
  for (const c of children) c.kill();
  process.exit(1);
}

const seed = run('node', ['scripts/seed-emulator.mjs']);
if ((await new Promise((r) => seed.on('exit', r))) !== 0) console.warn('⚠ Seed lỗi: web vẫn chạy nhưng có thể thiếu dữ liệu mẫu.');

console.log('\n▶ Trang khách:     http://localhost:5173');
console.log('▶ Trang quản lý:   http://localhost:5173/admin   (tài khoản test: docs/TEST-ACCOUNTS.md)');
console.log('▶ Xem/sửa DB:      http://127.0.0.1:4000/firestore');
console.log('  Tắt: Ctrl+C\n');
run('npx', ['vite', '--mode', 'emulator', '--port', '5173', '--strictPort']);
