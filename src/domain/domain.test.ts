import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { OptionGroup, Order, Product } from '@/types/domain';
import { MAX_LINES, MAX_NOTE, MAX_QTY_PER_ITEM, addLine, describeChanges, mergeCarts, qtyOfProduct, reconcileLines, setLineQty, subtotalOf, updateLine, type CartLine } from './cart';
import { NEXT_STATUSES, canTransition, nextForwardStatus } from './orderStatus';
import { allowedPayments, auditOrder, deliveryFeeFor, freeShipRemaining, makeOrderCode, shipsToDriver } from './pricing';
import { DRINK_PRESET, defaultSelection, missingRequired, optionsTotal, selectionFromOptions, toggleChoice, toSelectedOptions } from './options';
import { buildVietQR, crc16ccitt, transferNote } from './vietqr';
import { afterHoursNote, parseOpenHours, shopPhase } from './hours';
import { CUSTOMER_CANCEL_REASONS, SHOP_CANCEL_REASONS, cancelReasonLabel, validateCancel } from './cancelReasons';
import { ORDER_FIELDS, buildOrderPayload } from './orderPayload';
import { checkoutSchema, profileSchema, signUpSchema, PHONE_RE } from '@/schemas/checkout.schema';
import { productSchema, settingsSchema } from '@/schemas/product.schema';
import { DEFAULT_SETTINGS } from '@/config/catalog';
import { toOrder, toProduct, toUserDoc } from '@/services/mappers';

const rules = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');

const product = (over: Partial<Product> = {}): Product => ({
  id: 'p1',
  name: 'Trà sữa',
  description: '',
  price: 30000,
  category: 'drink',
  imageUrl: '',
  available: true,
  featured: false,
  sortOrder: 1,
  hidden: false,
  options: [],
  updatedAt: null,
  ...over,
});

describe('gộp giỏ khi đăng nhập + ghi chú món', () => {
  const tea = product({ options: DRINK_PRESET });
  const sel = (sugar: string) => toSelectedOptions(tea, { ...defaultSelection(tea), sugar: [sugar] });

  it('cùng món, cùng tuỳ chọn → giữ số lượng lớn hơn (7 và 5 → 7)', () => {
    const acc = addLine([], tea, 7, sel('100')).lines;
    const guest = addLine([], tea, 5, sel('100')).lines;
    const r = mergeCarts(acc, guest);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].qty).toBe(7);
    expect(mergeCarts(guest, acc).lines[0].qty).toBe(7);
  });

  it('khác dù 1 tuỳ chọn (100% vs 70% đường) → 2 dòng', () => {
    const r = mergeCarts(addLine([], tea, 7, sel('100')).lines, addLine([], tea, 5, sel('70')).lines);
    expect(r.lines.map((l) => l.qty)).toEqual([7, 5]);
  });

  it('ghi chú khác → dòng riêng; ghi chú chỉ khác khoảng trắng/hoa thường → cùng dòng', () => {
    let { lines } = addLine([], tea, 1, sel('100'), 'ít đá');
    ({ lines } = addLine(lines, tea, 1, sel('100'), '  Ít   đá '));
    expect(lines).toHaveLength(1);
    expect(lines[0].qty).toBe(2);
    ({ lines } = addLine(lines, tea, 1, sel('100'), 'không đá'));
    expect(lines).toHaveLength(2);
  });

  it('món chưa có → thêm vào như thường; ghi chú đi theo đơn', () => {
    const r = mergeCarts(addLine([], tea, 1, sel('100')).lines, addLine([], product({ id: 'p2', name: 'Flan' }), 2, [], 'thêm caramel').lines);
    expect(r.added).toBe(1);
    expect(r.lines[1].note).toBe('thêm caramel');
    const payload = buildOrderPayload(
      { lines: r.lines, customer: { name: 'Lan', phone: '0901234567', address: '', note: '' }, fulfillment: 'pickup', paymentMethod: 'cod', settings: { deliveryFee: 15000, freeShipFrom: 0 } },
      'u1',
    );
    expect(payload.items[1].note).toBe('thêm caramel');
  });
});

describe('giỏ hàng', () => {
  it('thêm món mới và cộng dồn món trùng', () => {
    let { lines } = addLine([], product(), 2);
    ({ lines } = addLine(lines, product(), 3));
    expect(lines).toHaveLength(1);
    expect(lines[0]!.qty).toBe(5);
  });

  it('không cho thêm món tạm hết', () => {
    const r = addLine([], product({ available: false }));
    expect(r.result).toBe('unavailable');
    expect(r.lines).toHaveLength(0);
  });

  it(`giới hạn ${MAX_QTY_PER_ITEM} phần mỗi món`, () => {
    const r = addLine([], product(), MAX_QTY_PER_ITEM + 5);
    expect(r.result).toBe('capped');
    expect(r.lines[0]!.qty).toBe(MAX_QTY_PER_ITEM);
  });

  it(`giới hạn ${MAX_LINES} món khác nhau (khớp rules)`, () => {
    let lines: CartLine[] = [];
    for (let i = 0; i < MAX_LINES; i++) lines = addLine(lines, product({ id: `p${i}` })).lines;
    expect(addLine(lines, product({ id: 'extra' })).result).toBe('full');
    expect(rules).toContain(`d.items.size() <= ${MAX_LINES}`);
  });

  it('đặt số lượng 0 thì bỏ món, số âm / số lẻ được làm tròn an toàn', () => {
    const { lines } = addLine([], product(), 2);
    expect(setLineQty(lines, lines[0]!.key, 0)).toHaveLength(0);
    expect(setLineQty(lines, lines[0]!.key, -3)).toHaveLength(0);
    expect(setLineQty(lines, lines[0]!.key, 2.7)[0]!.qty).toBe(2);
  });

  it('đối chiếu menu: báo món bị bỏ và món đổi giá', () => {
    const { lines } = addLine(addLine([], product()).lines, product({ id: 'p2', name: 'Flan' }));
    const r = reconcileLines(lines, [product({ price: 35000 })]);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0]!.price).toBe(35000);
    expect(r.changes).toEqual([
      { name: 'Trà sữa', kind: 'price_changed' },
      { name: 'Flan', kind: 'removed' },
    ]);
  });
});

describe('máy trạng thái đơn', () => {
  it('khớp với nextStatuses() trong firestore.rules', () => {
    for (const [from, tos] of Object.entries(NEXT_STATUSES)) {
      const list = tos.map((t) => `'${t}'`).join(', ');
      expect(rules).toContain(`'${from}': [${list}]`);
    }
  });

  it('không nhảy cóc, không quay lại, không sửa đơn đã xong', () => {
    expect(canTransition('new', 'confirmed')).toBe(true);
    expect(canTransition('new', 'done')).toBe(false);
    expect(canTransition('preparing', 'confirmed')).toBe(false);
    expect(canTransition('done', 'cancelled')).toBe(false);
    expect(nextForwardStatus('delivering')).toBe('done');
    expect(nextForwardStatus('done')).toBeNull();
  });
});

const SHIP = { deliveryFee: 15000, freeShipFrom: 0 };

describe('payload đơn hàng', () => {
  const lines = addLine(addLine([], product(), 2).lines, product({ id: 'p2', name: 'Flan', price: 18000 })).lines;
  const customer = { name: ' Lan ', phone: '0901234567', address: ' 12 Lê Lợi ', note: '' };

  it('đúng các field mà rules cho phép (keys().hasOnly)', () => {
    const p = buildOrderPayload({ lines, customer, fulfillment: 'delivery', paymentMethod: 'cod', settings: SHIP }, 'uid1', 'NB-AAAAA');
    const keys = [...Object.keys(p), 'createdAt', 'updatedAt'].sort();
    expect(keys).toEqual([...ORDER_FIELDS].sort());
    for (const f of ORDER_FIELDS) expect(rules).toContain(`'${f}'`);
  });

  it('tự tính tiền, phí ship chỉ khi giao hàng, cắt khoảng trắng', () => {
    const d = buildOrderPayload({ lines, customer, fulfillment: 'delivery', paymentMethod: 'cod', settings: SHIP }, 'u');
    expect(d.subtotal).toBe(78000);
    expect(d.total).toBe(93000);
    expect(d.itemCount).toBe(3);
    expect(d.customer.name).toBe('Lan');
    expect(d.paid).toBe(false);
    const pickup = buildOrderPayload({ lines, customer, fulfillment: 'pickup', paymentMethod: 'transfer', settings: SHIP }, 'u');
    expect(pickup.paymentMethod).toBe('transfer');
    expect(pickup.deliveryFee).toBe(0);
    expect(pickup.customer.address).toBe('');
  });

  it('mã đơn không có ký tự dễ nhầm', () => {
    for (let i = 0; i < 200; i++) expect(makeOrderCode()).toMatch(/^NB-[2-9A-HJKMNP-Z]{5}$/);
  });
});

describe('kiểm tra giá đơn (dashboard)', () => {
  const order: Pick<Order, 'items' | 'subtotal' | 'deliveryFee' | 'total'> = {
    items: [{ productId: 'p1', name: 'Trà sữa', price: 30000, qty: 2, options: [] }],
    subtotal: 60000,
    deliveryFee: 15000,
    total: 75000,
  };
  it('đơn đúng → không có cảnh báo', () => expect(auditOrder(order, [product()])).toEqual([]));
  it('giá bị sửa ở client → bị phát hiện', () => {
    const hacked = { ...order, items: [{ ...order.items[0]!, price: 1000 }], subtotal: 2000, total: 17000 };
    expect(auditOrder(hacked, [product()]).map((i) => i.kind)).toEqual(['price_differs']);
  });
  it('tổng tiền không khớp → bị phát hiện', () => {
    expect(auditOrder({ ...order, subtotal: 1 }, [product()]).map((i) => i.kind)).toEqual(['subtotal_mismatch', 'total_mismatch']);
  });
});

describe('form & validate (khớp rules)', () => {
  const who = { name: 'Lan', phone: '090 123 4567', address: '12 Lê Lợi, Q1' };
  const base = { fulfillment: 'pickup' as const, paymentMethod: 'cod' as const, note: '', ...who, saveAddress: false };

  it('chuẩn hoá số điện thoại, regex giống rules', () => {
    expect(profileSchema.parse(who).phone).toBe('0901234567');
    expect(rules).toContain(PHONE_RE.source.replace(/\\/g, '\\\\'));
  });

  it('từ chối số điện thoại sai và địa chỉ quá ngắn', () => {
    expect(profileSchema.safeParse({ ...who, phone: '12345' }).success).toBe(false);
    expect(profileSchema.safeParse({ ...who, address: '' }).success).toBe(false);
  });

  it('bỏ thẻ HTML + ký tự điều khiển (phòng XSS lớp 2) và chặn CSV/Excel injection', () => {
    expect(profileSchema.parse({ ...who, name: '<script>Lan</script>' }).name).toBe('Lan');
    expect(checkoutSchema.parse({ ...base, note: 'Ít đá, ít ngọt <b>nhé</b>' }).note).toBe('Ít đá, ít ngọt nhé');
    expect(checkoutSchema.parse({ ...base, note: '=HYPERLINK("http://x")' }).note).toBe('HYPERLINK("http://x")');
    expect(checkoutSchema.parse({ ...base, note: '<img src=x onerror=alert(1)>ngon' }).note).toBe('ngon');
  });

  it('đặt ship bắt buộc địa chỉ, ghé lấy thì không', () => {
    expect(checkoutSchema.safeParse({ ...base, fulfillment: 'delivery', address: '' }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, fulfillment: 'pickup', address: '' }).success).toBe(true);
  });

  it('đăng ký: email hợp lệ, mật khẩu ≥ 8 ký tự có cả chữ và số', () => {
    expect(signUpSchema.safeParse({ email: 'Lan@Gmail.com ', password: 'abc12345' }).data?.email).toBe('lan@gmail.com');
    expect(signUpSchema.safeParse({ email: 'lan@gmail.com', password: 'abc123' }).success).toBe(false);
    expect(signUpSchema.safeParse({ email: 'lan@gmail.com', password: 'abcdefgh' }).success).toBe(false);
    expect(signUpSchema.safeParse({ email: 'lan@gmail.com', password: '12345678' }).success).toBe(false);
    expect(signUpSchema.safeParse({ email: 'khong-phai-email', password: 'abc12345' }).success).toBe(false);
  });

  it('cài đặt ngân hàng: nhận đúng 6 số BIN + số tài khoản (lỗi cũ: regex mất dấu \ nên không lưu được)', () => {
    const base = { ...DEFAULT_SETTINGS, name: 'Tiệm', hotline: '', deliveryFee: 15000, freeShipFrom: 0, minOrder: 0 };
    const ok = settingsSchema.safeParse({ ...base, bankBin: '970436', bankAccount: '0123 456.789' });
    expect(ok.success).toBe(true);
    expect(ok.data?.bankAccount).toBe('0123456789');
    expect(settingsSchema.safeParse({ ...base, bankBin: 'dddddd' }).success).toBe(false);
    // Bắt chuyển khoản trước mà chưa có tài khoản → chặn (giống rules)
    expect(settingsSchema.safeParse({ ...base, shipPrepaid: true }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...base, shipPrepaid: true, bankBin: '970436', bankAccount: '0123456789' }).success).toBe(true);
  });

  it('link ảnh chỉ nhận https (chặn javascript: / http:)', () => {
    const p = { name: 'A', description: '', price: '1000', category: 'drink', available: true, featured: false, sortOrder: '1', hidden: false, options: [] };
    expect(productSchema.safeParse({ ...p, imageUrl: 'javascript:alert(1)' }).success).toBe(false);
    expect(productSchema.safeParse({ ...p, imageUrl: 'http://x.com/a.png' }).success).toBe(false);
    expect(productSchema.safeParse({ ...p, imageUrl: 'https://x.com/a.png' }).success).toBe(true);
  });
});

describe('mapper (dữ liệu sửa tay trong Console)', () => {
  it('thiếu field / sai kiểu → giá trị mặc định an toàn, không crash', () => {
    const p = toProduct('x', { name: 123, price: 'abc', category: 'pizza' });
    expect(p).toMatchObject({ name: 'Món chưa đặt tên', price: 0, category: 'snack', available: true });
    const o = toOrder('abcdef123', { status: 'hacked', items: 'nope' });
    expect(o).toMatchObject({ status: 'new', items: [], code: 'ABCDEF' });
  });

  it('menu cache do bản cũ ghi (chưa có options, updatedAt là chuỗi) → options = [], không vỡ trang chủ', () => {
    const old = JSON.parse(JSON.stringify({ id: 'a1', name: 'Trà sữa', price: 35000, category: 'drink', updatedAt: new Date() }));
    const p = toProduct(old.id, old);
    expect(p.options).toEqual([]);
    expect(p.updatedAt).toBeNull();
    expect(p.hidden).toBe(false);
  });

  it('sổ địa chỉ: bỏ địa chỉ hỏng, tối đa 5, mặc định trỏ về địa chỉ có thật', () => {
    const a = (i: number) => ({ id: `a${i}`, name: `Người ${i}`, phone: '0901234567', address: 'x' });
    const d = toUserDoc({ addresses: [a(1), { id: 'bad' }, a(2), a(3), a(4), a(5), a(6)], defaultAddressId: 'khong-co' });
    expect(d.addresses.map((x) => x.id)).toEqual(['a1', 'a2', 'a3', 'a4', 'a5']);
    expect(d.defaultAddressId).toBe('a1');
    expect(toUserDoc(undefined)).toEqual({ addresses: [], defaultAddressId: '' });
  });

  it('subtotalOf', () => expect(subtotalOf([{ price: 1000, qty: 3 }])).toBe(3000));
});

describe('tuỳ chọn món (size / đường / topping)', () => {
  const tea = product({ options: DRINK_PRESET });

  it('mặc định chọn sẵn lựa chọn đầu của nhóm bắt buộc, topping để trống', () => {
    const sel = defaultSelection(tea);
    expect(sel).toEqual({ size: ['m'], sugar: ['100'], ice: ['normal'], topping: [] });
    expect(missingRequired(tea, sel)).toEqual([]);
    expect(missingRequired(tea, { ...sel, size: [] })).toEqual(['Size']);
  });

  it('chọn 1 thì thay, chọn nhiều thì bật/tắt; giá = món + tuỳ chọn', () => {
    let sel = defaultSelection(tea);
    const [size, , , topping] = DRINK_PRESET as [OptionGroup, OptionGroup, OptionGroup, OptionGroup];
    sel = toggleChoice(sel, size, 'l');
    sel = toggleChoice(sel, topping, 'pearl');
    sel = toggleChoice(sel, topping, 'cheese');
    sel = toggleChoice(sel, topping, 'pearl');
    const opts = toSelectedOptions(tea, sel);
    expect(opts.map((o) => o.choice)).toEqual(['l', '100', 'normal', 'cheese']);
    expect(tea.price + optionsTotal(opts)).toBe(30000 + 6000 + 10000);
  });

  it('cùng món khác tuỳ chọn = 2 dòng giỏ; cùng tuỳ chọn = cộng dồn', () => {
    const m = toSelectedOptions(tea, defaultSelection(tea));
    const l = toSelectedOptions(tea, { ...defaultSelection(tea), size: ['l'] });
    let { lines } = addLine([], tea, 1, m);
    ({ lines } = addLine(lines, tea, 1, l));
    ({ lines } = addLine(lines, tea, 2, m));
    expect(lines.map((x) => [x.qty, x.price])).toEqual([
      [3, 30000],
      [1, 36000],
    ]);
  });

  it('menu đổi giá topping → giỏ cập nhật giá; xoá lựa chọn → bỏ dòng và báo', () => {
    const opts = toSelectedOptions(tea, { ...defaultSelection(tea), topping: ['cheese'] });
    const { lines } = addLine([], tea, 1, opts);
    const withPrice = (delta: number) =>
      DRINK_PRESET.map((g) => (g.id === 'topping' ? { ...g, choices: g.choices.map((c) => ({ ...c, price: c.price + delta })) } : g));
    expect(reconcileLines(lines, [product({ options: withPrice(2000) })]).lines[0]!.price).toBe(30000 + 12000);
    const noCheese = DRINK_PRESET.map((g) => (g.id === 'topping' ? { ...g, choices: g.choices.filter((c) => c.id !== 'cheese') } : g));
    expect(reconcileLines(lines, [product({ options: noCheese })])).toEqual({ lines: [], changes: [{ name: 'Trà sữa', kind: 'options_changed' }] });
  });

  it('dashboard phát hiện giá tuỳ chọn bị sửa / tuỳ chọn không tồn tại', () => {
    const opts = toSelectedOptions(tea, { ...defaultSelection(tea), size: ['l'] });
    const item = { productId: 'p1', name: 'Trà sữa', price: 36000, qty: 1, options: opts };
    const ok = { items: [item], subtotal: 36000, deliveryFee: 0, total: 36000 };
    expect(auditOrder(ok, [tea])).toEqual([]);
    const cheap = { items: [{ ...item, price: 30000, options: opts.map((o) => ({ ...o, price: 0 })) }], subtotal: 30000, deliveryFee: 0, total: 30000 };
    expect(auditOrder(cheap, [tea]).map((i) => i.kind)).toEqual(['price_differs']);
    const fake = { ...ok, items: [{ ...item, options: [{ group: 'size', choice: 'xxl', name: 'XXL', price: 0 }] }] };
    expect(auditOrder(fake, [tea]).map((i) => i.kind)).toEqual(['unknown_option']);
  });
});

describe('freeship', () => {
  const s = { deliveryFee: 15000, freeShipFrom: 150000, shipFeeMode: 'flat' as const };
  it('đủ ngưỡng thì 0đ, thiếu thì tính phí, ghé lấy luôn 0đ, tắt freeship = luôn tính phí', () => {
    expect(deliveryFeeFor(150000, 'delivery', s)).toBe(0);
    expect(deliveryFeeFor(149999, 'delivery', s)).toBe(15000);
    expect(deliveryFeeFor(10, 'pickup', s)).toBe(0);
    expect(deliveryFeeFor(999999, 'delivery', { ...s, freeShipFrom: 0 })).toBe(15000);
    expect(freeShipRemaining(120000, s)).toBe(30000);
    expect(freeShipRemaining(200000, s)).toBeNull();
  });
  it('payload đơn tự áp freeship', () => {
    const { lines } = addLine([], product({ price: 50000 }), 3);
    const customer = { name: 'Lan', phone: '0901234567', address: '12 Lê Lợi', note: '' };
    const d = buildOrderPayload({ lines, customer, fulfillment: 'delivery', paymentMethod: 'cod', settings: s }, 'u');
    expect([d.subtotal, d.deliveryFee, d.total]).toEqual([150000, 0, 150000]);
    expect(d.shipToDriver).toBe(false);
  });
  it('phí ship "trả tài xế": tiệm không thu phí ship, đơn đánh dấu shipToDriver, không gợi ý freeship', () => {
    const drv = { ...s, shipFeeMode: 'driver' as const };
    expect(deliveryFeeFor(20000, 'delivery', drv)).toBe(0);
    expect(shipsToDriver('delivery', drv)).toBe(true);
    expect(shipsToDriver('pickup', drv)).toBe(false);
    expect(freeShipRemaining(20000, drv)).toBeNull();
    const { lines } = addLine([], product({ price: 20000 }), 1);
    const customer = { name: 'Lan', phone: '0901234567', address: '12 Lê Lợi', note: '' };
    const d = buildOrderPayload({ lines, customer, fulfillment: 'delivery', paymentMethod: 'cod', settings: drv }, 'u');
    expect([d.deliveryFee, d.total, d.shipToDriver]).toEqual([0, 20000, true]);
    expect(rules).toContain("s.get('shipFeeMode', 'flat') == 'driver' ? 0");
  });
});

describe('cách thanh toán được phép (khớp rules)', () => {
  const bank = { bankBin: '970436', bankAccount: '0123456789', shipPrepaid: false };
  it('chưa có tài khoản ngân hàng → chỉ tiền mặt', () => {
    expect(allowedPayments('delivery', { ...bank, bankAccount: '' })).toEqual(['cod']);
  });
  it('có tài khoản → tiền mặt + chuyển khoản', () => {
    expect(allowedPayments('delivery', bank)).toEqual(['cod', 'transfer']);
  });
  it('bật "đơn ship phải chuyển khoản trước" → ship chỉ chuyển khoản, ghé lấy vẫn tiền mặt được', () => {
    expect(allowedPayments('delivery', { ...bank, shipPrepaid: true })).toEqual(['transfer']);
    expect(allowedPayments('pickup', { ...bank, shipPrepaid: true })).toEqual(['cod', 'transfer']);
    expect(rules).toContain("s.get('shipPrepaid', false) == true && d.paymentMethod != 'transfer'");
  });
  it('rules dùng cùng công thức (freeShipFrom > 0 && subtotal >= freeShipFrom)', () => {
    expect(rules).toContain("s.get('freeShipFrom', 0) > 0 && d.subtotal >= s.get('freeShipFrom', 0)");
  });
});

describe('VietQR', () => {
  it('CRC16-CCITT đúng test vector chuẩn (123456789 → 29B1)', () => {
    expect(crc16ccitt('123456789')).toBe('29B1');
  });
  it('chuỗi đúng cấu trúc EMVCo/NAPAS, CRC tự kiểm', () => {
    const qr = buildVietQR({ bin: '970436', account: '0123456789', amount: 103000, note: 'NB-5NBP5' });
    expect(qr.startsWith('000201010212')).toBe(true);
    expect(qr).toContain('0010A000000727');
    expect(qr).toContain('0006970436' + '01100123456789');
    expect(qr).toContain('0208QRIBFTTA');
    expect(qr).toContain('5303704' + '5406103000' + '5802VN');
    expect(qr).toContain('62120808NB-5NBP5');
    expect(qr.slice(-4)).toBe(crc16ccitt(qr.slice(0, -4)));
  });
  it('nội dung CK bỏ dấu / ký tự lạ; từ chối BIN / số TK sai', () => {
    expect(transferNote('Đơn #NB-ABC <x>')).toBe('Don NB-ABC x');
    expect(() => buildVietQR({ bin: '123', account: '0123456789', amount: 1, note: '' })).toThrow();
    expect(() => buildVietQR({ bin: '970436', account: '12ab', amount: 1, note: '' })).toThrow();
  });
});

describe('giờ mở cửa (theo giờ Việt Nam)', () => {
  // 2026-11-26 là ngày thường; giờ VN = UTC+7
  const at = (hh: number, mm = 0) => new Date(Date.UTC(2026, 10, 26, hh - 7, mm));
  it('đọc được nhiều kiểu chủ tiệm hay gõ', () => {
    expect(parseOpenHours('8:00 – 22:00 hằng ngày')).toEqual({ open: 480, close: 1320 });
    expect(parseOpenHours('8h - 22h')).toEqual({ open: 480, close: 1320 });
    expect(parseOpenHours('Mở 7h30 đến 21h')).toEqual({ open: 450, close: 1260 });
    expect(parseOpenHours('18h-2h')).toEqual({ open: 1080, close: 120 });
    expect(parseOpenHours('Mở cả ngày')).toBeNull();
  });
  it('trong giờ → mở; tắt nhận đơn → tạm nghỉ; không đọc được giờ → coi như mở', () => {
    const s = { isOpen: true, openHours: '8:00 – 22:00' };
    expect(shopPhase(s, at(10)).kind).toBe('open');
    expect(shopPhase({ ...s, isOpen: false }, at(10)).kind).toBe('paused');
    expect(shopPhase({ ...s, openHours: 'Liên hệ' }, at(3)).kind).toBe('open');
  });
  it('1h sáng / 23h → ngoài giờ, báo "ngày mai"; 6h sáng → "lát nữa mở cửa"', () => {
    const s = { isOpen: true, openHours: '8:00 – 22:00' };
    expect(shopPhase(s, at(1))).toEqual({ kind: 'after-hours', opensAt: '8:00', tomorrow: true });
    expect(shopPhase(s, at(23))).toEqual({ kind: 'after-hours', opensAt: '8:00', tomorrow: true });
    expect(shopPhase(s, at(6))).toEqual({ kind: 'after-hours', opensAt: '8:00', tomorrow: false });
    expect(afterHoursNote({ kind: 'after-hours', opensAt: '8:00', tomorrow: true })).toContain('ngày mai tiệm sẽ xác nhận');
    expect(afterHoursNote({ kind: 'after-hours', opensAt: '8:00', tomorrow: true })).not.toContain('8:00');
  });
  it('ca qua đêm 18h–2h: 1h sáng vẫn mở, 15h là ngoài giờ', () => {
    const s = { isOpen: true, openHours: '18h - 2h' };
    expect(shopPhase(s, at(1)).kind).toBe('open');
    expect(shopPhase(s, at(15)).kind).toBe('after-hours');
  });
});

describe('dòng món trong đơn: số lượng và độ dài (BUG-001/002)', () => {
  const line = (qty: number) => ({ productId: 'p1', name: 'Trà sữa', price: 30000, qty, options: [], note: '' });
  const audit = (items: ReturnType<typeof line>[]) => {
    const subtotal = subtotalOf(items);
    return auditOrder({ items, subtotal, deliveryFee: 0, total: subtotal }, [product()]).map((i) => i.kind);
  };
  it('số lượng âm / 0 / số lẻ / quá giới hạn → dashboard cảnh báo dù tạm tính vẫn khớp', () => {
    expect(audit([line(3), line(-2)])).toEqual(['bad_qty']);
    expect(audit([line(0.5)])).toEqual(['bad_qty']);
    expect(audit([line(0)])).toEqual(['bad_qty']);
    expect(audit([line(MAX_QTY_PER_ITEM + 1)])).toEqual(['bad_qty']);
    expect(audit([line(1), line(MAX_QTY_PER_ITEM)])).toEqual([]);
  });
  it('số món ghi trên đơn (itemCount) khác tổng số lượng → dashboard cảnh báo', () => {
    const items = [line(2)];
    const o = { items, itemCount: 300, subtotal: 60000, deliveryFee: 0, total: 60000 };
    expect(auditOrder(o, [product()]).map((i) => i.kind)).toEqual(['count_mismatch']);
    expect(auditOrder({ ...o, itemCount: 2 }, [product()])).toEqual([]);
  });
  it('tên món > 80 hoặc ghi chú > 100 ký tự → dashboard cảnh báo', () => {
    const items = [{ ...line(1), note: 'x'.repeat(MAX_NOTE + 1) }, { ...line(1), name: 'y'.repeat(81) }];
    expect(audit(items)).toEqual(['long_text', 'long_text']);
    expect(audit([{ ...line(1), note: 'x'.repeat(MAX_NOTE) }])).toEqual([]);
  });
});

describe('món vừa tắt / số lượng theo món (kiểu app đồ ăn)', () => {
  const tea = product({ id: 'tea', name: 'Trà sữa', options: DRINK_PRESET });
  const flan = product({ id: 'flan', name: 'Flan', price: 18000 });
  const sizeM = toSelectedOptions(tea, defaultSelection(tea));
  const sizeL = sizeM.map((o) => (o.group === 'size' ? { ...o, choice: 'l', name: 'Size L' } : o));

  it('2 Size M + 3 Size L → thẻ món hiện 5, giỏ vẫn giữ 2 dòng riêng', () => {
    let lines = addLine([], tea, 2, sizeM).lines;
    lines = addLine(lines, tea, 3, sizeL).lines;
    lines = addLine(lines, flan, 1).lines;
    expect(lines.filter((l) => l.productId === 'tea').map((l) => l.qty)).toEqual([2, 3]);
    expect(qtyOfProduct(lines, 'tea')).toBe(5);
    expect(qtyOfProduct(lines, 'flan')).toBe(1);
    expect(qtyOfProduct(lines, 'khong-co')).toBe(0);
  });

  it('món tiệm vừa tắt (tạm hết) / ẩn → đối chiếu bỏ khỏi giỏ, báo rõ tên món', () => {
    const lines = addLine(addLine([], tea, 1, sizeM).lines, flan, 2).lines;
    const r = reconcileLines(lines, [tea, { ...flan, available: false }]);
    expect(r.lines.map((l) => l.productId)).toEqual(['tea']);
    expect(describeChanges(r.changes)).toBe('Đã bỏ khỏi giỏ vì vừa tạm hết: Flan');
    expect(describeChanges(reconcileLines(lines, [tea]).changes)).toContain('Flan'); // bị ẩn = không còn trong menu khách
  });

  it('dashboard cảnh báo đơn có món đang tạm hết / ẩn', () => {
    const lines = addLine([], flan, 1).lines;
    const o = buildOrderPayload({ lines, customer: { name: 'Lan', phone: '0901234567', address: '12 Lê Lợi', note: '' }, fulfillment: 'pickup', paymentMethod: 'cod', settings: { deliveryFee: 0, freeShipFrom: 0, shipFeeMode: 'flat' } }, 'u');
    expect(auditOrder(o, [flan])).toEqual([]);
    expect(auditOrder(o, [{ ...flan, available: false }])).toEqual([{ kind: 'unavailable', name: 'Flan', hidden: false }]);
    expect(auditOrder(o, [{ ...flan, hidden: true }])).toEqual([{ kind: 'unavailable', name: 'Flan', hidden: true }]);
  });
});

describe('sửa món đã chọn (kiểu GrabFood: bấm vào dòng cũ để sửa)', () => {
  const tea = product({ id: 'tea', name: 'Trà sữa', options: DRINK_PRESET });
  const sizeM = toSelectedOptions(tea, defaultSelection(tea));
  const sizeL = sizeM.map((o) => (o.group === 'size' ? { ...o, choice: 'l', name: 'Size L', price: 6000 } : o));

  it('mở lại form đúng lựa chọn cũ', () => {
    expect(toSelectedOptions(tea, selectionFromOptions(tea, sizeM))).toEqual(sizeM);
    expect(selectionFromOptions(tea, [{ group: 'size', choice: 'khong-con' }]).size).toEqual([]);
  });

  it('đổi Size M → L, thêm ghi chú, đổi số lượng: giữ vị trí dòng, giá tính lại', () => {
    const flan = product({ id: 'flan', name: 'Flan' });
    let lines = addLine([], tea, 2, sizeM).lines;
    lines = addLine(lines, flan, 1).lines;
    const r = updateLine(lines, lines[0]!.key, tea, 3, sizeL, 'ít đá');
    expect(r.result).toBe('updated');
    expect(r.lines.map((l) => [l.productId, l.qty, l.note])).toEqual([['tea', 3, 'ít đá'], ['flan', 1, '']]);
    expect(r.lines[0]!.price).toBe(tea.price + optionsTotal(sizeL));
  });

  it('sửa thành y hệt dòng khác → gộp thành 1 dòng, cộng số lượng', () => {
    let lines = addLine([], tea, 2, sizeM).lines;
    lines = addLine(lines, tea, 3, sizeL).lines;
    const r = updateLine(lines, lines[1]!.key, tea, 3, sizeM);
    expect(r.result).toBe('merged');
    expect(r.lines.map((l) => l.qty)).toEqual([5]);
  });

  it('món đã tạm hết → không sửa được (chỉ xem)', () => {
    const lines = addLine([], tea, 1, sizeM).lines;
    expect(updateLine(lines, lines[0]!.key, { ...tea, available: false }, 2, sizeM).result).toBe('unavailable');
  });
});

describe('lý do huỷ đơn (khớp rules)', () => {
  it('mọi id lý do của khách / tiệm đều có trong firestore.rules', () => {
    for (const r of [...CUSTOMER_CANCEL_REASONS, ...SHOP_CANCEL_REASONS]) expect(rules).toContain(`'${r.id}'`);
  });
  it('bắt buộc chọn lý do; "Lý do khác" bắt buộc ghi chú; ghi chú ≤ 200', () => {
    expect(validateCancel('', '', CUSTOMER_CANCEL_REASONS)).toMatch(/chọn giúp lý do/);
    expect(validateCancel('sold_out', '', CUSTOMER_CANCEL_REASONS)).toMatch(/chọn giúp lý do/); // lý do của tiệm, khách không dùng được
    expect(validateCancel('other', '  ', CUSTOMER_CANCEL_REASONS)).toMatch(/Lý do khác/);
    expect(validateCancel('other', 'Đi công tác', CUSTOMER_CANCEL_REASONS)).toBeNull();
    expect(validateCancel('changed_mind', '', CUSTOMER_CANCEL_REASONS)).toBeNull();
    expect(validateCancel('sold_out', 'x'.repeat(201), SHOP_CANCEL_REASONS)).toMatch(/200/);
  });
  it('hiện nhãn tiếng Việt theo người huỷ', () => {
    expect(cancelReasonLabel('sold_out', 'shop')).toBe('Hết món');
    expect(cancelReasonLabel('other', 'customer')).toBe('Lý do khác');
    expect(cancelReasonLabel(undefined, 'shop')).toBe('');
  });
});
