import { z } from 'zod';
import { cleanText as clean } from '@/lib/sanitize';
import { normalizePhone } from '@/lib/format';

/** Khớp regex số điện thoại trong firestore.rules: ^(0|\+84)[0-9]{9,10}$ */
export const PHONE_RE = /^(0|\+84)[0-9]{9,10}$/;


export const checkoutSchema = z
  .object({
    name: z.string().transform(clean).pipe(z.string().min(2, 'Nhập tên của bạn (ít nhất 2 ký tự)').max(60, 'Tên tối đa 60 ký tự')),
    phone: z
      .string()
      .transform(normalizePhone)
      .pipe(z.string().regex(PHONE_RE, 'Số điện thoại chưa đúng (VD: 0901234567)')),
    fulfillment: z.enum(['delivery', 'pickup']),
    paymentMethod: z.enum(['cod', 'transfer']),
    address: z.string().transform(clean).pipe(z.string().max(200, 'Địa chỉ tối đa 200 ký tự')),
    note: z.string().transform(clean).pipe(z.string().max(300, 'Ghi chú tối đa 300 ký tự')),
    remember: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.fulfillment === 'delivery' && v.address.length < 5) {
      ctx.addIssue({ code: 'custom', path: ['address'], message: 'Nhập địa chỉ giao hàng (số nhà, đường, phường)' });
    }
  });

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutValues = z.output<typeof checkoutSchema>;
