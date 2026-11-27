import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, KeyRound } from 'lucide-react';
import { TextField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { useAsync } from '@/hooks/useAsync';
import { getAuthLazy } from '@/lib/firebase';
import { toAppError } from '@/lib/errors';
import { signUpSchema } from '@/schemas/checkout.schema';
import { useUiStore } from '@/stores/ui.store';

const schema = z.object({ password: signUpSchema.shape.password });
type Values = z.infer<typeof schema>;

/**
 * Trang xử lý link trong email của Firebase Auth (custom action handler), hiện bằng giao diện tiệm.
 * Hiện hỗ trợ: đặt lại mật khẩu (mode=resetPassword). Cài trên Firebase Console:
 * Authentication → Templates → Password reset → "Customize action URL" = https://<tên-miền>/auth/action
 * (xem docs/SECURITY.md). Mã oobCode chỉ dùng được 1 lần và hết hạn sau 1 giờ.
 */
export default function AuthActionPage() {
  const [params] = useSearchParams();
  const mode = params.get('mode');
  const code = params.get('oobCode') ?? '';
  const openLogin = useUiStore((s) => s.openLogin);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kiểm tra mã trước khi cho nhập mật khẩu (mã hết hạn / đã dùng → báo ngay)
  const check = useAsync(
    async () => {
      const auth = await getAuthLazy('guest');
      const { verifyPasswordResetCode } = await import('firebase/auth');
      return verifyPasswordResetCode(auth, code);
    },
    [code],
    { enabled: mode === 'resetPassword' && !!code },
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const submit = async (v: Values) => {
    setError(null);
    try {
      const auth = await getAuthLazy('guest');
      const { confirmPasswordReset } = await import('firebase/auth');
      await confirmPasswordReset(auth, code, v.password);
      setDone(true);
    } catch (e) {
      setError(toAppError(e).message);
    }
  };

  if (mode !== 'resetPassword' || !code) {
    return (
      <div className="shell max-w-md py-10">
        <EmptyState title="Link không hợp lệ" description="Link này thiếu thông tin. Bạn thử bấm lại link trong email nhé." />
      </div>
    );
  }

  return (
    <div className="shell max-w-lg py-8 sm:py-12">
      <div className="sticker space-y-5 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <KeyRound className="h-8 w-8 shrink-0 text-tangerine-deep" aria-hidden />
          <h1 className="text-2xl">Đặt mật khẩu mới</h1>
        </div>

        {check.loading ? (
          <p role="status">Đang kiểm tra link…</p>
        ) : check.error ? (
          <div className="space-y-4">
            <p className="rounded-xl border-2 border-danger bg-danger-soft p-3 font-bold text-danger" role="alert">
              {check.error.message} Link chỉ dùng được 1 lần và hết hạn sau 1 giờ.
            </p>
            <Button className="w-full" size="lg" onClick={() => openLogin({ mode: 'reset' })}>
              Gửi lại link
            </Button>
          </div>
        ) : done ? (
          <div className="space-y-4" role="status">
            <p className="flex items-start gap-2 rounded-xl border border-edge bg-mint-soft p-3 font-bold">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /> Đã đổi mật khẩu. Bạn đăng nhập bằng mật khẩu mới nhé.
            </p>
            <Button className="w-full" size="lg" onClick={() => openLogin()}>
              Đăng nhập
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
            <p className="text-ink-soft">
              Tài khoản: <strong className="break-all text-ink">{check.data}</strong>
            </p>
            {error && (
              <p className="rounded-xl border-2 border-danger bg-danger-soft p-3 font-bold text-danger" role="alert">
                {error}
              </p>
            )}
            <TextField
              label="Mật khẩu mới"
              type="password"
              autoComplete="new-password"
              maxLength={128}
              hint="Ít nhất 8 ký tự, có cả chữ và số"
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
              Lưu mật khẩu mới
            </Button>
          </form>
        )}
        <p className="text-center">
          <Link viewTransition to="/" className="inline-flex min-h-[2.75rem] items-center font-bold underline underline-offset-4">
            ← Về trang bán hàng
          </Link>
        </p>
      </div>
    </div>
  );
}
