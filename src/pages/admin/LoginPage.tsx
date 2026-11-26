import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TextField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { BrandMark } from '@/components/shop/BrandMark';
import { useStaffStore } from '@/stores/staff.store';
import { toAppError } from '@/lib/errors';

const schema = z.object({
  email: z.string().trim().email('Email không hợp lệ').max(120),
  password: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự').max(128),
});
type Values = z.infer<typeof schema>;

export default function LoginPage() {
  const init = useStaffStore((s) => s.init);
  const status = useStaffStore((s) => s.status);
  const staff = useStaffStore((s) => s.staff);
  const signIn = useStaffStore((s) => s.signIn);
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/admin';
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => init(), [init]);

  // Chỉ quay lại đường dẫn nội bộ /admin… (chống open redirect qua state)
  const safeFrom = from.startsWith('/admin') ? from : '/admin';
  if (status === 'ready' && staff) return <Navigate to={safeFrom} replace />;

  const onSubmit = async (v: Values) => {
    setFormError(null);
    try {
      await signIn(v.email, v.password);
      navigate(safeFrom, { replace: true });
    } catch (e) {
      setFormError(toAppError(e).message);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <BrandMark className="h-12 w-12" />
          <p className="text-2xl font-bold">Quản lý tiệm</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="sticker space-y-5 p-6 sm:p-8">
          <h1 className="text-2xl">Đăng nhập nhân viên</h1>
          {formError && (
            <p className="rounded-xl border-2 border-danger bg-danger-soft p-3 font-bold text-danger" role="alert">
              {formError}
            </p>
          )}
          <TextField label="Email" type="email" autoComplete="username" error={errors.email?.message} {...register('email')} />
          <TextField
            label="Mật khẩu"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
            Đăng nhập
          </Button>
          <p className="text-[0.9rem] text-ink-soft">
            Tài khoản nhân viên do chủ tiệm tạo trong Firebase Console (xem docs/DATABASE.md).
          </p>
        </form>
        <p className="mt-5 text-center">
          <Link to="/" className="inline-flex min-h-[2.75rem] items-center font-bold underline underline-offset-4">
            ← Về trang bán hàng
          </Link>
        </p>
      </div>
    </div>
  );
}
