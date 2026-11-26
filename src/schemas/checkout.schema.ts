import { z } from 'zod';
import { cleanText as clean } from '@/lib/sanitize';
import { normalizePhone } from '@/lib/format';

/** Khớp regex số điện thoại trong firestore.rules: ^(0|\+84)[0-9]{9,10}$ */
export const PHONE_RE = /^(0|\+84)[0-9]{9,10}$/;

const name = z.string().transform(clean).pipe(z.string().min(2, 'Nhập tên của bạn (ít nhất 2 ký tự)').max(60, 'Tên tối đa 60 ký tự'));
const phone = z
  .string()
  .transform(normalizePhone)
  .pipe(z.string().regex(PHONE_RE, 'Số điện thoại chưa đúng (VD: 0901234567)'));
const address = z
  .string()
  .transform(clean)
  .pipe(z.string().min(5, 'Nhập địa chỉ (số nhà, đường, phường)').max(200, 'Địa chỉ tối đa 200 ký tự'));

/** Thông tin người đặt: dùng cho đăng nhập và sổ địa chỉ (tên – SĐT – địa chỉ). */
export const profileSchema = z.object({ name, phone, address });
export type ProfileInput = z.input<typeof profileSchema>;
export type ProfileValues = z.output<typeof profileSchema>;

/** Form đặt món: thông tin người đặt lấy từ tài khoản, form chỉ còn cách nhận, thanh toán, ghi chú. */
export const checkoutSchema = z.object({
  fulfillment: z.enum(['delivery', 'pickup']),
  paymentMethod: z.enum(['cod', 'transfer']),
  note: z.string().transform(clean).pipe(z.string().max(300, 'Ghi chú tối đa 300 ký tự')),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutValues = z.output<typeof checkoutSchema>;
