import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Order, Product } from '@/types/domain';
import { MAX_LINES, MAX_QTY_PER_ITEM, addLine, reconcileLines, setLineQty, subtotalOf, type CartLine } from './cart';
import { NEXT_STATUSES, canTransition, nextForwardStatus } from './orderStatus';
import { auditOrder, makeOrderCode } from './pricing';
import { ORDER_FIELDS, buildOrderPayload } from './orderPayload';
import { checkoutSchema, PHONE_RE } from '@/schemas/checkout.schema';
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
  updatedAt: null,
  ...over,
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
    expect(setLineQty(lines, 'p1', 0)).toHaveLength(0);
    expect(setLineQty(lines, 'p1', -3)).toHaveLength(0);
    expect(setLineQty(lines, 'p1', 2.7)[0]!.qty).toBe(2);
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

describe('payload đơn hàng', () => {
  const lines = addLine(addLine([], product(), 2).lines, product({ id: 'p2', name: 'Flan', price: 18000 })).lines;
  const customer = { name: ' Lan ', phone: '0901234567', address: ' 12 Lê Lợi ', note: '' };

  it('đúng các field mà rules cho phép (keys().hasOnly)', () => {
    const p = buildOrderPayload({ lines, customer, fulfillment: 'delivery', settings: { deliveryFee: 15000 } }, 'uid1', 'NB-AAAAA');
    const keys = [...Object.keys(p), 'createdAt', 'updatedAt'].sort();
    expect(keys).toEqual([...ORDER_FIELDS].sort());
    for (const f of ORDER_FIELDS) expect(rules).toContain(`'${f}'`);
  });

  it('tự tính tiền, phí ship chỉ khi giao hàng, cắt khoảng trắng', () => {
    const d = buildOrderPayload({ lines, customer, fulfillment: 'delivery', settings: { deliveryFee: 15000 } }, 'u');
    expect(d.subtotal).toBe(78000);
    expect(d.total).toBe(93000);
    expect(d.itemCount).toBe(3);
    expect(d.customer.name).toBe('Lan');
    const pickup = buildOrderPayload({ lines, customer, fulfillment: 'pickup', settings: { deliveryFee: 15000 } }, 'u');
    expect(pickup.deliveryFee).toBe(0);
    expect(pickup.customer.address).toBe('');
  });

  it('mã đơn không có ký tự dễ nhầm', () => {
    for (let i = 0; i < 200; i++) expect(makeOrderCode()).toMatch(/^NB-[2-9A-HJKMNP-Z]{5}$/);
  });
});

describe('kiểm tra giá đơn (dashboard)', () => {
  const order: Pick<Order, 'items' | 'subtotal' | 'deliveryFee' | 'total'> = {
    items: [{ productId: 'p1', name: 'Trà sữa', price: 30000, qty: 2 }],
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
  const base = { name: 'Lan', phone: '090 123 4567', fulfillment: 'pickup' as const, address: '', note: '', remember: true };

  it('chuẩn hoá số điện thoại, regex giống rules', () => {
    const r = checkoutSchema.parse(base);
    expect(r.phone).toBe('0901234567');
    expect(rules).toContain(PHONE_RE.source.replace(/\\/g, '\\\\'));
  });

  it('từ chối số điện thoại sai và thiếu địa chỉ khi giao hàng', () => {
    expect(checkoutSchema.safeParse({ ...base, phone: '12345' }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, fulfillment: 'delivery', address: '' }).success).toBe(false);
  });

  it('bỏ thẻ HTML + ký tự điều khiển (phòng XSS lớp 2) và chặn CSV/Excel injection', () => {
    const r = checkoutSchema.parse({ ...base, name: '<script>Lan</script>\u0007', note: 'Ít đá, ít ngọt <b>nhé</b>' });
    expect(r.name).toBe('Lan');
    expect(r.note).toBe('Ít đá, ít ngọt nhé');
    expect(checkoutSchema.parse({ ...base, note: '=HYPERLINK("http://x")' }).note).toBe('HYPERLINK("http://x")');
    expect(checkoutSchema.parse({ ...base, note: '<img src=x onerror=alert(1)>ngon' }).note).toBe('ngon');
  });

  it('link ảnh chỉ nhận https (chặn javascript: / http:)', () => {
    const p = { name: 'A', description: '', price: '1000', category: 'drink', available: true, featured: false, sortOrder: '1' };
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
