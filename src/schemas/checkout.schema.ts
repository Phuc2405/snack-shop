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

/** Một địa chỉ nhận hàng trong sổ địa chỉ (tên người nhận – SĐT – địa chỉ). Khớp validAddress() trong firestore.rules. */
export const profileSchema = z.object({ name, phone, address });
export type ProfileInput = z.input<typeof profileSchema>;
export type ProfileValues = z.output<typeof profileSchema>;

/**
 * Form đặt món. Người nhận (tên – SĐT – địa chỉ) luôn nằm trong form: đã đăng nhập thì điền sẵn từ
 * sổ địa chỉ, khách vãng lai tự nhập. Ghé lấy thì không cần địa chỉ.
 */
export const checkoutSchema = z
  .object({
    fulfillment: z.enum(['delivery', 'pickup']),
    paymentMethod: z.enum(['cod', 'transfer']),
    note: z.string().transform(clean).pipe(z.string().max(300, 'Ghi chú tối đa 300 ký tự')),
    name,
    phone,
    address: z.string().transform(clean).pipe(z.string().max(200, 'Địa chỉ tối đa 200 ký tự')),
    /** Lưu người nhận này vào sổ địa chỉ của tài khoản */
    saveAddress: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.fulfillment === 'delivery' && v.address.length < 5) {
      ctx.addIssue({ code: 'custom', path: ['address'], message: 'Nhập địa chỉ giao hàng (số nhà, đường, phường)' });
    }
  });

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutValues = z.output<typeof checkoutSchema>;

// ---------- Tài khoản (email + mật khẩu, Firebase Auth) ----------
const email = z.string().trim().toLowerCase().email('Email chưa đúng (VD: ten@gmail.com)').max(120, 'Email quá dài');

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Nhập mật khẩu').max(128),
});
export type SignInValues = z.output<typeof signInSchema>;

/** Đăng ký: chỉ email + mật khẩu. Mật khẩu ≥ 8 ký tự, có cả chữ và số (đặt giống Password policy trên Firebase Console). */
export const signUpSchema = z.object({
  email,
  password: z
    .string()
    .min(8, 'Mật khẩu ít nhất 8 ký tự')
    .max(128, 'Mật khẩu tối đa 128 ký tự')
    .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Mật khẩu cần có cả chữ và số'),
});
export type SignUpValues = z.output<typeof signUpSchema>;

export const resetSchema = z.object({ email });
export type ResetValues = z.output<typeof resetSchema>;
