// Test Firestore Security Rules trên emulator thật.
// Chạy: npm run test:rules   (tự bật emulator, chạy xong tự tắt)
import { after, before, beforeEach, describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

// Các ca "assertFails" cố tình bị từ chối → tắt log PERMISSION_DENIED cho dễ đọc kết quả
firebase.firestore.setLogLevel('silent');

const { serverTimestamp } = firebase.firestore.FieldValue;
const { Timestamp } = firebase.firestore;

let env;

const ANON = { firebase: { sign_in_provider: 'anonymous' } };
const PASSWORD = { firebase: { sign_in_provider: 'password' }, email: 'staff@shop.vn' };

const guest = () => env.unauthenticatedContext().firestore();
const anon = (uid = 'cust1') => env.authenticatedContext(uid, ANON).firestore();
const staff = () => env.authenticatedContext('staff1', PASSWORD).firestore();
const notStaff = () => env.authenticatedContext('random', PASSWORD).firestore();

const SHOP = {
  name: 'Tiệm test',
  tagline: '',
  hotline: '0900000000',
  address: '',
  openHours: '',
  isOpen: true,
  deliveryFee: 15000,
  freeShipFrom: 0,
  minOrder: 0,
  announcement: '',
  bankBin: '',
  bankAccount: '',
  bankAccountName: '',
};

const product = (over = {}) => ({
  name: 'Trà sữa',
  description: 'ngon',
  price: 30000,
  category: 'drink',
  imageUrl: '',
  available: true,
  featured: false,
  sortOrder: 1,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...over,
});

const order = (uid = 'cust1', over = {}) => ({
  code: 'NB-ABCDE',
  customerUid: uid,
  customer: { name: 'Lan', phone: '0901234567', address: '12 Lê Lợi, Q1', note: '' },
  fulfillment: 'delivery',
  items: [{ productId: 'p1', name: 'Trà sữa', price: 30000, qty: 2, options: [{ group: 'size', choice: 'm', name: 'Size M', price: 0 }] }],
  itemCount: 2,
  subtotal: 60000,
  deliveryFee: 15000,
  total: 75000,
  status: 'new',
  paymentMethod: 'cod',
  paid: false,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...over,
});

/** Đặt đơn đúng cách app làm: batch gồm order + throttle/{uid}. */
function placeOrder(db, uid, id, data, { withThrottle = true } = {}) {
  const batch = db.batch();
  batch.set(db.collection('orders').doc(id), data);
  if (withThrottle) batch.set(db.collection('throttle').doc(uid), { lastOrderAt: serverTimestamp() });
  return batch.commit();
}

async function seed(fn) {
  await env.withSecurityRulesDisabled(async (ctx) => fn(ctx.firestore()));
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-snack-shop',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
after(async () => env?.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await seed(async (db) => {
    await db.doc('settings/shop').set({ ...SHOP, updatedAt: Timestamp.now() });
    await db.doc('staff/staff1').set({ name: 'Chủ tiệm' });
    await db.doc('products/p1').set({ ...product(), createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
  });
});

describe('products', () => {
  it('khách vãng lai xem được menu (có limit)', async () => {
    await assertSucceeds(guest().collection('products').limit(50).get());
    await assertSucceeds(guest().doc('products/p1').get());
  });
  it('truy vấn không có limit bị từ chối (chống đọc vô hạn)', async () => {
    await assertFails(guest().collection('products').get());
  });
  it('khách không sửa / tạo / xoá món được', async () => {
    await assertFails(anon().doc('products/p1').update({ price: 1, updatedAt: serverTimestamp() }));
    await assertFails(anon().collection('products').add(product()));
    await assertFails(guest().doc('products/p1').delete());
  });
  it('nhân viên thêm món hợp lệ được', async () => {
    await assertSucceeds(staff().collection('products').add(product()));
  });
  it('nhân viên gửi dữ liệu sai bị từ chối', async () => {
    const db = staff();
    await assertFails(db.collection('products').add(product({ price: '30000' })));
    await assertFails(db.collection('products').add(product({ price: -1 })));
    await assertFails(db.collection('products').add(product({ isAdmin: true })));
    await assertFails(db.collection('products').add(product({ imageUrl: 'javascript:alert(1)' })));
    await assertFails(db.collection('products').add(product({ imageUrl: 'https://x.com/"><script>' })));
    await assertFails(db.collection('products').add(product({ category: 'pizza' })));
    await assertFails(db.collection('products').add(product({ updatedAt: Timestamp.fromDate(new Date(2000, 1, 1)) })));
  });
  it('tài khoản ẩn danh trùng uid với staff vẫn KHÔNG có quyền', async () => {
    const fake = env.authenticatedContext('staff1', ANON).firestore();
    await assertFails(fake.collection('products').add(product()));
  });
  it('tài khoản email không có doc staff không có quyền', async () => {
    await assertFails(notStaff().collection('products').add(product()));
  });
});

describe('settings', () => {
  it('ai cũng đọc được settings/shop, không đọc doc khác / liệt kê', async () => {
    await assertSucceeds(guest().doc('settings/shop').get());
    await assertFails(guest().doc('settings/secret').get());
    await assertFails(guest().collection('settings').get());
  });
  it('chỉ nhân viên sửa được, và phải đúng cấu trúc', async () => {
    await assertFails(anon().doc('settings/shop').set({ ...SHOP, updatedAt: serverTimestamp() }));
    await assertSucceeds(staff().doc('settings/shop').set({ ...SHOP, isOpen: false, updatedAt: serverTimestamp() }));
    await assertFails(staff().doc('settings/shop').set({ ...SHOP, deliveryFee: -5, updatedAt: serverTimestamp() }));
    await assertFails(staff().doc('settings/shop').set({ ...SHOP, hacked: 1, updatedAt: serverTimestamp() }));
    await assertFails(staff().doc('settings/other').set({ ...SHOP, updatedAt: serverTimestamp() }));
  });
});

describe('orders: tạo đơn', () => {
  it('khách ẩn danh đặt đơn hợp lệ (kèm throttle) được', async () => {
    await assertSucceeds(placeOrder(anon(), 'cust1', 'o1', order()));
  });
  it('ghé lấy: phí ship phải = 0, địa chỉ được để trống', async () => {
    const pickup = order('cust1', {
      fulfillment: 'pickup',
      deliveryFee: 0,
      total: 60000,
      customer: { name: 'Lan', phone: '0901234567', address: '', note: '' },
    });
    await assertSucceeds(placeOrder(anon(), 'cust1', 'o1', pickup));
  });
  it('chưa đăng nhập (kể cả ẩn danh) không đặt được', async () => {
    await assertFails(placeOrder(guest(), 'x', 'o1', order('x')));
  });
  it('thiếu throttle trong batch → từ chối', async () => {
    await assertFails(placeOrder(anon(), 'cust1', 'o1', order(), { withThrottle: false }));
  });
  it('RATE LIMIT: đơn thứ 2 trong vòng 60 giây bị từ chối', async () => {
    await assertSucceeds(placeOrder(anon(), 'cust1', 'o1', order()));
    await assertFails(placeOrder(anon(), 'cust1', 'o2', order()));
  });
  it('sau 60 giây đặt tiếp được', async () => {
    await seed((db) => db.doc('throttle/cust1').set({ lastOrderAt: Timestamp.fromMillis(Date.now() - 120_000) }));
    await assertSucceeds(placeOrder(anon(), 'cust1', 'o2', order()));
  });
  it('không ghi throttle hộ người khác', async () => {
    await assertFails(anon('cust1').doc('throttle/cust2').set({ lastOrderAt: serverTimestamp() }));
  });
  it('đặt đơn đứng tên người khác → từ chối', async () => {
    await assertFails(placeOrder(anon('cust1'), 'cust1', 'o1', order('cust2')));
  });
  it('tự đặt trạng thái khác "new" (vd: done) → từ chối', async () => {
    await assertFails(placeOrder(anon(), 'cust1', 'o1', order('cust1', { status: 'done' })));
  });
  it('tổng tiền không khớp tạm tính + phí ship → từ chối', async () => {
    await assertFails(placeOrder(anon(), 'cust1', 'o1', order('cust1', { total: 1000 })));
  });
  it('phí ship sai cấu hình tiệm → từ chối', async () => {
    await assertFails(placeOrder(anon(), 'cust1', 'o1', order('cust1', { deliveryFee: 0, total: 60000 })));
  });
  it('thêm field lạ / tự đánh dấu đã trả tiền → từ chối', async () => {
    await assertFails(placeOrder(anon(), 'cust1', 'o1', order('cust1', { discount: 50000 })));
    await assertFails(placeOrder(anon(), 'cust1', 'o1', order('cust1', { paid: true })));
    await assertFails(placeOrder(anon(), 'cust1', 'o1', order('cust1', { paymentMethod: 'crypto' })));
  });
  it('số điện thoại sai / tên rỗng / giao hàng thiếu địa chỉ → từ chối', async () => {
    const c = order().customer;
    await assertFails(placeOrder(anon(), 'cust1', 'o1', order('cust1', { customer: { ...c, phone: '<script>' } })));
    await assertFails(placeOrder(anon(), 'cust1', 'o1', order('cust1', { customer: { ...c, name: '' } })));
    await assertFails(placeOrder(anon(), 'cust1', 'o1', order('cust1', { customer: { ...c, address: '' } })));
    await assertFails(placeOrder(anon(), 'cust1', 'o1', order('cust1', { customer: { ...c, note: 'x'.repeat(301) } })));
  });
  it('quá 30 món / 0 món → từ chối', async () => {
    const item = order().items[0];
    await assertFails(placeOrder(anon(), 'cust1', 'o1', order('cust1', { items: Array(31).fill(item) })));
    await assertFails(placeOrder(anon(), 'cust1', 'o1', order('cust1', { items: [] })));
  });
  it('tiệm đóng nhận đơn → từ chối', async () => {
    await seed((db) => db.doc('settings/shop').update({ isOpen: false }));
    await assertFails(placeOrder(anon(), 'cust1', 'o1', order()));
  });
  it('dưới đơn tối thiểu → từ chối', async () => {
    await seed((db) => db.doc('settings/shop').update({ minOrder: 100000 }));
    await assertFails(placeOrder(anon(), 'cust1', 'o1', order()));
  });
  it('gửi lại cùng id đơn (retry) không tạo đơn thứ 2 / không ghi đè', async () => {
    await seed((db) => db.doc('throttle/cust1').set({ lastOrderAt: Timestamp.fromMillis(Date.now() - 120_000) }));
    await assertSucceeds(placeOrder(anon(), 'cust1', 'o1', order()));
    await seed((db) => db.doc('throttle/cust1').set({ lastOrderAt: Timestamp.fromMillis(Date.now() - 120_000) }));
    await assertFails(placeOrder(anon(), 'cust1', 'o1', order('cust1', { total: 75000 })));
  });
});

describe('orders: đọc', () => {
  beforeEach(async () => {
    await seed(async (db) => {
      await db.doc('orders/mine').set({ ...order('cust1'), createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
      await db.doc('orders/theirs').set({ ...order('cust2'), createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
    });
  });
  it('khách xem được đơn của mình, không xem được đơn người khác', async () => {
    await assertSucceeds(anon('cust1').doc('orders/mine').get());
    await assertFails(anon('cust1').doc('orders/theirs').get());
    await assertFails(guest().doc('orders/mine').get());
  });
  it('khách chỉ liệt kê được đơn của mình (phải lọc theo uid + có limit)', async () => {
    const db = anon('cust1');
    await assertSucceeds(db.collection('orders').where('customerUid', '==', 'cust1').limit(20).get());
    await assertFails(db.collection('orders').limit(20).get());
    await assertFails(db.collection('orders').where('customerUid', '==', 'cust2').limit(20).get());
    await assertFails(db.collection('orders').where('customerUid', '==', 'cust1').get());
  });
  it('nhân viên xem tất cả đơn', async () => {
    await assertSucceeds(staff().collection('orders').limit(100).get());
  });
});

describe('orders: cập nhật', () => {
  beforeEach(async () => {
    await seed(async (db) => {
      await db.doc('orders/o1').set({ ...order('cust1'), createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
      await db.doc('orders/o2').set({ ...order('cust1', { status: 'confirmed' }), createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
    });
  });
  const cancel = { status: 'cancelled', cancelledBy: 'customer', updatedAt: serverTimestamp() };

  it('khách tự huỷ đơn còn "new" được', async () => {
    await assertSucceeds(anon('cust1').doc('orders/o1').update(cancel));
  });
  it('khách KHÔNG huỷ được khi tiệm đã nhận, không huỷ đơn người khác', async () => {
    await assertFails(anon('cust1').doc('orders/o2').update(cancel));
    await assertFails(anon('cust2').doc('orders/o1').update(cancel));
  });
  it('khách không tự đổi trạng thái / sửa tiền', async () => {
    await assertFails(anon('cust1').doc('orders/o1').update({ status: 'done', updatedAt: serverTimestamp() }));
    await assertFails(anon('cust1').doc('orders/o1').update({ ...cancel, total: 0 }));
  });
  it('nhân viên chuyển trạng thái đúng thứ tự', async () => {
    await assertSucceeds(staff().doc('orders/o1').update({ status: 'confirmed', updatedAt: serverTimestamp() }));
    await assertSucceeds(staff().doc('orders/o2').update({ status: 'preparing', staffNote: 'Đang pha', updatedAt: serverTimestamp() }));
  });
  it('nhân viên không nhảy cóc / không sửa tiền / không xoá đơn', async () => {
    await assertFails(staff().doc('orders/o1').update({ status: 'done', updatedAt: serverTimestamp() }));
    await assertFails(staff().doc('orders/o1').update({ total: 1, updatedAt: serverTimestamp() }));
    await assertFails(staff().doc('orders/o1').delete());
  });
  it('nhân viên huỷ đơn phải ghi cancelledBy = shop', async () => {
    await assertSucceeds(staff().doc('orders/o1').update({ status: 'cancelled', cancelledBy: 'shop', updatedAt: serverTimestamp() }));
    await assertFails(staff().doc('orders/o2').update({ status: 'cancelled', cancelledBy: 'customer', updatedAt: serverTimestamp() }));
  });
  it('người ngoài không đổi được trạng thái', async () => {
    await assertFails(notStaff().doc('orders/o1').update({ status: 'confirmed', updatedAt: serverTimestamp() }));
  });
});

describe('staff, throttle, collection lạ (zombie API)', () => {
  it('nhân viên đọc được doc staff của chính mình; không ai tự cấp quyền', async () => {
    await assertSucceeds(staff().doc('staff/staff1').get());
    await assertFails(anon('cust1').doc('staff/staff1').get());
    await assertFails(staff().collection('staff').get());
    await assertFails(env.authenticatedContext('hacker', PASSWORD).firestore().doc('staff/hacker').set({ name: 'me' }));
  });
  it('không ai đọc được throttle', async () => {
    await assertFails(anon('cust1').doc('throttle/cust1').get());
    await assertFails(staff().doc('throttle/cust1').get());
  });
  it('collection không khai báo bị chặn hoàn toàn', async () => {
    for (const db of [guest(), anon(), staff()]) {
      await assertFails(db.doc('users/u1').get());
      await assertFails(db.doc('debug/x').set({ a: 1 }));
      await assertFails(db.collection('reviews').limit(1).get());
    }
  });
});

describe('freeship', () => {
  beforeEach(() => seed((db) => db.doc('settings/shop').update({ freeShipFrom: 50000 })));
  it('đủ ngưỡng: phí ship phải = 0', async () => {
    await assertSucceeds(placeOrder(anon(), 'cust1', 'o1', order('cust1', { deliveryFee: 0, total: 60000 })));
  });
  it('đủ ngưỡng mà vẫn tính phí → từ chối (không thu nhầm tiền khách)', async () => {
    await assertFails(placeOrder(anon(), 'cust1', 'o1', order('cust1', { deliveryFee: 15000, total: 75000 })));
  });
  it('chưa đủ ngưỡng mà tự cho phí 0 → từ chối', async () => {
    const small = order('cust1', {
      items: [{ productId: 'p1', name: 'Trà sữa', price: 30000, qty: 1, options: [] }],
      itemCount: 1,
      subtotal: 30000,
      deliveryFee: 0,
      total: 30000,
    });
    await assertFails(placeOrder(anon(), 'cust1', 'o1', small));
  });
});

describe('thanh toán chuyển khoản', () => {
  it('tiệm chưa khai báo tài khoản → không nhận đơn chuyển khoản', async () => {
    await assertFails(placeOrder(anon(), 'cust1', 'o1', order('cust1', { paymentMethod: 'transfer' })));
  });
  it('tiệm đã khai báo tài khoản → nhận đơn chuyển khoản', async () => {
    await seed((db) => db.doc('settings/shop').update({ bankBin: '970436', bankAccount: '0123456789' }));
    await assertSucceeds(placeOrder(anon(), 'cust1', 'o1', order('cust1', { paymentMethod: 'transfer' })));
  });
  it('chỉ nhân viên được đánh dấu "đã nhận tiền"', async () => {
    await seed((db) => db.doc('orders/o1').set({ ...order('cust1'), createdAt: Timestamp.now(), updatedAt: Timestamp.now() }));
    await assertFails(anon('cust1').doc('orders/o1').update({ paid: true, updatedAt: serverTimestamp() }));
    await assertFails(staff().doc('orders/o1').update({ paid: 'yes', updatedAt: serverTimestamp() }));
    await assertSucceeds(staff().doc('orders/o1').update({ paid: true, updatedAt: serverTimestamp() }));
  });
  it('đơn cũ (tạo trước khi có field paid) nhân viên vẫn xử lý được', async () => {
    const { paymentMethod, paid, ...legacy } = order('cust1');
    await seed((db) => db.doc('orders/old').set({ ...legacy, createdAt: Timestamp.now(), updatedAt: Timestamp.now() }));
    await assertSucceeds(staff().doc('orders/old').update({ status: 'confirmed', updatedAt: serverTimestamp() }));
  });
  it('cấu hình ngân hàng sai định dạng → từ chối', async () => {
    const base = { ...SHOP, updatedAt: serverTimestamp() };
    await assertSucceeds(staff().doc('settings/shop').set({ ...base, bankBin: '970436', bankAccount: '0123456789', bankAccountName: 'NGUYEN VAN A' }));
    await assertFails(staff().doc('settings/shop').set({ ...base, bankBin: 'VCB', bankAccount: '0123456789' }));
    await assertFails(staff().doc('settings/shop').set({ ...base, bankBin: '970436', bankAccount: '<script>' }));
    await assertFails(staff().doc('settings/shop').set({ ...base, freeShipFrom: -1 }));
  });
});

describe('tuỳ chọn món', () => {
  const group = (i) => ({ id: 'g' + i, name: 'Nhóm ' + i, multi: false, required: true, choices: [{ id: 'a', name: 'A', price: 0 }] });
  it('nhân viên lưu món có tuỳ chọn được, tối đa 8 nhóm', async () => {
    await assertSucceeds(staff().collection('products').add(product({ options: [group(1), group(2)] })));
    await assertFails(staff().collection('products').add(product({ options: Array.from({ length: 9 }, (_, i) => group(i)) })));
    await assertFails(staff().collection('products').add(product({ options: 'size L' })));
  });
});
