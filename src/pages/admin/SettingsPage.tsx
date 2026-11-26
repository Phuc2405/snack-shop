import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { settingsSchema, type SettingsFormInput, type SettingsFormValues } from '@/schemas/product.schema';
import { settingsRepo } from '@/services/settings.repo';
import { useShopStore } from '@/stores/shop.store';
import { toast } from '@/stores/toast.store';
import { toAppError } from '@/lib/errors';
import { Button } from '@/components/ui/Button';
import { TextField, Toggle } from '@/components/ui/FormField';
import { AdminHeader } from './AdminLayout';

export default function SettingsPage() {
  const settings = useShopStore((s) => s.settings);
  const status = useShopStore((s) => s.status);
  const load = useShopStore((s) => s.load);
  const setSettings = useShopStore((s) => s.setSettings);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SettingsFormInput, unknown, SettingsFormValues>({ resolver: zodResolver(settingsSchema), defaultValues: settings });

  useEffect(() => {
    void load({ silent: true });
  }, [load]);
  useEffect(() => {
    if (status === 'ready') reset(settings);
  }, [status, settings, reset]);

  const onSubmit = async (v: SettingsFormValues) => {
    try {
      await settingsRepo.save(v);
      setSettings(v);
      reset(v);
      toast.success('Đã lưu cài đặt tiệm');
    } catch (e) {
      toast.error(toAppError(e).message);
    }
  };

  return (
    <>
      <AdminHeader title="Cài đặt tiệm" description="Thông tin hiện trên trang bán hàng." />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-3xl space-y-6">
        <section className="sticker space-y-4 bg-mint-soft p-5 sm:p-6">
          <Toggle label="Nhận đơn online" description="Tắt khi hết giờ hoặc quá tải; khách vẫn xem được menu." {...register('isOpen')} />
        </section>

        <section className="sticker grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <TextField label="Tên tiệm" maxLength={60} error={errors.name?.message} {...register('name')} />
          <TextField label="Hotline" type="tel" inputMode="tel" maxLength={20} error={errors.hotline?.message} {...register('hotline')} />
          <TextField className="sm:col-span-2" label="Khẩu hiệu" maxLength={120} error={errors.tagline?.message} {...register('tagline')} />
          <TextField className="sm:col-span-2" label="Địa chỉ tiệm" maxLength={200} error={errors.address?.message} {...register('address')} />
          <TextField label="Giờ mở cửa" maxLength={80} placeholder="8:00 – 22:00 hằng ngày" error={errors.openHours?.message} {...register('openHours')} />
        </section>

        <section className="sticker grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <TextField label="Phí giao hàng (đồng)" inputMode="numeric" error={errors.deliveryFee?.message} {...register('deliveryFee')} />
          <TextField label="Đơn tối thiểu (đồng)" inputMode="numeric" hint="0 = không giới hạn" error={errors.minOrder?.message} {...register('minOrder')} />
          <TextField
            className="sm:col-span-2"
            label="Thông báo đầu trang (không bắt buộc)"
            maxLength={200}
            placeholder="VD: Freeship đơn từ 100k hôm nay!"
            error={errors.announcement?.message}
            {...register('announcement')}
          />
        </section>

        <div className="sticky bottom-3 z-10 flex justify-end">
          <Button type="submit" size="lg" loading={isSubmitting} disabled={!isDirty}>
            Lưu cài đặt
          </Button>
        </div>
      </form>
    </>
  );
}
