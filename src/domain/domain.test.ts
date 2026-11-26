import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { OptionGroup, Order, Product } from '@/types/domain';
import { MAX_LINES, MAX_QTY_PER_ITEM, addLine, mergeCarts, reconcileLines, setLineQty, subtotalOf, type CartLine } from './cart';
import { NEXT_STATUSES, canTransition, nextForwardStatus } from './orderStatus';
import { auditOrder, deliveryFeeFor, freeShipRemaining, makeOrderCode } from './pricing';
import { DRINK_PRESET, defaultSelection, missingRequired, optionsTotal, toggleChoice, toSelectedOptions } from './options';
import { buildVietQR, crc16ccitt, transferNote } from './vietqr';
import { ORDER_FIELDS, buildOrderPayload } from './orderPayload';
import { checkoutSchema, profileSchema, PHONE_RE } from '@/schemas/checkout.schema';
import { productSchema } from '@/schemas/product.schema';
import { toOrder, toProduct } from '@/services/mappers';

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
  const base = { fulfillment: 'pickup' as const, paymentMethod: 'cod' as const, note: '' };

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

  it('link ảnh chỉ nhận https (chặn javascript: / http:)', () => {
    const p = { name: 'A', description: '', price: '1000', category: 'drink', available: true, featured: false, sortOrder: '1', options: [] };
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
  const s = { deliveryFee: 15000, freeShipFrom: 150000 };
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
