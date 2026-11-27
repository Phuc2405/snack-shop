import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, MailCheck } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/FormField';
import { useUiStore, type LoginMode } from '@/stores/ui.store';
import { useAccountStore, type LoginResult } from '@/stores/account.store';
import { toast } from '@/stores/toast.store';
import { useShopStore } from '@/stores/shop.store';
import { useCartStore } from '@/stores/cart.store';
import { MAX_LINES } from '@/domain/cart';
import { toAppError } from '@/lib/errors';
import { usingEmulators } from '@/lib/firebase';
import {
  resetSchema,
  signInSchema,
  signUpSchema,
  type ResetValues,
  type SignInValues,
  type SignUpValues,
} from '@/schemas/checkout.schema';

const TITLES: Record<LoginMode, string> = { signin: 'Đăng nhập', signup: 'Tạo tài khoản', reset: 'Quên mật khẩu' };

function welcome(r: LoginResult, isNew: boolean) {
  const parts: string[] = [];
  if (r.added) parts.push(`thêm ${r.added} món mới`);
  if (r.merged) parts.push(`${r.merged} món trùng giữ số lượng lớn hơn`);
  const hi = isNew ? 'Tạo tài khoản thành công!' : 'Đăng nhập thành công!';
  toast.success(parts.length ? `${hi} Đã gộp giỏ: ${parts.join(', ')}.` : hi);
  if (r.dropped) toast.info(`Giỏ tối đa ${MAX_LINES} món khác nhau, ${r.dropped} món chưa gộp được.`);
  // Giỏ đã cất từ lần trước có thể lệch menu hiện tại (giá đổi, món hết) → đối chiếu ngay
  const menu = useShopStore.getState().products;
  if (menu.length && useCartStore.getState().reconcile(menu).length) {
    toast.info('Một vài món trong giỏ đã đổi giá hoặc tạm hết, giỏ đã được cập nhật.');
  }
}

/** Ô mật khẩu có nút hiện/ẩn (gõ trên điện thoại dễ sai). */
function PasswordField(props: React.ComponentProps<typeof TextField>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <TextField {...props} type={show ? 'text' : 'password'} className="[&_input]:pr-14" />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-1 top-[2.1rem] grid h-11 w-11 place-items-center rounded-full text-ink-soft hover:bg-lemon-soft hover:text-ink"
        aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        aria-pressed={show}
      >
        {show ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
      </button>
    </div>
  );
}

function SignInForm({ onDone, go, email }: { onDone: () => void; go: (m: LoginMode, email?: string) => void; email?: string }) {
  const signIn = useAccountStore((s) => s.signIn);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, getValues, formState } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: email ?? '', password: '' },
  });
  const { errors, isSubmitting } = formState;
  const submit = async (v: SignInValues) => {
    setError(null);
    try {
      welcome(await signIn(v.email, v.password), false);
      onDone();
    } catch (e) {
      setError(toAppError(e).message);
    }
  };
  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
      {error && <FormError>{error}</FormError>}
      <TextField label="Email" type="email" inputMode="email" autoComplete="username" maxLength={120} error={errors.email?.message} {...register('email')} />
      <PasswordField label="Mật khẩu" autoComplete="current-password" maxLength={128} error={errors.password?.message} {...register('password')} />
      <div className="-mt-1 text-right">
        <button type="button" onClick={() => go('reset', getValues('email'))} className="inline-flex min-h-[2.75rem] items-center font-bold text-tangerine-deep underline-offset-4 hover:underline">
          Quên mật khẩu?
        </button>
      </div>
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        Đăng nhập
      </Button>
      <p className="text-center">
        Chưa có tài khoản?{' '}
        <button type="button" onClick={() => go('signup', getValues('email'))} className="inline-flex min-h-[2.75rem] items-center font-bold underline underline-offset-4">
          Tạo tài khoản
        </button>
      </p>
    </form>
  );
}

function SignUpForm({ onDone, go, email }: { onDone: () => void; go: (m: LoginMode, email?: string) => void; email?: string }) {
  const signUp = useAccountStore((s) => s.signUp);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, getValues, formState } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: email ?? '', password: '' },
  });
  const { errors, isSubmitting } = formState;
  const submit = async (v: SignUpValues) => {
    setError(null);
    try {
      welcome(await signUp(v.email, v.password), true);
      onDone();
    } catch (e) {
      setError(toAppError(e).message);
    }
  };
  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
      {error && <FormError>{error}</FormError>}
      <TextField label="Email" type="email" inputMode="email" autoComplete="email" maxLength={120} error={errors.email?.message} {...register('email')} />
      <PasswordField
        label="Mật khẩu"
        autoComplete="new-password"
        maxLength={128}
        hint="Ít nhất 8 ký tự, có cả chữ và số"
        error={errors.password?.message}
        {...register('password')}
      />
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        Tạo tài khoản
      </Button>
      <p className="text-center">
        Đã có tài khoản?{' '}
        <button type="button" onClick={() => go('signin', getValues('email'))} className="inline-flex min-h-[2.75rem] items-center font-bold underline underline-offset-4">
          Đăng nhập
        </button>
      </p>
    </form>
  );
}

function ResetForm({ go, email }: { go: (m: LoginMode, email?: string) => void; email?: string }) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<ResetValues>({ resolver: zodResolver(resetSchema), defaultValues: { email: email ?? '' } });
  const { errors, isSubmitting } = formState;
  const submit = async (v: ResetValues) => {
    setError(null);
    try {
      const { customerService } = await import('@/services/customer.service');
      await customerService.sendPasswordReset(v.email);
      setSentTo(v.email);
      if (usingEmulators) setDevLink(await customerService.devResetLink(v.email));
    } catch (e) {
      setError(toAppError(e).message);
    }
  };

  if (sentTo) {
    return (
      <div className="space-y-4" role="status">
        <div className="flex items-start gap-3 rounded-2xl border border-edge bg-mint-soft p-4">
          <MailCheck className="mt-0.5 h-6 w-6 shrink-0" aria-hidden />
          <p>
            Nếu <strong className="break-all">{sentTo}</strong> đã đăng ký, bạn sẽ nhận được email có link đặt lại mật khẩu trong vài phút.
            Không thấy thì xem thêm mục <strong>Thư rác / Spam</strong>.
          </p>
        </div>
        {devLink && (
          <a href={devLink} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-dashed border-edge-strong bg-white p-3 font-bold underline">
            Chế độ test trên máy (emulator không gửi email thật): mở link đặt lại mật khẩu
          </a>
        )}
        <Button size="lg" className="w-full" onClick={() => go('signin', sentTo)}>
          Quay lại đăng nhập
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
      {error && <FormError>{error}</FormError>}
      <p className="text-ink-soft">Nhập email đã đăng ký, tiệm sẽ gửi link để bạn đặt mật khẩu mới.</p>
      <TextField label="Email" type="email" inputMode="email" autoComplete="email" maxLength={120} error={errors.email?.message} {...register('email')} />
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        Gửi link đặt lại mật khẩu
      </Button>
      <p className="text-center">
        <button type="button" onClick={() => go('signin')} className="inline-flex min-h-[2.75rem] items-center font-bold underline underline-offset-4">
          ← Quay lại đăng nhập
        </button>
      </p>
    </form>
  );
}

function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border-2 border-danger bg-danger-soft p-3 font-bold text-danger" role="alert">
      {children}
    </p>
  );
}

/** Tài khoản khách: email + mật khẩu. Không bắt buộc để đặt món, nhưng giúp lưu sổ địa chỉ và xem đơn trên mọi máy. */
export function LoginDialog() {
  const open = useUiStore((s) => s.loginOpen);
  const initialMode = useUiStore((s) => s.loginMode);
  const reason = useUiStore((s) => s.loginReason);
  const close = useUiStore((s) => s.closeLogin);
  const [mode, setMode] = useState<LoginMode>(initialMode);
  const [email, setEmail] = useState<string | undefined>();
  /** Tăng mỗi lần mở → form mới tinh (không còn chữ / lỗi của lần trước) */
  const [session, setSession] = useState(0);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setEmail(undefined);
    setSession((n) => n + 1);
  }, [open, initialMode]);

  const go = (m: LoginMode, e?: string) => {
    setEmail(e || email);
    setMode(m);
  };
  const done = () => {
    const then = useUiStore.getState().afterLogin;
    close();
    then?.();
  };
  const k = `${session}-${email ?? ''}`;

  return (
    <Dialog open={open} onClose={close} title={TITLES[mode]} size="sm" tone="lemon">
      <div className="space-y-4">
        {mode !== 'reset' && (
          <p className="text-ink-soft">{reason || 'Lưu sổ địa chỉ giao hàng, giỏ hàng và xem lại đơn đã đặt trên mọi máy.'}</p>
        )}
        {/* key: đổi chế độ / mở lại thì form mới, không giữ lỗi của form trước */}
        <div key={mode} className="animate-fade-up">
          {mode === 'signin' && <SignInForm key={`in-${k}`} onDone={done} go={go} email={email} />}
          {mode === 'signup' && <SignUpForm key={`up-${k}`} onDone={done} go={go} email={email} />}
          {mode === 'reset' && <ResetForm key={`rs-${k}`} go={go} email={email} />}
        </div>
      </div>
    </Dialog>
  );
}
