import { useLayoutEffect, useRef } from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useToastStore, type ToastKind } from '@/stores/toast.store';

const STYLE: Record<ToastKind, { icon: typeof Info; cls: string }> = {
  success: { icon: CircleCheck, cls: 'bg-mint-soft' },
  error: { icon: CircleAlert, cls: 'bg-danger-soft' },
  info: { icon: Info, cls: 'bg-lemon-soft' },
};

/**
 * Thông báo nhỏ dạng sticker; trình đọc màn hình đọc nhờ aria-live.
 * Dùng Popover API để nằm ở "top layer": luôn nổi TRÊN hộp thoại <dialog> đang mở
 * (nếu không, toast bị lớp nền mờ của dialog che và không bấm đóng được).
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof el.showPopover !== 'function') return;
    if (toasts.length) {
      // Ẩn rồi hiện lại → đưa lên trên cùng top layer (trên cả dialog mở sau nó)
      if (el.matches(':popover-open')) el.hidePopover();
      el.showPopover();
    } else if (el.matches(':popover-open')) el.hidePopover();
  }, [toasts]);

  return (
    <div
      ref={ref}
      popover="manual"
      className="pointer-events-none fixed inset-x-0 bottom-auto top-3 m-0 flex w-full max-w-none flex-col items-center gap-2 overflow-visible border-0 bg-transparent p-0 px-3 sm:bottom-4 sm:top-auto sm:items-end"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const { icon: Icon, cls } = STYLE[t.kind];
        return (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={cn('sticker pointer-events-auto flex w-full max-w-sm animate-pop-in items-start gap-3 px-4 py-3', cls)}
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.5} aria-hidden />
            <p className="flex-1 text-[0.95rem] font-bold leading-snug">{t.message}</p>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action!.onClick();
                  dismiss(t.id);
                }}
                className="-my-1.5 min-h-[2.75rem] shrink-0 rounded-full border border-edge bg-white px-3 text-[0.95rem] font-bold underline-offset-2 hover:underline"
              >
                {t.action.label}
              </button>
            )}
            <button onClick={() => dismiss(t.id)} className="-m-2 grid h-10 w-10 shrink-0 place-items-center" aria-label="Đóng thông báo">
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
