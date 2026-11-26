// Ngân sách dung lượng (performance budget) — chạy sau `npm run build`.
// Đo kích thước GZIP của JS/CSS tải ở lần mở trang đầu tiên (entry + modulepreload) và từng chunk lazy.
// Vượt ngân sách → exit 1 (CI đỏ). Sửa ngân sách ở BUDGET khi có lý do rõ ràng, ghi lý do vào commit.
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

// Đo ngày 2026-11-26: JS lần đầu ≈ 167 KB (react-dom ~55, react-router ~30, Firestore lite ~35,
// @firebase/app+util ~12, tailwind-merge ~9, code app ~15). Ngân sách để sát → thêm thư viện lớn là CI báo ngay.
const BUDGET = {
  initialJsKb: 175, // JS cần để hiện menu lần đầu (React + router + Firestore lite + trang chủ)
  initialCssKb: 15,
  // Mỗi chunk tải sau. Lớn nhất là Firestore bản đầy đủ (realtime, ~133 KB) — CHỈ trang nhân viên tải.
  lazyChunkKb: 140,
};

const DIST = 'dist';
const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const initial = new Set(
  [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]),
);

const gz = (file) => gzipSync(readFileSync(join(DIST, file))).length / 1024;
const rows = readdirSync(join(DIST, 'assets'))
  .filter((f) => /\.(js|css)$/.test(f))
  .map((f) => {
    const file = `assets/${f}`;
    return { file, kb: gz(file), initial: initial.has(file), css: f.endsWith('.css') };
  })
  .sort((a, b) => b.kb - a.kb);

const sum = (list) => list.reduce((s, r) => s + r.kb, 0);
const initialJs = sum(rows.filter((r) => r.initial && !r.css));
const initialCss = sum(rows.filter((r) => r.initial && r.css));
const fmt = (n) => `${n.toFixed(1).padStart(7)} KB`;

console.log('\nKích thước gzip (* = tải ngay lần đầu):');
for (const r of rows) console.log(`${r.initial ? '*' : ' '} ${fmt(r.kb)}  ${r.file}`);

const problems = [];
if (initialJs > BUDGET.initialJsKb) problems.push(`JS lần đầu ${initialJs.toFixed(1)} KB > ${BUDGET.initialJsKb} KB`);
if (initialCss > BUDGET.initialCssKb) problems.push(`CSS lần đầu ${initialCss.toFixed(1)} KB > ${BUDGET.initialCssKb} KB`);
for (const r of rows.filter((x) => !x.initial && !x.css && x.kb > BUDGET.lazyChunkKb)) {
  problems.push(`chunk ${r.file} ${r.kb.toFixed(1)} KB > ${BUDGET.lazyChunkKb} KB`);
}

console.log(`\nJS lần đầu: ${initialJs.toFixed(1)} / ${BUDGET.initialJsKb} KB · CSS lần đầu: ${initialCss.toFixed(1)} / ${BUDGET.initialCssKb} KB`);
if (problems.length) {
  console.error(`\n✖ Vượt ngân sách:\n  - ${problems.join('\n  - ')}\n`);
  process.exit(1);
}
console.log('✔ Trong ngân sách.\n');
