import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Banknote, Bike, QrCode, Store } from 'lucide-react';
import { checkoutSchema, type CheckoutInput, type CheckoutValues } from '@/schemas/checkout.schema';
import { TextAreaField, TextField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { useCartStore, selectSubtotal } from '@/stores/cart.store';
import { useShopStore } from '@/stores/shop.store';
import { toast } from '@/stores/toast.store';
import { orderRepo } from '@/services/order.repo';
import { toAppError } from '@/lib/errors';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/cn';
import { deliveryFeeFor } from '@/domain/pricing';
import { optionsLabel } from '@/domain/options';
import { FreeShipHint } from '@/components/shop/FreeShipHint';

const SAVED_KEY = 'nb-customer';

function loadSaved(): Partial<CheckoutInput> {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export default function CheckoutPage() {
  const lines = useCartStore((s) => s.lines);
  const subtotal = useCartStore(selectSubtotal);
  const pendingOrderId = useCartStore((s) => s.pendingOrderId);
  const clear = useCartStore((s) => s.clear);
  const settings = useShopStore((s) => s.settings);
  const shopStatus = useShopStore((s) => s.status);
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const lock = useRef(false); // chặn bấm 2 lần trước khi React kịp render lại

  const saved = loadSaved();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutInput, unknown, CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: saved.name ?? '',
      phone: saved.phone ?? '',
      address: saved.address ?? '',
      fulfillment: saved.fulfillment ?? 'delivery',
      paymentMethod: 'cod',
      note: '',
      remember: true,
    },
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
            <Link to="/" className="inline-flex min-h-[3rem] items-center rounded-xl border-2 border-ink bg-tangerine px-6 font-bold shadow-sticker">
              Xem menu
            </Link>
          }
        />
      </div>
    );
  }

  const onSubmit = async (v: CheckoutValues) => {
    if (lock.current) return;
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
        customer: { name: v.name, phone: v.phone, address: v.address, note: v.note },
      });
      if (v.remember) {
        localStorage.setItem(SAVED_KEY, JSON.stringify({ name: v.name, phone: v.phone, address: v.address, fulfillment: v.fulfillment }));
      } else localStorage.removeItem(SAVED_KEY);
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
      'flex min-h-[4rem] cursor-pointer items-center gap-3 rounded-2xl border-2 border-ink px-4 py-3 transition-[background-color,box-shadow]',
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

          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Tên của bạn" autoComplete="name" maxLength={60} error={errors.name?.message} {...register('name')} />
            <TextField
              label="Số điện thoại"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={16}
              placeholder="0901234567"
              error={errors.phone?.message}
              hint="Tiệm gọi xác nhận đơn qua số này"
              {...register('phone')}
            />
          </div>
          {fulfillment === 'delivery' && (
            <TextField
              label="Địa chỉ giao hàng"
              autoComplete="street-address"
              maxLength={200}
              placeholder="Số nhà, đường, phường, quận"
              error={errors.address?.message}
              {...register('address')}
            />
          )}
          <TextAreaField
            label="Ghi chú cho tiệm (không bắt buộc)"
            rows={2}
            maxLength={300}
            placeholder="VD: ít đá, ít ngọt, giao trước 12h…"
            error={errors.note?.message}
            {...register('note')}
          />
          <label className="flex min-h-[2.75rem] cursor-pointer items-center gap-3">
            <input type="checkbox" className="h-5 w-5 accent-ink" {...register('remember')} />
            <span>Ghi nhớ thông tin trên máy này cho lần sau</span>
          </label>
        </div>

        <aside className="sticker bg-lemon-soft p-5 sm:p-6 lg:sticky lg:top-[calc(var(--header-h,5rem)+1rem)]" aria-label="Tóm tắt đơn">
          <h2 className="text-xl">Đơn của bạn</h2>
          <ul className="mt-3 space-y-2">
            {lines.map((l) => (
              <li key={l.key} className="flex justify-between gap-3">
                <span>
                  <span className="font-bold tabular">{l.qty}×</span> {l.name}
                  {l.options.length > 0 && <span className="block text-[0.85rem] text-ink-soft">{optionsLabel(l.options)}</span>}
                </span>
                <span className="shrink-0 tabular">{formatPrice(l.price * l.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1.5 border-t-2 border-dashed border-ink/30 pt-3">
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
            <p className="mt-4 rounded-xl border-2 border-ink bg-white p-3 font-bold" role="alert">
              Tiệm đang tạm nghỉ nhận đơn online.
            </p>
          )}
          {belowMin && (
            <p className="mt-4 rounded-xl border-2 border-ink bg-white p-3 font-bold" role="alert">
              Đơn tối thiểu {formatPrice(settings.minOrder)}, bạn thêm {formatPrice(settings.minOrder - subtotal)} nữa nhé.
            </p>
          )}
          <Button type="submit" size="lg" className="mt-5 w-full" loading={submitting} disabled={!settings.isOpen || belowMin}>
            {submitting ? 'Đang gửi đơn…' : `Đặt món · ${formatPrice(total)}`}
          </Button>
        </aside>
      </form>
    </div>
  );
}
