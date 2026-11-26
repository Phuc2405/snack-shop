import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSchema, type ProfileInput, type ProfileValues } from '@/schemas/checkout.schema';
import { TextField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

/** Form tên – SĐT – địa chỉ: dùng cho đăng nhập và cho sổ thông tin người đặt. */
export function ProfileForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<ProfileInput>;
  submitLabel: string;
  onSubmit: (v: ProfileValues) => void;
  onCancel?: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileInput, unknown, ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: initial?.name ?? '', phone: initial?.phone ?? '', address: initial?.address ?? '' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <TextField label="Tên của bạn" autoComplete="name" maxLength={60} placeholder="VD: Nguyễn Văn A" error={errors.name?.message} {...register('name')} />
      <TextField
        label="Số điện thoại"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        maxLength={16}
        placeholder="VD: 0901234567"
        error={errors.phone?.message}
        hint="Tiệm gọi xác nhận đơn qua số này"
        {...register('phone')}
      />
      <TextField
        label="Địa chỉ"
        autoComplete="street-address"
        maxLength={200}
        placeholder="Số nhà, đường, phường, quận"
        error={errors.address?.message}
        {...register('address')}
      />
      <div className="flex flex-wrap gap-3 pt-1">
        <Button type="submit" size="lg" className="flex-1">
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="secondary" size="lg" onClick={onCancel}>
            Huỷ
          </Button>
        )}
      </div>
    </form>
  );
}
