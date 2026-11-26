import type { OrderStatus } from '@/types/domain';
import { cn } from '@/lib/cn';

/** Màu theo trạng thái — nền pastel, chữ ink (đủ tương phản), kèm chữ nên không phụ thuộc màu. */
export const STATUS_TONE: Record<OrderStatus, string> = {
  new: 'bg-tangerine',
  confirmed: 'bg-sky',
  preparing: 'bg-lemon',
  delivering: 'bg-berry-soft',
  done: 'bg-mint',
  cancelled: 'bg-white text-ink-soft line-through decoration-2',
};

export function StatusPill({ status, label, className }: { status: OrderStatus; label: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border-2 border-ink px-2.5 py-0.5 text-[0.85rem] font-bold leading-5', STATUS_TONE[status], className)}>
      {label}
    </span>
  );
}
