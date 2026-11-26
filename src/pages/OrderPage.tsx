import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, PartyPopper } from 'lucide-react';
import { orderRepo } from '@/services/order.repo';
import { useAsync } from '@/hooks/useAsync';
import { isFinal, statusLabel } from '@/domain/orderStatus';
import { OrderProgress } from '@/components/shop/OrderProgress';
import { Button } from '@/components/ui/Button';
import { EmptyState, PageLoader } from '@/components/ui/Feedback';
import { formatDateTime, formatPrice } from '@/lib/format';
import { toAppError } from '@/lib/errors';
import { confirmDialog } from '@/stores/confirm.store';
import { toast } from '@/stores/toast.store';
import { useShopStore } from '@/stores/shop.store';

const POLL_MS = 15_000;

/** Theo dõi đơn: tự cập nhật trạng thái mỗi 15 giây khi tab đang mở (dừng khi đơn đã xong/huỷ). */
export default function OrderPage() {
  const { id = '' } = useParams();
  const justPlaced = Boolean((useLocation().state as { justPlaced?: boolean } | null)?.justPlaced);
  const hotline = useShopStore((s) => s.settings.hotline);
  const [cancelling, setCancelling] = useState(false);
  const [finished, setFinished] = useState(false);
  const { data: order, loading, error, reload, setData } = useAsync(
    async () => {
      const o = await orderRepo.getMine(id);
      if (o && isFinal(o.status)) setFinished(true);
      return o;
    },
    [id],
    { pollMs: finished ? undefined : POLL_MS },
  );

  if (loading && !order) return <PageLoader label="Đang tải đơn…" />;
  if (error && !order) {
    return <EmptyState tone="error" title="Chưa tải được đơn" description={error.message} action={<Button onClick={reload}>Thử lại</Button>} />;
  }
  if (!order) {
    return (
      <EmptyState
        title="Không tìm thấy đơn"
        description="Đơn chỉ xem được trên thiết bị đã đặt. Cần hỗ trợ, bạn gọi tiệm nhé."
        action={
          <Link to="/" className="font-bold underline underline-offset-4">
            Về trang chủ
          </Link>
        }
      />
    );
  }

  const cancel = async () => {
    const ok = await confirmDialog({ title: 'Huỷ đơn này?', message: 'Tiệm chưa nhận đơn nên bạn huỷ được ngay.', confirmLabel: 'Huỷ đơn', danger: true });
    if (!ok) return;
    setCancelling(true);
    try {
      await orderRepo.cancelMine(order.id);
      setData((o) => (o ? { ...o, status: 'cancelled', cancelledBy: 'customer' } : o));
      setFinished(true);
      toast.success('Đã huỷ đơn.');
    } catch (e) {
      toast.error(toAppError(e).message);
      reload();
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="shell max-w-2xl py-6 sm:py-10">
      <Link to="/orders" className="inline-flex min-h-[2.75rem] items-center gap-2 font-bold text-ink-soft hover:text-ink">
        <ArrowLeft className="h-5 w-5" aria-hidden /> Đơn của tôi
      </Link>

      {justPlaced && order.status === 'new' && (
        <div className="sticker mt-3 flex animate-pop-in items-center gap-4 bg-mint-soft p-4 sm:p-5" role="status">
          <PartyPopper className="h-10 w-10 shrink-0" aria-hidden />
          <div>
            <p className="text-xl font-bold">Đặt món thành công!</p>
            <p className="text-ink-soft">Tiệm sẽ gọi xác nhận trong ít phút. Trang này tự cập nhật trạng thái.</p>
          </div>
        </div>
      )}

      <div className="sticker mt-5 p-5 sm:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl sm:text-3xl">
            Đơn <span className="tabular">{order.code}</span>
          </h1>
          <span className="text-ink-soft">{formatDateTime(order.createdAt)}</span>
        </div>
        <p className="mt-1 text-lg">
          Trạng thái: <strong>{statusLabel(order.status, order.fulfillment)}</strong>
          {order.status === 'cancelled' && order.cancelledBy === 'shop' && ' (tiệm huỷ)'}
        </p>
        <div className="mt-5">
          <OrderProgress status={order.status} fulfillment={order.fulfillment} />
        </div>
        {order.staffNote && <p className="mt-4 rounded-xl border-2 border-ink bg-lemon-soft p-3">Tiệm nhắn: {order.staffNote}</p>}

        <h2 className="mt-7 text-xl">Món đã đặt</h2>
        <ul className="mt-2 space-y-1.5">
          {order.items.map((it) => (
            <li key={it.productId} className="flex justify-between gap-3">
              <span>
                <span className="font-bold tabular">{it.qty}×</span> {it.name}
              </span>
              <span className="tabular">{formatPrice(it.price * it.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t-2 border-dashed border-ink/30 pt-3">
          <div className="flex justify-between">
            <dt>Phí giao hàng</dt>
            <dd className="tabular">{order.deliveryFee ? formatPrice(order.deliveryFee) : 'Miễn phí'}</dd>
          </div>
          <div className="flex justify-between text-xl font-bold">
            <dt>Tổng cộng</dt>
            <dd className="price">{formatPrice(order.total)}</dd>
          </div>
        </dl>

        <h2 className="mt-7 text-xl">{order.fulfillment === 'delivery' ? 'Giao tới' : 'Ghé tiệm lấy'}</h2>
        <p className="mt-1">
          {order.customer.name} · {order.customer.phone}
        </p>
        {order.customer.address && <p className="text-ink-soft">{order.customer.address}</p>}
        {order.customer.note && <p className="mt-1 text-ink-soft">Ghi chú: {order.customer.note}</p>}

        <div className="mt-7 flex flex-wrap gap-3">
          {hotline && (
            <a
              href={`tel:${hotline.replace(/\s/g, '')}`}
              className="inline-flex min-h-[3rem] items-center gap-2 rounded-xl border-2 border-ink bg-white px-5 font-bold shadow-sticker"
            >
              <Phone className="h-5 w-5" aria-hidden /> Gọi tiệm
            </a>
          )}
          {order.status === 'new' && (
            <Button variant="danger" onClick={() => void cancel()} loading={cancelling}>
              Huỷ đơn
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
