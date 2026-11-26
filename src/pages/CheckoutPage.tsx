import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Banknote, Bike, ChevronRight, LogIn, MapPin, QrCode, Store, UserRound } from 'lucide-react';
import { checkoutSchema, type CheckoutInput, type CheckoutValues } from '@/schemas/checkout.schema';
import { TextAreaField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { useCartStore, selectSubtotal } from '@/stores/cart.store';
import { useShopStore } from '@/stores/shop.store';
import { useAccountStore, selectActiveProfile } from '@/stores/account.store';
import { useUiStore } from '@/stores/ui.store';
import { toast } from '@/stores/toast.store';
import { orderRepo } from '@/services/order.repo';
import { toAppError } from '@/lib/errors';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/cn';
import { deliveryFeeFor } from '@/domain/pricing';
import { optionsLabel } from '@/domain/options';
import { FreeShipHint } from '@/components/shop/FreeShipHint';

/**
 * Đặt món. Chưa đăng nhập: vẫn xem được đơn, chọn cách nhận / thanh toán / ghi chú — bấm "Đặt món" thì mời đăng nhập.
 * Đã đăng nhập: thêm thẻ "Thông tin người đặt" (tên – SĐT – địa chỉ), bấm vào để đổi hoặc tạo mới.
 */
export default function CheckoutPage() {
  const lines = useCartStore((s) => s.lines);
  const subtotal = useCartStore(selectSubtotal);
  const pendingOrderId = useCartStore((s) => s.pendingOrderId);
  const clear = useCartStore((s) => s.clear);
  const settings = useShopStore((s) => s.settings);
  const shopStatus = useShopStore((s) => s.status);
  const profile = useAccountStore(selectActiveProfile);
  const openLogin = useUiStore((s) => s.openLogin);
  const openProfiles = useUiStore((s) => s.openProfiles);
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const lock = useRef(false); // chặn bấm 2 lần trước khi React kịp render lại

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutInput, unknown, CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { fulfillment: 'delivery', paymentMethod: 'cod', note: '' },
  });
  const fulfillment = watch('fulfillment');
  const paymentMethod = watch('paymentMethod');
  const canTransfer = Boolean(settings.bankAccount && settings.bankBin);
  const deliveryFee = deliveryFeeFor(subtotal, fulfillment, settings);
  const total = subtotal + deliveryFee;
  const belowMin = subtotal < settings.minOrder;

  // Đang mở trang mà tiệm đổi trạng thái → tải lại cấu hình mới nhất (silent: không báo toast trùng)
  useEffect(() => {
    void useShopStore.getState().load({ silent: true });
  }, []);

  if (lines.length === 0) {
    return (
      <div className="shell py-10">
        <EmptyState
          title="Giỏ hàng đang trống"
          description="Thêm vài món ngon rồi quay lại đây nhé."
          action={
            <Link to="/" className="inline-flex min-h-[3rem] items-center rounded-xl border border-edge bg-tangerine px-6 font-bold shadow-sticker">
              Xem menu
            </Link>
          }
        />
      </div>
    );
  }

  const onSubmit = async (v: CheckoutValues) => {
    if (lock.current) return;
    if (!profile) {
      openLogin({
        reason: 'Đăng nhập (tên, số điện thoại, địa chỉ) để tiệm biết giao cho ai. Giỏ hàng của bạn vẫn giữ nguyên.',
        then: () => toast.info('Kiểm tra lại thông tin người đặt rồi bấm "Đặt món" nhé.'),
      });
      return;
    }
    if (!settings.isOpen) return toast.error('Tiệm đang tạm nghỉ nhận đơn online.');
    if (belowMin) return toast.error(`Đơn tối thiểu ${formatPrice(settings.minOrder)}.`);
    lock.current = true;
    setSubmitting(true);
    try {
      const order = await orderRepo.place(pendingOrderId, {
        lines,
        fulfillment: v.fulfillment,
        paymentMethod: canTransfer ? v.paymentMethod : 'cod',
        settings,
        customer: { name: profile.name, phone: profile.phone, address: profile.address, note: v.note },
      });
      clear();
      navigate(`/orders/${order.id}`, { replace: true, state: { justPlaced: true } });
    } catch (e) {
      toast.error(toAppError(e).message);
    } finally {
      lock.current = false;
      setSubmitting(false);
    }
  };

  const optionCls = (active: boolean) =>
    cn(
      'flex min-h-[4rem] cursor-pointer items-center gap-3 rounded-2xl border border-edge px-4 py-3 transition-[background-color,box-shadow]',
      active ? 'bg-lemon shadow-sticker' : 'bg-white hover:bg-lemon-soft',
    );

  return (
    <div className="shell py-6 sm:py-10">
      <Link to="/" className="inline-flex min-h-[2.75rem] items-center gap-2 font-bold text-ink-soft hover:text-ink">
        <ArrowLeft className="h-5 w-5" aria-hidden /> Chọn thêm món
      </Link>
      <h1 className="mt-2 text-3xl sm:text-4xl">Đặt món</h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_24rem]">
        <div className="sticker space-y-5 p-5 sm:p-7">
          {profile ? (
            <div>
              <p className="label">Thông tin người đặt</p>
              <button
                type="button"
                onClick={openProfiles}
                className="flex w-full items-center gap-3 rounded-2xl border border-edge bg-white p-4 text-left transition-colors hover:bg-lemon-soft"
                aria-label={`Thông tin người đặt: ${profile.name}, ${profile.phone}, ${profile.address}. Bấm để đổi hoặc tạo mới`}
              >
                <UserRound className="h-6 w-6 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">
                    {profile.name} <span className="font-normal text-ink-soft">·</span> <span className="tabular">{profile.phone}</span>
                  </span>
                  <span className="flex items-start gap-1.5 text-ink-soft">
                    <MapPin className="mt-1 h-4 w-4 shrink-0" aria-hidden />
                    <span className="min-w-0">{profile.address}</span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-0.5 font-bold text-tangerine-deep">
                  Đổi <ChevronRight className="h-5 w-5" aria-hidden />
                </span>
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-edge-strong bg-cream p-4">
              <LogIn className="h-6 w-6 shrink-0" aria-hidden />
              <p className="min-w-0 flex-1">Bạn chưa đăng nhập. Khi bấm “Đặt món”, bạn nhập tên, số điện thoại và địa chỉ một lần là xong.</p>
              <Button variant="secondary" onClick={() => openLogin()}>
                Đăng nhập
              </Button>
            </div>
          )}

          <fieldset>
            <legend className="label">Nhận món bằng cách nào?</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={optionCls(fulfillment === 'delivery')}>
                <input type="radio" value="delivery" {...register('fulfillment')} className="h-5 w-5 accent-ink" />
                <Bike className="h-6 w-6 shrink-0" aria-hidden />
                <span>
                  <span className="block font-bold">Giao tận nơi</span>
                  <span className="text-[0.9rem] text-ink-soft">
                    {settings.freeShipFrom > 0
                      ? `Phí ship ${formatPrice(settings.deliveryFee)}, freeship từ ${formatPrice(settings.freeShipFrom)}`
                      : `Phí ship ${formatPrice(settings.deliveryFee)}`}
                  </span>
                </span>
              </label>
              <label className={optionCls(fulfillment === 'pickup')}>
                <input type="radio" value="pickup" {...register('fulfillment')} className="h-5 w-5 accent-ink" />
                <Store className="h-6 w-6 shrink-0" aria-hidden />
                <span>
                  <span className="block font-bold">Ghé tiệm lấy</span>
                  <span className="text-[0.9rem] text-ink-soft">Miễn phí</span>
                </span>
              </label>
            </div>
          </fieldset>

          {canTransfer && (
            <fieldset>
              <legend className="label">Thanh toán</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={optionCls(paymentMethod === 'cod')}>
                  <input type="radio" value="cod" {...register('paymentMethod')} className="h-5 w-5 accent-ink" />
                  <Banknote className="h-6 w-6 shrink-0" aria-hidden />
                  <span>
                    <span className="block font-bold">Tiền mặt</span>
                    <span className="text-[0.9rem] text-ink-soft">Trả khi nhận món</span>
                  </span>
                </label>
                <label className={optionCls(paymentMethod === 'transfer')}>
                  <input type="radio" value="transfer" {...register('paymentMethod')} className="h-5 w-5 accent-ink" />
                  <QrCode className="h-6 w-6 shrink-0" aria-hidden />
                  <span>
                    <span className="block font-bold">Chuyển khoản QR</span>
                    <span className="text-[0.9rem] text-ink-soft">Quét mã sau khi đặt</span>
                  </span>
                </label>
              </div>
            </fieldset>
          )}

          <TextAreaField
            label="Ghi chú cho tiệm (không bắt buộc)"
            rows={2}
            maxLength={300}
            placeholder="VD: giao trước 12h, gọi trước khi tới…"
            error={errors.note?.message}
            {...register('note')}
          />
        </div>

        <aside className="sticker bg-lemon-soft p-5 sm:p-6 lg:sticky lg:top-[calc(var(--header-h,5rem)+1rem)]" aria-label="Tóm tắt đơn">
          <h2 className="text-xl">Đơn của bạn</h2>
          <ul className="mt-3 space-y-2">
            {lines.map((l) => (
              <li key={l.key} className="flex justify-between gap-3">
                <span>
                  <span className="font-bold tabular">{l.qty}×</span> {l.name}
                  {l.options.length > 0 && <span className="block text-[0.85rem] text-ink-soft">{optionsLabel(l.options)}</span>}
                  {l.note && <span className="block text-[0.85rem] italic text-ink-soft">Ghi chú: {l.note}</span>}
                </span>
                <span className="shrink-0 tabular">{formatPrice(l.price * l.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1.5 border-t border-dashed border-edge-strong pt-3">
            <div className="flex justify-between">
              <dt>Tạm tính</dt>
              <dd className="tabular">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Phí giao hàng</dt>
              <dd className="tabular">{deliveryFee ? formatPrice(deliveryFee) : 'Miễn phí'}</dd>
            </div>
            {fulfillment === 'delivery' && (
              <div className="py-1">
                <FreeShipHint subtotal={subtotal} />
              </div>
            )}
            <div className="flex items-baseline justify-between pt-2 text-xl font-bold">
              <dt>Tổng cộng</dt>
              <dd className="price text-2xl">{formatPrice(total)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-[0.9rem] text-ink-soft">
            {canTransfer && paymentMethod === 'transfer'
              ? 'Sau khi đặt, bạn sẽ thấy mã QR chuyển khoản đúng số tiền.'
              : 'Thanh toán tiền mặt khi nhận món.'}
          </p>

          {shopStatus === 'ready' && !settings.isOpen && (
            <p className="mt-4 rounded-xl border border-edge bg-white p-3 font-bold" role="alert">
              Tiệm đang tạm nghỉ nhận đơn online.
            </p>
          )}
          {belowMin && (
            <p className="mt-4 rounded-xl border border-edge bg-white p-3 font-bold" role="alert">
              Đơn tối thiểu {formatPrice(settings.minOrder)}, bạn thêm {formatPrice(settings.minOrder - subtotal)} nữa nhé.
            </p>
          )}
          <Button type="submit" size="lg" className="mt-5 w-full" loading={submitting} disabled={!settings.isOpen || belowMin}>
            {submitting ? 'Đang gửi đơn…' : `Đặt món · ${formatPrice(total)}`}
          </Button>
          {!profile && <p className="mt-2 text-center text-[0.9rem] text-ink-soft">Bấm đặt món sẽ mời bạn đăng nhập trước.</p>}
        </aside>
      </form>
    </div>
  );
}
