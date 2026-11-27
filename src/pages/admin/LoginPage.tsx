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
  password: z.string().min(1, 'Nhập mật khẩu').max(128),
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
  const [resetMsg, setResetMsg] = useState<{ text: string; devLink: string | null } | null>(null);
  const {
    register,
    handleSubmit,
    getValues,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const forgot = async () => {
    setFormError(null);
    if (!(await trigger('email'))) return;
    const email = getValues('email');
    try {
      const { customerService } = await import('@/services/customer.service');
      await customerService.sendPasswordReset(email);
      setResetMsg({
        text: `Nếu ${email} có tài khoản, email đặt lại mật khẩu sẽ tới trong vài phút (xem cả mục Spam).`,
        devLink: await customerService.devResetLink(email),
      });
    } catch (e) {
      setFormError(toAppError(e).message);
    }
  };

  useEffect(() => init(), [init]);

  // Chỉ quay lại đường dẫn nội bộ /admin… (chống open redirect qua state)
  const safeFrom = from.startsWith('/admin') ? from : '/admin';
  if (status === 'ready' && staff) return <Navigate to={safeFrom} replace />;

  const onSubmit = async (v: Values) => {
    setFormError(null);
    try {
      await signIn(v.email, v.password);
      navigate(safeFrom, { replace: true, viewTransition: true });
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
          <button type="button" onClick={() => void forgot()} className="inline-flex min-h-[2.75rem] items-center font-bold text-tangerine-deep underline-offset-4 hover:underline">
            Quên mật khẩu? (nhập email ở trên rồi bấm)
          </button>
          {resetMsg && (
            <div className="space-y-2 rounded-xl border border-edge bg-mint-soft p-3" role="status">
              <p>{resetMsg.text}</p>
              {resetMsg.devLink && (
                <a href={resetMsg.devLink} target="_blank" rel="noopener noreferrer" className="font-bold underline">
                  Chế độ test (emulator): mở link đặt lại mật khẩu
                </a>
              )}
            </div>
          )}
          <p className="text-[0.9rem] text-ink-soft">
            Nhân viên = tài khoản khách bình thường được chủ tiệm cấp quyền (thêm doc staff trong Firebase Console, xem docs/DATABASE.md).
          </p>
        </form>
        <p className="mt-5 text-center">
          <Link viewTransition to="/" className="inline-flex min-h-[2.75rem] items-center font-bold underline underline-offset-4">
            ← Về trang bán hàng
          </Link>
        </p>
      </div>
    </div>
  );
}
