import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, PartyPopper, Moon } from 'lucide-react';
import { orderRepo } from '@/services/order.repo';
import { useAsync } from '@/hooks/useAsync';
import { isFinal, statusLabel } from '@/domain/orderStatus';
import { OrderProgress } from '@/components/shop/OrderProgress';
import { Button } from '@/components/ui/Button';
import { EmptyState, PageLoader } from '@/components/ui/Feedback';
import { formatDateTime, formatPrice } from '@/lib/format';
import { toAppError } from '@/lib/errors';
import { toast } from '@/stores/toast.store';
import { useShopPhase } from '@/hooks/useShopPhase';
import { CancelOrderDialog } from '@/components/shop/CancelOrderDialog';
import { CUSTOMER_CANCEL_REASONS, cancelReasonLabel } from '@/domain/cancelReasons';
import { afterHoursNote } from '@/domain/hours';
import { useShopStore } from '@/stores/shop.store';
import { optionsLabel } from '@/domain/options';
import { PaymentQR } from '@/components/shop/PaymentQR';

const POLL_MS = 15_000;

/** Theo dõi đơn: tự cập nhật trạng thái mỗi 15 giây khi tab đang mở (dừng khi đơn đã xong/huỷ). */
export default function OrderPage() {
  const { id = '' } = useParams();
  const phase = useShopPhase();
  const justPlaced = Boolean((useLocation().state as { justPlaced?: boolean } | null)?.justPlaced);
  const settings = useShopStore((s) => s.settings);
  const hotline = settings.hotline;
  const [cancelling, setCancelling] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [finished, setFinished] = useState(false);
  const isFinished = (o: { status: Parameters<typeof isFinal>[0]; paymentMethod: string; paid: boolean }) =>
    isFinal(o.status) && (o.paymentMethod !== 'transfer' || o.paid || o.status === 'cancelled');
  const { data: order, loading, error, reload, setData } = useAsync(
    async () => {
      const o = await orderRepo.getMine(id);
      if (o && isFinished(o)) setFinished(true);
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
          <Link viewTransition to="/" className="font-bold underline underline-offset-4">
            Về trang chủ
          </Link>
        }
      />
    );
  }

  /** Khách huỷ: bắt buộc chọn lý do (hộp CancelOrderDialog), ghi chú tuỳ chọn */
  const cancel = async (reason: string, note: string) => {
    setCancelling(true);
    try {
      await orderRepo.cancelMine(order.id, reason, note);
      setData((o) => (o ? { ...o, status: 'cancelled', cancelledBy: 'customer', cancelReason: reason, cancelNote: note || undefined } : o));
      setFinished(true);
      setCancelOpen(false);
      toast.success('Đã huỷ đơn.');
    } catch (e) {
      toast.error(toAppError(e).message);
      setCancelOpen(false);
      reload();
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="shell max-w-2xl py-6 sm:py-10">
      <Link viewTransition to="/orders" className="inline-flex min-h-[2.75rem] items-center gap-2 font-bold text-ink-soft hover:text-ink">
        <ArrowLeft className="h-5 w-5" aria-hidden /> Đơn của tôi
      </Link>

      {justPlaced && order.status === 'new' && (
        <div className="sticker mt-3 flex animate-pop-in items-center gap-4 bg-mint-soft p-4 sm:p-5" role="status">
          <PartyPopper className="h-10 w-10 shrink-0" aria-hidden />
          <div>
            <p className="text-xl font-bold">Đặt món thành công!</p>
            <p className="text-ink-soft">
              {phase.kind === 'after-hours'
                ? 'Trang này tự cập nhật khi tiệm xác nhận.'
                : 'Tiệm sẽ gọi xác nhận trong ít phút. Trang này tự cập nhật trạng thái.'}
            </p>
          </div>
        </div>
      )}
      {/* Đặt ngoài giờ: nói rõ khi nào tiệm xử lý để khách không chờ trong vô vọng */}
      {order.status === 'new' && phase.kind === 'after-hours' && (
        <p className="mt-3 flex items-start gap-3 rounded-2xl border border-edge bg-lemon-soft p-4 font-bold" role="status">
          <Moon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          {afterHoursNote(phase)}
        </p>
      )}

      {order.paymentMethod === 'transfer' && !order.paid && order.status !== 'cancelled' && settings.bankAccount && (
        <PaymentQR
          bin={settings.bankBin}
          account={settings.bankAccount}
          accountName={settings.bankAccountName}
          amount={order.total}
          code={order.code}
        />
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
        {order.status === 'cancelled' && order.cancelReason && (
          <p className="mt-2 rounded-xl border border-edge bg-cream px-3 py-2">
            Lý do: <strong>{cancelReasonLabel(order.cancelReason, order.cancelledBy)}</strong>
            {order.cancelNote && <span className="block text-ink-soft">“{order.cancelNote}”</span>}
          </p>
        )}
        <div className="mt-5">
          <OrderProgress status={order.status} fulfillment={order.fulfillment} />
        </div>
        <p className="mt-2">
          Thanh toán: <strong>{order.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt khi nhận'}</strong>
          {order.paid && <span className="ml-2 rounded-full border border-edge bg-mint px-2 py-0.5 text-[0.85rem] font-bold">Đã thanh toán</span>}
        </p>
        {order.staffNote && <p className="mt-4 rounded-xl border border-edge bg-lemon-soft p-3">Tiệm nhắn: {order.staffNote}</p>}

        <h2 className="mt-7 text-xl">Món đã đặt</h2>
        <ul className="mt-2 space-y-1.5">
          {order.items.map((it, i) => (
            <li key={`${it.productId}-${i}`} className="flex justify-between gap-3">
              <span>
                <span className="font-bold tabular">{it.qty}×</span> {it.name}
                {it.options.length > 0 && <span className="block text-[0.85rem] text-ink-soft">{optionsLabel(it.options)}</span>}
                {it.note && <span className="block text-[0.85rem] italic text-ink-soft">Ghi chú: {it.note}</span>}
              </span>
              <span className="tabular">{formatPrice(it.price * it.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-dashed border-edge-strong pt-3">
          <div className="flex justify-between">
            <dt>Phí ship</dt>
            <dd className="tabular">
              {order.shipToDriver ? 'Trả tài xế khi nhận' : order.deliveryFee ? formatPrice(order.deliveryFee) : 'Miễn phí'}
            </dd>
          </div>
          <div className="flex justify-between text-xl font-bold">
            <dt>{order.shipToDriver ? 'Tiền món' : 'Tổng cộng'}</dt>
            <dd className="price">{formatPrice(order.total)}</dd>
          </div>
        </dl>
        {order.shipToDriver && (
          <p className="mt-2 text-[0.9rem] text-ink-soft">Phí ship tính theo app giao hàng, bạn trả trực tiếp cho tài xế khi nhận món.</p>
        )}

        <h2 className="mt-7 text-xl">{order.fulfillment === 'delivery' ? 'Ship tới' : 'Ghé tiệm lấy'}</h2>
        <p className="mt-1">
          {order.customer.name} · {order.customer.phone}
        </p>
        {order.customer.address && <p className="text-ink-soft">{order.customer.address}</p>}
        {order.customer.note && <p className="mt-1 text-ink-soft">Ghi chú: {order.customer.note}</p>}

        <div className="mt-7 flex flex-wrap gap-3">
          {hotline && (
            <a
              href={`tel:${hotline.replace(/\s/g, '')}`}
              className="inline-flex min-h-[3rem] items-center gap-2 rounded-xl border border-edge bg-white px-5 font-bold shadow-sticker"
            >
              <Phone className="h-5 w-5" aria-hidden /> Gọi tiệm
            </a>
          )}
          {order.status === 'new' && (
            <Button variant="danger" onClick={() => setCancelOpen(true)} loading={cancelling}>
              Huỷ đơn
            </Button>
          )}
        </div>
      </div>
      <CancelOrderDialog
        open={cancelOpen}
        title={`Huỷ đơn ${order.code}?`}
        description="Tiệm chưa nhận đơn nên bạn huỷ được ngay. Cho tiệm biết lý do để phục vụ tốt hơn nhé."
        reasons={CUSTOMER_CANCEL_REASONS}
        onClose={() => setCancelOpen(false)}
        onConfirm={cancel}
      />
    </div>
  );
}
