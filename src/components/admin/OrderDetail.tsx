import { useEffect, useState } from 'react';
import { AlertTriangle, Copy, Phone } from 'lucide-react';
import type { Order, OrderStatus } from '@/types/domain';
import type { PriceIssue } from '@/domain/pricing';
import { NEXT_STATUSES, actionLabel, statusLabel } from '@/domain/orderStatus';
import { formatDateTime, formatPrice } from '@/lib/format';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { TextAreaField } from '@/components/ui/FormField';
import { StatusPill } from '@/components/shop/StatusPill';
import { toast } from '@/stores/toast.store';

function issueText(i: PriceIssue): string {
  switch (i.kind) {
    case 'price_differs':
      return `${i.name}: đơn ghi ${formatPrice(i.orderPrice)}, menu ${formatPrice(i.menuPrice)}`;
    case 'unknown_product':
      return `${i.name}: không có trong menu`;
    case 'subtotal_mismatch':
      return `Tạm tính sai: đúng là ${formatPrice(i.expected)}, đơn ghi ${formatPrice(i.actual)}`;
    case 'total_mismatch':
      return `Tổng sai: đúng là ${formatPrice(i.expected)}, đơn ghi ${formatPrice(i.actual)}`;
  }
}

export function OrderDetail({
  order,
  issues,
  busy,
  onClose,
  onChange,
}: {
  order: Order | null;
  issues: PriceIssue[];
  busy: boolean;
  onClose: () => void;
  onChange: (o: Order, to: OrderStatus, note?: string) => void;
}) {
  const [note, setNote] = useState('');
  useEffect(() => setNote(order?.staffNote ?? ''), [order?.id, order?.staffNote]);

  const copyAddress = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Đã chép địa chỉ');
    } catch {
      toast.error('Không chép được, hãy bôi đen để chép.');
    }
  };

  return (
    <Dialog open={!!order} onClose={onClose} placement="side" tone="lemon" busy={busy} title={order ? `Đơn ${order.code}` : ''}>
      {order && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={order.status} label={statusLabel(order.status, order.fulfillment)} />
            <span className="text-ink-soft">{formatDateTime(order.createdAt)}</span>
          </div>

          <section>
            <h3 className="text-lg">Khách hàng</h3>
            <p className="font-bold">{order.customer.name}</p>
            <a href={`tel:${order.customer.phone}`} className="inline-flex min-h-[2.75rem] items-center gap-2 font-bold underline underline-offset-4">
              <Phone className="h-4 w-4" aria-hidden /> {order.customer.phone}
            </a>
            <p className="mt-1">{order.fulfillment === 'delivery' ? 'Giao tận nơi' : 'Khách ghé tiệm lấy'}</p>
            {order.customer.address && (
              <p className="mt-1 flex items-start gap-2">
                <span className="flex-1">{order.customer.address}</span>
                <button
                  type="button"
                  onClick={() => void copyAddress(order.customer.address)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-ink bg-white"
                  aria-label="Chép địa chỉ"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </p>
            )}
            {order.customer.note && <p className="mt-2 rounded-lg bg-lemon-soft px-3 py-2">Ghi chú: “{order.customer.note}”</p>}
          </section>

          <section>
            <h3 className="text-lg">Món</h3>
            <ul className="mt-1 space-y-1">
              {order.items.map((it) => (
                <li key={it.productId} className="flex justify-between gap-3">
                  <span>
                    <span className="font-bold tabular">{it.qty}×</span> {it.name}
                  </span>
                  <span className="tabular">{formatPrice(it.qty * it.price)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-2 space-y-1 border-t-2 border-dashed border-ink/30 pt-2">
              <div className="flex justify-between">
                <dt>Phí giao</dt>
                <dd className="tabular">{formatPrice(order.deliveryFee)}</dd>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <dt>Tổng thu</dt>
                <dd className="price">{formatPrice(order.total)}</dd>
              </div>
            </dl>
            {issues.length > 0 && (
              <div className="mt-3 rounded-xl border-2 border-danger bg-danger-soft p-3 text-danger" role="alert">
                <p className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="h-5 w-5" aria-hidden /> Đơn không khớp menu hiện tại
                </p>
                <ul className="mt-1 list-disc pl-5 text-[0.95rem]">
                  {issues.map((i, n) => (
                    <li key={n}>{issueText(i)}</li>
                  ))}
                </ul>
                <p className="mt-1 text-[0.9rem]">Có thể giá vừa đổi sau khi khách đặt, hoặc đơn bị sửa. Gọi khách xác nhận lại tổng tiền.</p>
              </div>
            )}
          </section>

          {NEXT_STATUSES[order.status].length > 0 && (
            <section className="space-y-3">
              <TextAreaField
                label="Nhắn khách (hiện trên trang theo dõi đơn)"
                rows={2}
                maxLength={300}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Shipper đang tới, khoảng 15 phút"
              />
              <div className="flex flex-wrap gap-2">
                {NEXT_STATUSES[order.status].map((to) => (
                  <Button
                    key={to}
                    variant={to === 'cancelled' ? 'danger' : to === 'done' ? 'success' : 'primary'}
                    disabled={busy}
                    onClick={() => onChange(order, to, note.trim() || undefined)}
                  >
                    {actionLabel(to, order.fulfillment)}
                  </Button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </Dialog>
  );
}
