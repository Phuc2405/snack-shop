import { z } from 'zod';
import { cleanText as clean } from '@/lib/sanitize';


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
  minOrder: z.coerce.number<string | number>().int().min(0).max(5_000_000),
});

export type SettingsFormInput = z.input<typeof settingsSchema>;
export type SettingsFormValues = z.output<typeof settingsSchema>;
