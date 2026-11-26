import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

// Nút "sticker": viền mực, bóng cứng; nhấn xuống thì bóng biến mất như bấm thật.
const base =
  'inline-flex select-none items-center justify-center gap-2 rounded-xl border-2 font-bold leading-none ' +
  'transition-[transform,box-shadow,background-color] duration-100 ease-out ' +
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none';

const pressable = 'shadow-sticker hover:-translate-y-0.5 hover:shadow-sticker-lg active:translate-x-[3px] active:translate-y-[3px] active:shadow-none';

const variants: Record<Variant, string> = {
  primary: cn('border-ink bg-tangerine text-ink', pressable),
  secondary: cn('border-ink bg-white text-ink', pressable),
  success: cn('border-ink bg-mint text-ink', pressable),
  danger: 'border-danger bg-white text-danger hover:bg-danger-soft',
  ghost: 'border-transparent bg-transparent text-ink-soft hover:bg-ink/5 hover:text-ink',
};

// Mọi kích thước ≥ 44px chiều cao (vùng chạm tối thiểu cho ngón tay — WCAG 2.5.5)
const sizes: Record<Size, string> = {
  sm: 'min-h-[2.75rem] px-3.5 text-[0.9rem]',
  md: 'min-h-[3rem] px-5 text-base',
  lg: 'min-h-[3.5rem] px-7 text-lg',
  icon: 'h-11 w-11 shrink-0 p-0',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, className, children, type = 'button', ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
