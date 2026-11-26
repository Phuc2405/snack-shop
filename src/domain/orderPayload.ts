import type { CustomerInfo, Fulfillment, PaymentMethod, ShopSettings } from '@/types/domain';
import { countItems, subtotalOf, type CartLine } from './cart';
import { deliveryFeeFor, makeOrderCode } from './pricing';

/** Các field của doc order — PHẢI khớp `keys().hasOnly([...])` trong firestore.rules (có test). */
export const ORDER_FIELDS = [
  'code',
  'customerUid',
  'customer',
  'fulfillment',
  'items',
  'itemCount',
  'subtotal',
  'deliveryFee',
  'total',
  'status',
  'paymentMethod',
  'paid',
  'createdAt',
  'updatedAt',
] as const;

export interface OrderDraft {
  lines: CartLine[];
  customer: CustomerInfo;
  fulfillment: Fulfillment;
  paymentMethod: PaymentMethod;
  settings: Pick<ShopSettings, 'deliveryFee' | 'freeShipFrom'>;
}

/**
 * Builder thuần: giỏ hàng + form → payload ghi vào Firestore (chưa có timestamp,
 * repository gắn serverTimestamp()). Giữ ở domain để test được không cần Firebase.
 */
export function buildOrderPayload(draft: OrderDraft, customerUid: string, code = makeOrderCode()) {
  const items = draft.lines.map((l) => ({
    productId: l.productId,
    name: l.name,
    price: l.price,
    qty: l.qty,
    options: l.options.map((o) => ({ group: o.group, choice: o.choice, name: o.name, price: o.price })),
  }));
  const subtotal = subtotalOf(items);
  const deliveryFee = deliveryFeeFor(subtotal, draft.fulfillment, draft.settings);
  return {
    code,
    customerUid,
    customer: {
      name: draft.customer.name.trim(),
      phone: draft.customer.phone,
      address: draft.fulfillment === 'delivery' ? draft.customer.address.trim() : '',
      note: draft.customer.note.trim(),
    },
    fulfillment: draft.fulfillment,
    items,
    itemCount: countItems(draft.lines),
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    status: 'new' as const,
    paymentMethod: draft.paymentMethod,
    paid: false,
  };
}
