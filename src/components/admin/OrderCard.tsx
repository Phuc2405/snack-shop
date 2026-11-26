import { memo } from 'react';
import { AlertTriangle, Bike, Phone, Store } from 'lucide-react';
import type { Order } from '@/types/domain';
import type { PriceIssue } from '@/domain/pricing';
import { actionLabel, nextForwardStatus, statusLabel } from '@/domain/orderStatus';
import { formatPrice, timeAgo } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { StatusPill } from '@/components/shop/StatusPill';

export const OrderCard = memo(function OrderCard({
  order,
  issues,
  busy,
  onAdvance,
  onOpen,
}: {
  order: Order;
  issues: PriceIssue[];
  busy: boolean;
  onAdvance: (o: Order) => void;
  onOpen: (o: Order) => void;
}) {
  const next = nextForwardStatus(order.status);
  return (
    <article className={cn('sticker flex flex-col p-4', order.status === 'new' && 'bg-tangerine-soft')}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold tabular">{order.code}</p>
          <p className="text-[0.9rem] text-ink-faint">{timeAgo(order.createdAt)}</p>
        </div>
        <StatusPill status={order.status} label={statusLabel(order.status, order.fulfillment)} />
      </div>

      <div className="mt-3 flex items-center gap-2">
        {order.fulfillment === 'delivery' ? <Bike className="h-5 w-5 shrink-0" aria-label="Giao hàng" /> : <Store className="h-5 w-5 shrink-0" aria-label="Khách lấy tại tiệm" />}
        <span className="min-w-0 truncate font-bold">{order.customer.name}</span>
        <a href={`tel:${order.customer.phone}`} className="ml-auto inline-flex min-h-[2.75rem] shrink-0 items-center gap-1 rounded-lg px-2 font-bold underline underline-offset-4 hover:bg-white">
          <Phone className="h-4 w-4" aria-hidden />
          <span className="tabular">{order.customer.phone}</span>
        </a>
      </div>
      {order.fulfillment === 'delivery' && <p className="line-clamp-2 text-[0.95rem] text-ink-soft">{order.customer.address}</p>}

      <ul className="mt-2 text-[0.95rem]">
        {order.items.slice(0, 4).map((it) => (
          <li key={it.productId} className="truncate">
            <span className="font-bold tabular">{it.qty}×</span> {it.name}
          </li>
        ))}
        {order.items.length > 4 && <li className="text-ink-faint">+{order.items.length - 4} món khác</li>}
      </ul>
      {order.customer.note && <p className="mt-2 rounded-lg bg-lemon-soft px-2 py-1 text-[0.95rem]">“{order.customer.note}”</p>}
      {issues.length > 0 && (
        <p className="mt-2 flex items-center gap-1.5 rounded-lg border-2 border-danger bg-danger-soft px-2 py-1 text-[0.9rem] font-bold text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden /> Giá trong đơn khác menu, kiểm tra trước khi nhận
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <span className="price text-xl">{formatPrice(order.total)}</span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => onOpen(order)}>
            Chi tiết
          </Button>
          {next && (
            <Button size="sm" variant={next === 'done' ? 'success' : 'primary'} loading={busy} onClick={() => onAdvance(order)}>
              {actionLabel(next, order.fulfillment)}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
});
