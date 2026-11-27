// Kiểm tra cấu hình bảo mật TỰ ĐỘNG (chạy sau `vite build`, nằm trong `npm run check` và CI).
// Thấy vấn đề → exit 1. Mỗi mục ghi rõ vì sao cần, để người sửa sau hiểu không nới lỏng bừa.
//
//  1. Header bảo mật (firebase.json + vercel.json): đủ header, CSP chặt, hai nơi giống nhau
//  2. firestore.rules: không có chỗ ghi "if true", không wildcard đệ quy, mọi truy vấn list phải có limit
//  3. Bản build (dist/): không source map, không code/địa chỉ emulator, không tài khoản test, không khoá bí mật,
//     không script inline (CSP chặn), có robots.txt chặn trang quản lý
//  4. .gitignore chặn .env / khoá service account / dữ liệu emulator
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const problems = [];
const ok = [];
const fail = (msg) => problems.push(msg);
const pass = (msg) => ok.push(msg);
const read = (f) => readFileSync(f, 'utf8');

// ---------- 1. Header ----------
const REQUIRED = {
  'Content-Security-Policy': null,
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': null,
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': null,
};

function checkCsp(where, csp) {
  const dir = Object.fromEntries(
    csp
      .split(';')
      .map((d) => d.trim().split(/\s+/))
      .filter((p) => p[0])
      .map(([k, ...v]) => [k, v]),
  );
  const must = { 'default-src': "'self'", 'object-src': "'none'", 'frame-ancestors': "'none'", 'base-uri': "'self'", 'form-action': "'self'" };
  for (const [k, v] of Object.entries(must)) if (!dir[k]?.includes(v)) fail(`${where}: CSP thiếu ${k} ${v}`);
  // Chặn chạy code lạ: không eval, không script inline, không cho mọi nguồn
  for (const k of ['script-src', 'connect-src', 'default-src']) {
    const v = dir[k] ?? [];
    if (v.includes("'unsafe-eval'")) fail(`${where}: CSP ${k} có 'unsafe-eval' (mở đường XSS)`);
    if (v.some((x) => x === '*' || x === 'http:' || x === 'https:' || x === 'data:')) fail(`${where}: CSP ${k} mở cho mọi nguồn (${v.join(' ')})`);
  }
  if ((dir['script-src'] ?? []).includes("'unsafe-inline'")) fail(`${where}: CSP script-src có 'unsafe-inline'`);
  return csp;
}

function headersOf(where, list) {
  const all = list.find((h) => h.source === '**' || h.source === '/(.*)');
  if (!all) {
    fail(`${where}: không có khối header áp cho mọi đường dẫn`);
    return {};
  }
  return Object.fromEntries(all.headers.map((h) => [h.key, h.value]));
}

const fb = headersOf('firebase.json', JSON.parse(read('firebase.json')).hosting.headers);
const vc = existsSync('vercel.json') ? headersOf('vercel.json', JSON.parse(read('vercel.json')).headers) : null;
for (const [where, h] of [['firebase.json', fb], ...(vc ? [['vercel.json', vc]] : [])]) {
  for (const [k, v] of Object.entries(REQUIRED)) {
    if (!h[k]) fail(`${where}: thiếu header ${k}`);
    else if (v && h[k] !== v) fail(`${where}: ${k} phải là "${v}" (đang "${h[k]}")`);
  }
  if (h['Content-Security-Policy']) checkCsp(where, h['Content-Security-Policy']);
  if (h['Strict-Transport-Security'] && !/max-age=(\d{7,})/.test(h['Strict-Transport-Security'])) fail(`${where}: HSTS max-age quá ngắn`);
}
if (vc && vc['Content-Security-Policy'] !== fb['Content-Security-Policy']) fail('CSP của vercel.json khác firebase.json (hai nơi deploy phải cùng mức bảo vệ)');
if (!problems.length) pass('Header bảo mật + CSP (firebase.json, vercel.json)');

// ---------- 2. firestore.rules ----------
const before = problems.length;
const rules = read('firestore.rules').replace(/\/\/.*$/gm, ''); // bỏ chú thích
for (const m of rules.matchAll(/allow\s+([a-z, ]+):\s*if\s+true\s*;/g)) {
  if (/write|create|update|delete/.test(m[1])) fail(`firestore.rules: "allow ${m[1]}: if true" — ai cũng ghi được`);
}
if (/\{\s*\w+\s*=\s*\*\*\s*\}/.test(rules)) fail('firestore.rules: có wildcard đệ quy {x=**} — dễ mở nhầm cả database');
for (const m of rules.matchAll(/allow\s+list\s*:\s*if\s+([^;]+);/g)) {
  if (!/request\.query\.limit/.test(m[1]) && m[1].trim() !== 'false') fail(`firestore.rules: "allow list" không giới hạn limit → đọc vô hạn (denial of wallet): ${m[1].trim().slice(0, 60)}`);
}
for (const m of rules.matchAll(/allow\s+(read|get)\s*:\s*if\s+true\s*;/g)) {
  // Chỉ cho đọc công khai ở đúng những chỗ đã cân nhắc
  void m;
  fail('firestore.rules: có "allow read/get: if true" — dùng điều kiện cụ thể (VD món không bị ẩn)');
}
if (!/match \/users\/\{uid\}[\s\S]*?isAccountOwner\(uid\)/.test(rules)) fail('firestore.rules: users/{uid} phải chỉ cho chính chủ (isAccountOwner)');
if (!/match \/staff\/\{uid\}[\s\S]*?allow list, write: if false/.test(rules)) fail('firestore.rules: staff/{uid} phải "allow list, write: if false" (không ai tự cấp quyền)');
if (problems.length === before) pass('firestore.rules: không ghi tự do, không wildcard, list có limit, staff/users khoá đúng');

// ---------- 3. Bản build ----------
const before3 = problems.length;
if (!existsSync('dist/index.html')) {
  fail('Chưa có dist/ — chạy "npm run build" trước');
} else {
  const files = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else files.push(p.replace(/\\/g, '/'));
    }
  };
  walk('dist');

  // Tài khoản test của emulator (đọc từ seed) KHÔNG được nằm trong code gửi cho khách
  const seed = existsSync('scripts/seed-emulator.mjs') ? read('scripts/seed-emulator.mjs') : '';
  const testSecrets = [...seed.matchAll(/(?:email|pass):\s*'([^']+)'/g)].map((m) => m[1]);
  const FORBIDDEN = [
    ['source map', /\/\/# sourceMappingURL=/],
    ['địa chỉ emulator (127.0.0.1)', /127\.0\.0\.1/],
    ['cổng emulator Auth (9099)', /:9099\b/],
    ['API riêng của emulator', /emulator\/v1|oobCodes/],
    ['khoá riêng (PEM)', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
    ['khoá service account', /"private_key"|"type"\s*:\s*"service_account"/],
    ['biến môi trường không phải VITE_', /\b(?:SITE_URL|FIREBASE_TOKEN|GOOGLE_APPLICATION_CREDENTIALS)\b/],
  ];
  for (const f of files) {
    if (f.endsWith('.map')) fail(`${f}: source map lộ mã nguồn gốc`);
    if (/(^|\/)\.env/.test(f)) fail(`${f}: file .env nằm trong bản build`);
    if (!/\.(js|html|css|txt|xml|json|svg)$/.test(f)) continue;
    const text = read(f);
    for (const [name, re] of FORBIDDEN) if (re.test(text)) fail(`${f}: chứa ${name}`);
    for (const s of testSecrets) if (text.includes(s)) fail(`${f}: chứa tài khoản/mật khẩu test "${s.slice(0, 3)}…"`);
  }

  const html = read('dist/index.html');
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (!/\bsrc=/.test(m[1]) && m[2].trim()) fail('dist/index.html: có <script> inline (CSP script-src \'self\' sẽ chặn, và là chỗ XSS)');
  }
  if (!existsSync('dist/robots.txt')) fail('dist/robots.txt: chưa có');
  else {
    const robots = read('dist/robots.txt');
    for (const p of ['/admin', '/checkout', '/orders']) if (!robots.includes(`Disallow: ${p}`)) fail(`robots.txt: thiếu "Disallow: ${p}"`);
  }
  if (problems.length === before3) pass(`Bản build: ${files.length} file sạch (không map, không emulator, không tài khoản test, có robots.txt)`);
}

// ---------- 4. .gitignore ----------
const gi = read('.gitignore');
const before4 = problems.length;
for (const p of ['.env', '*serviceAccount*.json', 'emulator-data/']) if (!gi.split(/\r?\n/).includes(p)) fail(`.gitignore thiếu "${p}"`);
if (problems.length === before4) pass('.gitignore chặn .env, khoá service account, dữ liệu emulator');

if (problems.length) {
  console.error(`✖ check:security — ${problems.length} vấn đề:\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log(`✔ check:security\n  - ${ok.join('\n  - ')}`);
