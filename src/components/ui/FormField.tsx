import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface BaseProps {
  label: string;
  error?: string;
  hint?: ReactNode;
}

function Wrap({ id, label, error, hint, className, children }: BaseProps & { id: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="mt-1.5 text-[0.95rem] font-bold text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="mt-1.5 text-[0.9rem] text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const TextField = forwardRef<HTMLInputElement, BaseProps & InputHTMLAttributes<HTMLInputElement>>(
  ({ label, error, hint, className, id, ...rest }, ref) => {
    const auto = useId();
    const fid = id ?? auto;
    return (
      <Wrap id={fid} label={label} error={error} hint={hint} className={className}>
        <input
          ref={ref}
          id={fid}
          aria-invalid={!!error}
          aria-describedby={error || hint ? `${fid}-msg` : undefined}
          className="field"
          {...rest}
        />
      </Wrap>
    );
  },
);
TextField.displayName = 'TextField';

export const TextAreaField = forwardRef<HTMLTextAreaElement, BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ label, error, hint, className, id, rows = 3, ...rest }, ref) => {
    const auto = useId();
    const fid = id ?? auto;
    return (
      <Wrap id={fid} label={label} error={error} hint={hint} className={className}>
        <textarea
          ref={ref}
          id={fid}
          rows={rows}
          aria-invalid={!!error}
          aria-describedby={error || hint ? `${fid}-msg` : undefined}
          className="field resize-y"
          {...rest}
        />
      </Wrap>
    );
  },
);
TextAreaField.displayName = 'TextAreaField';

export const SelectField = forwardRef<HTMLSelectElement, BaseProps & SelectHTMLAttributes<HTMLSelectElement>>(
  ({ label, error, hint, className, id, children, ...rest }, ref) => {
    const auto = useId();
    const fid = id ?? auto;
    return (
      <Wrap id={fid} label={label} error={error} hint={hint} className={className}>
        <select ref={ref} id={fid} aria-invalid={!!error} className={cn('field appearance-auto')} {...rest}>
          {children}
        </select>
      </Wrap>
    );
  },
);
SelectField.displayName = 'SelectField';

/** Công tắc bật/tắt (checkbox kiểu switch), vùng chạm ≥ 44px. */
export const Toggle = forwardRef<HTMLInputElement, { label: string; description?: string } & InputHTMLAttributes<HTMLInputElement>>(
  ({ label, description, className, id, ...rest }, ref) => {
    const auto = useId();
    const fid = id ?? auto;
    return (
      <label htmlFor={fid} className={cn('flex min-h-[2.75rem] cursor-pointer items-center justify-between gap-4', className)}>
        <span>
          <span className="block font-bold">{label}</span>
          {description && <span className="block text-[0.9rem] text-ink-faint">{description}</span>}
        </span>
        <span className="relative inline-flex shrink-0">
          <input ref={ref} id={fid} type="checkbox" role="switch" className="peer sr-only" {...rest} />
          <span className="h-8 w-14 rounded-full border border-edge bg-white transition-colors peer-checked:bg-mint peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink" />
          <span className="absolute left-1 top-1 h-6 w-6 rounded-full border border-edge bg-white transition-transform peer-checked:translate-x-6 peer-checked:bg-lemon" />
        </span>
      </label>
    );
  },
);
Toggle.displayName = 'Toggle';
