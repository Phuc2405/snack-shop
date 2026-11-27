import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Product, ProductInput } from '@/types/domain';
import { productSchema, type ProductFormInput, type ProductFormValues } from '@/schemas/product.schema';
import { CATEGORIES, CATEGORY_ORDER } from '@/config/catalog';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { SelectField, TextAreaField, TextField, Toggle } from '@/components/ui/FormField';
import { ProductImage } from '@/components/shop/ProductImage';
import { OptionsEditor } from './OptionsEditor';

const EMPTY: ProductFormInput = {
  name: '',
  description: '',
  price: '',
  category: 'drink',
  imageUrl: '',
  available: true,
  featured: false,
  sortOrder: 100,
  hidden: false,
  options: [],
};

export function ProductForm({
  open,
  product,
  onClose,
  onSave,
}: {
  open: boolean;
  /** null = thêm món mới */
  product: Product | null;
  onClose: () => void;
  onSave: (input: ProductInput) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInput, unknown, ProductFormValues>({ resolver: zodResolver(productSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (!open) return;
    reset(
      product
        ? {
            name: product.name,
            description: product.description,
            price: product.price,
            category: product.category,
            imageUrl: product.imageUrl,
            available: product.available,
            featured: product.featured,
            sortOrder: product.sortOrder,
            hidden: product.hidden,
            options: structuredClone(product.options),
          }
        : EMPTY,
    );
  }, [open, product, reset]);

  const preview = watch(['name', 'imageUrl', 'category', 'available']);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={isSubmitting}
      size="lg"
      tone="lemon"
      title={product ? 'Sửa món' : 'Thêm món mới'}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Huỷ
          </Button>
          <Button type="submit" form="product-form" loading={isSubmitting}>
            Lưu món
          </Button>
        </div>
      }
    >
      <form id="product-form" noValidate onSubmit={handleSubmit((v) => onSave(v))} className="grid gap-5 sm:grid-cols-[1fr_10rem]">
        <div className="space-y-4">
          <TextField label="Tên món" maxLength={80} error={errors.name?.message} {...register('name')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Giá (đồng)" inputMode="numeric" placeholder="35000" error={errors.price?.message} {...register('price')} />
            <SelectField label="Danh mục" {...register('category')}>
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {CATEGORIES[c].label}
                </option>
              ))}
            </SelectField>
          </div>
          <TextAreaField label="Mô tả" rows={3} maxLength={500} error={errors.description?.message} {...register('description')} />
          <TextField
            label="Link ảnh (không bắt buộc)"
            type="url"
            inputMode="url"
            placeholder="https://…"
            error={errors.imageUrl?.message}
            hint="Để trống sẽ dùng hình minh hoạ theo danh mục."
            {...register('imageUrl')}
          />
          <TextField
            label="Thứ tự hiển thị"
            inputMode="numeric"
            hint="Số nhỏ hiện trước"
            error={errors.sortOrder?.message}
            {...register('sortOrder')}
          />
          <Controller
            control={control}
            name="options"
            render={({ field }) => (
              <OptionsEditor
                value={field.value}
                onChange={field.onChange}
                error={
                  errors.options
                    ? 'Kiểm tra lại tuỳ chọn: mỗi nhóm cần tên và ít nhất 1 lựa chọn có tên.'
                    : undefined
                }
              />
            )}
          />
          <div className="divide-y divide-edge rounded-2xl border border-edge px-4">
            <Toggle label="Còn bán" description="Tắt khi món tạm hết" {...register('available')} />
            <Toggle label="Món nổi bật" description="Gắn nhãn Hot" {...register('featured')} />
            <Toggle
              label="Ẩn khỏi menu"
              description="Khách không thấy món này nữa; đơn cũ và báo cáo vẫn giữ nguyên"
              {...register('hidden')}
            />
          </div>
        </div>
        <div className="order-first sm:order-none">
          <p className="label">Xem trước</p>
          <ProductImage
            product={{ name: preview[0] || 'Món mới', imageUrl: preview[1], category: preview[2], available: preview[3] }}
            className="w-32 rounded-2xl border border-edge sm:w-full"
          />
        </div>
      </form>
    </Dialog>
  );
}
