import { Check } from 'lucide-react';
import type { Fulfillment, OrderStatus } from '@/types/domain';
import { PROGRESS_STEPS, statusLabel } from '@/domain/orderStatus';
import { cn } from '@/lib/cn';

/** Thanh tiến trình đơn cho khách: Đơn mới → Đã nhận → Đang làm → Đang giao/Chờ lấy → Hoàn tất. */
export function OrderProgress({ status, fulfillment }: { status: OrderStatus; fulfillment: Fulfillment }) {
  if (status === 'cancelled') {
    return <p className="rounded-2xl border-2 border-ink bg-danger-soft px-4 py-3 text-center text-lg font-bold">Đơn đã huỷ</p>;
  }
  const current = PROGRESS_STEPS.indexOf(status);
  return (
    <ol className="grid grid-cols-5 gap-1" aria-label="Tiến trình đơn hàng">
      {PROGRESS_STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex flex-col items-center text-center" aria-current={active ? 'step' : undefined}>
            <div className="flex w-full items-center">
              <span className={cn('h-1 flex-1 rounded-full', i === 0 ? 'invisible' : i <= current ? 'bg-ink' : 'bg-ink/15')} />
              <span
                className={cn(
                  'grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 text-[0.85rem] font-bold sm:h-10 sm:w-10',
                  done && 'border-ink bg-mint',
                  active && 'animate-pop-in border-ink bg-tangerine shadow-sticker',
                  !done && !active && 'border-ink/30 bg-white text-ink-faint',
                )}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn('h-1 flex-1 rounded-full', i === PROGRESS_STEPS.length - 1 ? 'invisible' : i < current ? 'bg-ink' : 'bg-ink/15')} />
            </div>
            <span className={cn('mt-2 text-[0.75rem] leading-tight sm:text-[0.85rem]', active ? 'font-bold text-ink' : 'text-ink-soft')}>
              {statusLabel(s, fulfillment)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
