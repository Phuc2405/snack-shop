import type { Order } from '@/types/domain';
import { cn } from '@/lib/cn';

/** "Chuyển khoản · chưa nhận" (cam) / "Đã thu tiền" (xanh) / "Tiền mặt" — để nhân viên không giao món khi chưa nhận tiền CK. */
export function PaymentBadge({ order }: { order: Pick<Order, 'paymentMethod' | 'paid' | 'status'> }) {
  if (order.status === 'cancelled') return null;
  const label = order.paid ? 'Đã thu tiền' : order.paymentMethod === 'transfer' ? 'CK · chưa nhận tiền' : 'Tiền mặt';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border-2 px-2 py-0.5 text-[0.8rem] font-bold leading-5',
        order.paid ? 'border-ink bg-mint' : order.paymentMethod === 'transfer' ? 'border-ink bg-tangerine-soft' : 'border-ink/30 bg-white text-ink-soft',
      )}
    >
      {label}
    </span>
  );
}
