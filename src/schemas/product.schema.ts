import { z } from 'zod';
import { cleanText as clean } from '@/lib/sanitize';


const choiceSchema = z.object({
  id: z.string().min(1).max(20),
  name: z.string().transform(clean).pipe(z.string().min(1, 'Nhập tên lựa chọn').max(40)),
  price: z.number().int().min(0).max(200_000),
});

const groupSchema = z.object({
  id: z.string().min(1).max(20),
  name: z.string().transform(clean).pipe(z.string().min(1, 'Nhập tên nhóm').max(30)),
  multi: z.boolean(),
  required: z.boolean(),
  choices: z.array(choiceSchema).min(1, 'Mỗi nhóm cần ít nhất 1 lựa chọn').max(12),
});

/** Khớp validProduct() trong firestore.rules. */
export const productSchema = z.object({
  name: z.string().transform(clean).pipe(z.string().min(1, 'Nhập tên món').max(80, 'Tối đa 80 ký tự')),
  description: z.string().transform(clean).pipe(z.string().max(500, 'Tối đa 500 ký tự')),
  price: z.coerce.number<string | number>().int('Giá là số nguyên').min(0, 'Giá không âm').max(10_000_000, 'Giá quá lớn'),
  category: z.enum(['drink', 'cake', 'snack', 'combo']),
  imageUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === '' || /^https:\/\/[^\s"<>]+$/.test(v), 'Link ảnh phải bắt đầu bằng https://'),
  available: z.boolean(),
  featured: z.boolean(),
  sortOrder: z.coerce.number<string | number>().int().min(0).max(9999),
  hidden: z.boolean(),
  options: z.array(groupSchema).max(8, 'Tối đa 8 nhóm tuỳ chọn'),
});

export type ProductFormInput = z.input<typeof productSchema>;
export type ProductFormValues = z.output<typeof productSchema>;

/** Khớp validSettings() trong firestore.rules. */
export const settingsSchema = z.object({
  name: z.string().transform(clean).pipe(z.string().min(1, 'Nhập tên tiệm').max(60)),
  tagline: z.string().transform(clean).pipe(z.string().max(120)),
  hotline: z
    .string()
    .trim()
    .max(20)
    .refine((v) => v === '' || /^[0-9+ .]{8,20}$/.test(v), 'Số điện thoại không hợp lệ'),
  address: z.string().transform(clean).pipe(z.string().max(200)),
  openHours: z.string().transform(clean).pipe(z.string().max(80)),
  announcement: z.string().transform(clean).pipe(z.string().max(200)),
  isOpen: z.boolean(),
  deliveryFee: z.coerce.number<string | number>().int().min(0).max(500_000),
  freeShipFrom: z.coerce.number<string | number>().int('Nhập số nguyên').min(0).max(50_000_000),
  minOrder: z.coerce.number<string | number>().int().min(0).max(5_000_000),
  bankBin: z.string().regex(/^(\d{6})?$/, 'Chọn ngân hàng'),
  bankAccount: z
    .string()
    .transform((v) => v.replace(/[\s.-]/g, ''))
    .pipe(z.string().regex(/^(\d{4,19})?$/, 'Số tài khoản chỉ gồm 4–19 chữ số')),
  bankAccountName: z.string().transform(clean).pipe(z.string().max(60)),
  shipFeeMode: z.enum(['flat', 'driver']),
  shipPrepaid: z.boolean(),
}).superRefine((v, ctx) => {
  if (v.bankAccount && !v.bankBin) ctx.addIssue({ code: 'custom', path: ['bankBin'], message: 'Chọn ngân hàng cho số tài khoản này' });
  // Khớp rules: bắt chuyển khoản trước thì phải có tài khoản, không thì khách không đặt ship được
  if (v.shipPrepaid && !(v.bankAccount && v.bankBin)) {
    ctx.addIssue({ code: 'custom', path: ['shipPrepaid'], message: 'Cần điền tài khoản VietQR bên dưới trước khi bật' });
  }
});

export type SettingsFormInput = z.input<typeof settingsSchema>;
export type SettingsFormValues = z.output<typeof settingsSchema>;
