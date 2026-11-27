import { useEffect, useState } from 'react';
import { cancelReasonLabel } from '@/domain/cancelReasons';
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
import { optionsLabel } from '@/domain/options';
import { PaymentBadge } from './PaymentBadge';

function issueText(i: PriceIssue): string {
  switch (i.kind) {
    case 'price_differs':
      return `${i.name}: đơn ghi ${formatPrice(i.orderPrice)}, menu ${formatPrice(i.menuPrice)}`;
    case 'unknown_product':
      return `${i.name}: không có trong menu`;
    case 'unknown_option':
      return `${i.name}: tuỳ chọn không còn trong menu`;
    case 'subtotal_mismatch':
      return `Tạm tính sai: đúng là ${formatPrice(i.expected)}, đơn ghi ${formatPrice(i.actual)}`;
    case 'total_mismatch':
      return `Tổng sai: đúng là ${formatPrice(i.expected)}, đơn ghi ${formatPrice(i.actual)}`;
    case 'bad_qty':
      return `${i.name}: số lượng ${i.qty} không hợp lệ`;
    case 'count_mismatch':
      return `Số món sai: các dòng cộng lại là ${i.expected}, đơn ghi ${i.actual}`;
    case 'long_text':
      return `${i.name}: ${i.field === 'note' ? 'ghi chú' : 'tên món'} dài ${i.length} ký tự (đơn không đi qua app)`;
    case 'unavailable':
      return `${i.name}: món đang ${i.hidden ? 'ẩn khỏi menu' : 'tạm hết'}, kiểm tra còn làm được không trước khi nhận`;
  }
}

export function OrderDetail({
  order,
  issues,
  busy,
  onClose,
  onChange,
  onTogglePaid,
}: {
  order: Order | null;
  issues: PriceIssue[];
  busy: boolean;
  onClose: () => void;
  onChange: (o: Order, to: OrderStatus, note?: string) => void;
  onTogglePaid: (o: Order) => void;
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
            <PaymentBadge order={order} />
            <span className="text-ink-soft">{formatDateTime(order.createdAt)}</span>
          </div>
          {order.status === 'cancelled' && (
            <p className="rounded-xl border border-edge bg-berry-soft px-3 py-2">
              {order.cancelledBy === 'shop' ? 'Tiệm huỷ' : 'Khách huỷ'}
              {order.cancelReason ? (
                <>
                  {' · '}
                  <strong>{cancelReasonLabel(order.cancelReason, order.cancelledBy)}</strong>
                </>
              ) : (
                ' · không ghi lý do (đơn cũ)'
              )}
              {order.cancelNote && <span className="block">“{order.cancelNote}”</span>}
            </p>
          )}
          {order.status !== 'cancelled' && (
            <Button variant={order.paid ? 'secondary' : 'success'} size="sm" disabled={busy} onClick={() => onTogglePaid(order)}>
              {order.paid ? 'Bỏ xác nhận đã thu tiền' : `Đã nhận ${formatPrice(order.total)}${order.paymentMethod === 'transfer' ? ' (chuyển khoản)' : ''}`}
            </Button>
          )}

          <section>
            <h3 className="text-lg">Khách hàng</h3>
            <p className="font-bold">{order.customer.name}</p>
            <a href={`tel:${order.customer.phone}`} className="inline-flex min-h-[2.75rem] items-center gap-2 font-bold underline underline-offset-4">
              <Phone className="h-4 w-4" aria-hidden /> {order.customer.phone}
            </a>
            <p className="mt-1">
              {order.fulfillment === 'delivery'
                ? order.shipToDriver
                  ? 'Đặt ship · khách trả phí ship cho tài xế'
                  : 'Đặt ship'
                : 'Khách ghé tiệm lấy'}
            </p>
            {order.customer.address && (
              <p className="mt-1 flex items-start gap-2">
                <span className="flex-1">{order.customer.address}</span>
                <button
                  type="button"
                  onClick={() => void copyAddress(order.customer.address)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-edge bg-white"
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
              {order.items.map((it, i) => (
                <li key={`${it.productId}-${i}`} className="flex justify-between gap-3">
                  <span>
                    <span className="font-bold tabular">{it.qty}×</span> {it.name}
                    {it.options.length > 0 && <span className="block text-[0.85rem] text-ink-soft">{optionsLabel(it.options)}</span>}
                {it.note && <span className="block text-[0.85rem] italic text-ink-soft">Ghi chú: {it.note}</span>}
                  </span>
                  <span className="tabular">{formatPrice(it.qty * it.price)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-2 space-y-1 border-t border-dashed border-edge-strong pt-2">
              <div className="flex justify-between">
                <dt>Phí ship</dt>
                <dd className="tabular">{order.shipToDriver ? 'Khách trả tài xế' : formatPrice(order.deliveryFee)}</dd>
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
