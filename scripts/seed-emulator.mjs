// Tạo dữ liệu mẫu cho Firebase EMULATOR (không bao giờ chạy vào project thật).
// Cách nhanh nhất: `npm run dev:local` (tự bật emulator + chạy file này + mở web).
// Chạy riêng: (1) npm run dev:emu   (2) cửa sổ khác: npm run seed:emu   (3) npm run dev -- --mode emulator
//
// Tạo (chỉ khi CHƯA có — chạy lại nhiều lần không ghi đè dữ liệu bạn đã sửa):
//   - 1 tài khoản quản lý + 3 tài khoản khách (danh sách: docs/TEST-ACCOUNTS.md)
//   - sổ địa chỉ cho khách, vài đơn mẫu, settings/shop (đang mở nhận đơn), menu mẫu + 1 món đang ẩn
// Mật khẩu dưới đây CHỈ tồn tại trên emulator trong máy (project "demo-…"), không phải mật khẩu thật.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { runnerImport } from 'vite';

const PROJECT = 'demo-snack-shop'; // tiền tố demo- = chỉ emulator, không thể trỏ tới project thật
const AUTH = 'http://127.0.0.1:9099';

export const TEST_ACCOUNTS = [
  { role: 'admin', email: 'admin@connhabay.test', pass: 'Admin@2026', name: 'Chủ tiệm (test)' },
  {
    role: 'customer',
    email: 'khach1@connhabay.test',
    pass: 'Khach@2026',
    addresses: [
      { id: 'k1home', name: 'Nguyễn Thị Lan', phone: '0901000001', address: '12 Lê Lợi, phường Bến Nghé, Quận 1' },
      { id: 'k1work', name: 'Lan (công ty)', phone: '0901000001', address: 'Tầng 5, 25 Nguyễn Huệ, Quận 1' },
    ],
  },
  {
    role: 'customer',
    email: 'khach2@connhabay.test',
    pass: 'Khach@2026',
    addresses: [{ id: 'k2home', name: 'Trần Minh Huy', phone: '0902000002', address: '88 Trần Hưng Đạo, phường 7, Quận 5' }],
  },
  // Khách 3: tài khoản mới tinh, chưa có địa chỉ / đơn nào → test luồng lần đầu
  { role: 'customer', email: 'khach3@connhabay.test', pass: 'Khach@2026', addresses: [] },
];

async function ensureUser(email, password) {
  const url = (path) => `${AUTH}/identitytoolkit.googleapis.com/v1/${path}?key=demo-key`;
  const opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) };
  let res = await fetch(url('accounts:signUp'), opts);
  if (!res.ok) res = await fetch(url('accounts:signInWithPassword'), opts); // đã tạo từ lần trước
  if (!res.ok) throw new Error(`Không tạo được tài khoản ${email} trên Auth emulator: ${await res.text()}`);
  return (await res.json()).localId;
}

const HIDDEN_SAMPLE = {
  name: 'Trà sữa bí đỏ (món theo mùa)',
  description: 'Món mùa thu, đang ẩn: khách không thấy, nhân viên bấm "Hiện" là bán lại.',
  price: 42000,
  category: 'drink',
  imageUrl: '',
  available: true,
  featured: false,
  sortOrder: 35,
  hidden: true,
  options: [],
};

function sampleOrder(uid, addr, { code, status, minutesAgo, items, paymentMethod = 'cod', paid = false }) {
  const at = firebase.firestore.Timestamp.fromMillis(Date.now() - minutesAgo * 60_000);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const deliveryFee = subtotal >= 100000 ? 0 : 15000;
  return {
    code,
    customerUid: uid,
    customer: { name: addr.name, phone: addr.phone, address: addr.address, note: '' },
    fulfillment: 'delivery',
    items: items.map((i) => ({ options: [], note: '', ...i })),
    itemCount: items.reduce((s, i) => s + i.qty, 0),
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    status,
    paymentMethod,
    paid,
    shipToDriver: false,
    createdAt: at,
    updatedAt: at,
  };
}

try {
  const uids = {};
  for (const a of TEST_ACCOUNTS) uids[a.email] = await ensureUser(a.email, a.pass);

  // Đọc menu mẫu thẳng từ code app (TypeScript + alias '@/') để chỉ có MỘT nguồn dữ liệu mẫu.
  const { module: catalog } = await runnerImport('/src/config/catalog.ts', {
    configFile: false,
    logLevel: 'silent',
    resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  });
  const env = await initializeTestEnvironment({
    projectId: PROJECT,
    firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') },
  });
  const summary = {};
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const now = firebase.firestore.Timestamp.now();

    for (const a of TEST_ACCOUNTS) {
      const uid = uids[a.email];
      if (a.role === 'admin') {
        await db.doc(`staff/${uid}`).set({ name: a.name, email: a.email });
        continue;
      }
      const userRef = db.doc(`users/${uid}`);
      if (!(await userRef.get()).exists) {
        await userRef.set({ addresses: a.addresses, defaultAddressId: a.addresses[0]?.id ?? '', updatedAt: now });
      }
    }

    const settings = db.doc('settings/shop');
    if (!(await settings.get()).exists) {
      await settings.set({
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
        shipFeeMode: 'flat',
        shipPrepaid: false,
        updatedAt: now,
      });
    }

    const products = db.collection('products');
    if ((await products.limit(1).get()).empty) {
      const batch = db.batch();
      for (const p of [...catalog.SAMPLE_MENU, HIDDEN_SAMPLE]) batch.set(products.doc(), { ...p, createdAt: now, updatedAt: now });
      await batch.commit();
    }
    const menu = (await products.get()).docs.map((d) => ({ id: d.id, ...d.data() }));
    summary.menu = menu.length;
    summary.hidden = menu.filter((p) => p.hidden).length;

    // Đơn mẫu cho khách 1 và 2 (để có lịch sử "Đơn của tôi" + dashboard có việc)
    const orders = db.collection('orders');
    if ((await orders.limit(1).get()).empty) {
      const byName = (n) => menu.find((p) => p.name === n);
      const line = (n, qty) => {
        const p = byName(n);
        return { productId: p.id, name: p.name, price: p.price, qty };
      };
      const k1 = TEST_ACCOUNTS[1];
      const k2 = TEST_ACCOUNTS[2];
      const list = [
        sampleOrder(uids[k1.email], k1.addresses[0], {
          code: 'NB-TEST1',
          status: 'done',
          minutesAgo: 60 * 26,
          items: [line('Bánh flan caramel', 2), line('Khoai tây lắc phô mai', 1)],
          paymentMethod: 'transfer',
          paid: true,
        }),
        sampleOrder(uids[k1.email], k1.addresses[1], { code: 'NB-TEST2', status: 'new', minutesAgo: 3, items: [line('Combo Chill: 2 trà sữa + 1 khoai', 1), line('Bánh flan caramel', 1)] }),
        sampleOrder(uids[k2.email], k2.addresses[0], { code: 'NB-TEST3', status: 'preparing', minutesAgo: 15, items: [line('Bông lan trứng muối', 1)] }),
      ];
      for (const o of list) await orders.add(o);
    }
    summary.orders = (await orders.get()).size;
  });
  await env.cleanup();
  console.log(
    `\n✔ Đã seed emulator: ${summary.menu} món (${summary.hidden} đang ẩn), ${summary.orders} đơn, ` +
      `${TEST_ACCOUNTS.length} tài khoản test (xem docs/TEST-ACCOUNTS.md).\n`,
  );
} catch (e) {
  console.error('✖ Seed thất bại. Emulator đã chạy chưa? (npm run dev:emu)\n', e.message);
  process.exit(1);
}
