// Quét secret / cấu hình nhạy cảm trong các file sẽ được commit (git ls-files + file mới chưa ignore).
// Chạy: npm run check:secrets   (CI chạy mỗi lần push). Thấy vấn đề → exit 1.
import { execSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const files = execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((f) => !/^(node_modules|dist)\//.test(f) && !f.endsWith('package-lock.json'));

const RULES = [
  { name: 'Private key (PEM)', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'Service account JSON', re: /"type"\s*:\s*"service_account"|"private_key_id"\s*:/ },
  { name: 'Google/Firebase API key', re: /AIza[0-9A-Za-z_-]{35}/ },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { name: 'Slack token', re: /\bxox[abpr]-[A-Za-z0-9-]{10,}/ },
  { name: 'Stripe live key', re: /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}/ },
  { name: 'AWS access key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'JWT', re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: 'Mật khẩu gắn cứng', re: /\b(?:password|passwd|secret)\s*[:=]\s*['"][^'"\s]{8,}['"]/i },
];

// File được phép chứa giá trị GIẢ (emulator / test). Mọi giá trị ở đây chỉ chạy trên máy, không phải secret thật.
const ALLOW = [/^scripts\/seed-emulator\.mjs$/, /^tests\//, /^\.env\.emulator$/, /^scripts\/check-secrets\.mjs$/, /\.test\.ts$/];

const problems = [];
for (const f of files) {
  if (/(^|\/)\.env(\.local|\.production|\.development)?$/.test(f)) problems.push(`${f}: file .env KHÔNG được commit`);
  if (/serviceAccount|firebase-adminsdk/i.test(f)) problems.push(`${f}: tên file giống khoá service account`);
  let text;
  try {
    if (statSync(f).size > 2_000_000) continue;
    text = readFileSync(f, 'utf8');
  } catch {
    continue;
  }
  if (ALLOW.some((re) => re.test(f))) continue;
  for (const r of RULES) {
    const m = text.match(r.re);
    if (m) problems.push(`${f}: ${r.name} → "${m[0].slice(0, 12)}…"`);
  }
}

if (problems.length) {
  console.error(`✖ Phát hiện ${problems.length} vấn đề:\n  - ${problems.join('\n  - ')}`);
  console.error('\nXoá secret khỏi file, đưa vào .env (đã git-ignore). Nếu đã lỡ push: THU HỒI/đổi khoá ngay, xoá khỏi lịch sử không đủ.');
  process.exit(1);
}
console.log(`✔ Không thấy secret trong ${files.length} file.`);
