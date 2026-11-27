import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, ArrowLeft, Banknote, Bike, Check, LogIn, MapPin, MapPinned, Moon, Phone, Plus, QrCode, Store } from 'lucide-react';
import { checkoutSchema, type CheckoutInput, type CheckoutValues } from '@/schemas/checkout.schema';
import { TextAreaField, TextField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { useCartStore, selectSubtotal } from '@/stores/cart.store';
import { describeChanges, useShopStore } from '@/stores/shop.store';
import { useAccountStore } from '@/stores/account.store';
import { useUiStore } from '@/stores/ui.store';
import { toast } from '@/stores/toast.store';
import { orderRepo } from '@/services/order.repo';
import { toAppError } from '@/lib/errors';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/cn';
import { DEMO } from '@/lib/demo';
import { allowedPayments, deliveryFeeFor, shipsToDriver } from '@/domain/pricing';
import { optionsLabel } from '@/domain/options';
import { FreeShipHint } from '@/components/shop/FreeShipHint';
import { useShopPhase } from '@/hooks/useShopPhase';
import { afterHoursNote } from '@/domain/hours';
import type { Address } from '@/types/domain';

/** Khách vãng lai: nhớ người nhận lần trước trên máy này (không gửi đi đâu) */
const GUEST_KEY = 'nb-guest-recipient';
type Recipient = Pick<Address, 'name' | 'phone' | 'address'>;
function readGuest(): Recipient {
  try {
    const v = JSON.parse(localStorage.getItem(GUEST_KEY) ?? '{}') as Partial<Recipient>;
    return { name: String(v.name ?? ''), phone: String(v.phone ?? ''), address: String(v.address ?? '') };
  } catch {
    return { name: '', phone: '', address: '' };
  }
}

/**
 * Đặt món.
 *  - Đã đăng nhập: chọn người nhận trong sổ địa chỉ (tên – SĐT – địa chỉ) hoặc thêm người nhận mới (tự lưu vào sổ).
 *  - Chưa đăng nhập: vẫn đặt được, tự nhập người nhận (nhớ trên máy cho lần sau).
 *  - Đặt ship: phí đồng giá (biết tổng ngay) hoặc "trả tài xế" (tổng = tiền món) tuỳ cài đặt tiệm;
 *    tiệm có thể bắt đơn ship chuyển khoản trước.
 */
export default function CheckoutPage() {
  const lines = useCartStore((s) => s.lines);
  const subtotal = useCartStore(selectSubtotal);
  const clear = useCartStore((s) => s.clear);
  const settings = useShopStore((s) => s.settings);
  const shopStatus = useShopStore((s) => s.status);
  const account = useAccountStore((s) => s.account);
  const addresses = useAccountStore((s) => s.addresses);
  const defaultAddressId = useAccountStore((s) => s.defaultAddressId);
  const openLogin = useUiStore((s) => s.openLogin);
  const openProfiles = useUiStore((s) => s.openProfiles);
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const lock = useRef(false); // chặn bấm 2 lần trước khi React kịp render lại
  /** Người nhận đang chọn trong sổ địa chỉ; 'new' = nhập người nhận mới */
  const [selectedId, setSelectedId] = useState<string>('new');

  const guest = useMemo(readGuest, []);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    getValues,
    formState: { errors },
  } = useForm<CheckoutInput, unknown, CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { fulfillment: 'delivery', paymentMethod: 'cod', note: '', ...guest, saveAddress: true },
  });
  const fulfillment = watch('fulfillment');
  const paymentMethod = watch('paymentMethod');
  const payments = allowedPayments(fulfillment, settings);
  const toDriver = shipsToDriver(fulfillment, settings);
  const deliveryFee = deliveryFeeFor(subtotal, fulfillment, settings);
  const total = subtotal + deliveryFee;
  const belowMin = subtotal < settings.minOrder;
  const phase = useShopPhase();
  const cartChanges = useShopStore((s) => s.lastChanges);

  // Đang mở trang mà tiệm đổi trạng thái → tải lại cấu hình mới nhất; kiểm tra phiên đăng nhập
  useEffect(() => {
    // Vào trang = tải menu mới (món vừa tạm hết được bỏ khỏi giỏ và báo ngay đầu trang, không âm thầm)
    useShopStore.getState().clearChanges();
    void useShopStore.getState().load({ silent: true });
    void useAccountStore.getState().init();
  }, []);

  // Có sổ địa chỉ → chọn sẵn địa chỉ mặc định (đổi tài khoản / sổ tải xong thì chọn lại)
  useEffect(() => {
    const def = addresses.find((a) => a.id === defaultAddressId) ?? addresses[0];
    if (account && def) pick(def);
    else {
      setSelectedId('new');
      if (!account) reset({ ...getValues(), ...guest, saveAddress: true });
      else reset({ ...getValues(), name: '', phone: '', address: '', saveAddress: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.uid, addresses, defaultAddressId]);

  // Cách thanh toán đang chọn không còn hợp lệ (đổi sang đặt ship mà tiệm bắt chuyển khoản…) → chọn cái được phép
  useEffect(() => {
    if (!payments.includes(paymentMethod)) setValue('paymentMethod', payments[0]!);
  }, [payments, paymentMethod, setValue]);

  function pick(a: Address) {
    setSelectedId(a.id);
    setValue('name', a.name, { shouldValidate: false });
    setValue('phone', a.phone, { shouldValidate: false });
    setValue('address', a.address, { shouldValidate: false });
    setValue('saveAddress', false);
  }

  function pickNew() {
    setSelectedId('new');
    setValue('name', '');
    setValue('phone', '');
    setValue('address', '');
    setValue('saveAddress', true);
  }

  if (lines.length === 0) {
    return (
      <div className="shell py-10">
        <EmptyState
          title={cartChanges.length ? 'Món trong giỏ vừa hết' : 'Giỏ hàng đang trống'}
          description={cartChanges.length ? `${describeChanges(cartChanges)}. Bạn chọn món khác nhé.` : 'Thêm vài món ngon rồi quay lại đây nhé.'}
          action={
            <Link viewTransition to="/" className="inline-flex min-h-[3rem] items-center rounded-xl border border-edge bg-tangerine px-6 font-bold shadow-sticker">
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
      // Kiểm menu mới nhất NGAY trước khi gửi: trang mở lâu có thể đang giữ món tiệm vừa tắt / đổi giá.
      // Có thay đổi → dừng lại cho khách xem giỏ mới, không gửi đơn có món đã hết.
      const changes = await useShopStore.getState().load({ silent: true });
      if (changes.length) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const recipient = { name: v.name, phone: v.phone, address: v.address };
      if (account && selectedId === 'new' && v.saveAddress && v.fulfillment === 'delivery') {
        // Lưu sổ địa chỉ lỗi (mất mạng…) không chặn việc đặt món
        await useAccountStore.getState().saveAddress(recipient).catch(() => toast.info('Chưa lưu được địa chỉ vào sổ, đơn vẫn được gửi.'));
      }
      if (!account) localStorage.setItem(GUEST_KEY, JSON.stringify(recipient));
      const order = await orderRepo.place(useCartStore.getState().pendingOrderId, {
        lines: useCartStore.getState().lines,
        fulfillment: v.fulfillment,
        paymentMethod: payments.includes(v.paymentMethod) ? v.paymentMethod : payments[0]!,
        settings: useShopStore.getState().settings,
        customer: { ...recipient, note: v.note },
      });
      clear();
      navigate(`/orders/${order.id}`, { replace: true, state: { justPlaced: true }, viewTransition: true });
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

  const shipHint = toDriver
    ? 'Phí ship trả tài xế khi nhận'
    : settings.freeShipFrom > 0
      ? `Phí ship ${formatPrice(settings.deliveryFee)}, freeship từ ${formatPrice(settings.freeShipFrom)}`
      : `Phí ship ${formatPrice(settings.deliveryFee)}`;
  const showFields = !account || selectedId === 'new' || addresses.length === 0;

  return (
    <div className="shell py-6 sm:py-10">
      <Link viewTransition to="/" className="inline-flex min-h-[2.75rem] items-center gap-2 font-bold text-ink-soft hover:text-ink">
        <ArrowLeft className="h-5 w-5" aria-hidden /> Chọn thêm món
      </Link>
      <h1 className="mt-2 text-3xl sm:text-4xl">Đặt món</h1>

      {cartChanges.length > 0 && (
        <p className="mt-4 flex items-start gap-2.5 rounded-2xl border-2 border-danger bg-danger-soft p-4 font-bold text-danger" role="alert">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <span>
            {describeChanges(cartChanges)}. Bạn kiểm tra lại đơn rồi bấm đặt nhé.
          </span>
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_24rem]">
        <div className="sticker space-y-6 p-5 sm:p-7">
          <fieldset>
            <legend className="label">Nhận món bằng cách nào?</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={optionCls(fulfillment === 'delivery')}>
                <input type="radio" value="delivery" {...register('fulfillment')} className="h-5 w-5 accent-ink" />
                <Bike className="h-6 w-6 shrink-0" aria-hidden />
                <span>
                  <span className="block font-bold">Đặt ship</span>
                  <span className="text-[0.9rem] text-ink-soft">{shipHint}</span>
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

          <fieldset>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <legend className="label mb-0">{fulfillment === 'delivery' ? 'Giao tới' : 'Người lấy món'}</legend>
              {account && addresses.length > 0 && (
                <button type="button" onClick={openProfiles} className="inline-flex min-h-[2.75rem] items-center gap-1.5 font-bold text-tangerine-deep hover:underline">
                  <MapPinned className="h-4 w-4" aria-hidden /> Sổ địa chỉ
                </button>
              )}
            </div>

            {account && addresses.length > 0 && (
              <div className="mb-4 grid gap-2.5" role="radiogroup" aria-label="Chọn người nhận">
                {addresses.map((a) => {
                  const active = selectedId === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => pick(a)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors',
                        active ? 'border-ink bg-lemon-soft' : 'border-edge bg-white hover:bg-lemon-soft',
                      )}
                    >
                      <span
                        className={cn('mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2', active ? 'border-ink bg-ink text-cream' : 'border-edge-strong')}
                        aria-hidden
                      >
                        {active && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">{a.name}</span>
                        <span className="flex items-center gap-1.5 text-ink-soft">
                          <Phone className="h-4 w-4 shrink-0" aria-hidden /> <span className="tabular">{a.phone}</span>
                        </span>
                        {fulfillment === 'delivery' && (
                          <span className="flex items-start gap-1.5 text-ink-soft">
                            <MapPin className="mt-1 h-4 w-4 shrink-0" aria-hidden /> <span className="min-w-0">{a.address}</span>
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedId === 'new'}
                  onClick={pickNew}
                  className={cn(
                    'flex min-h-[3rem] w-full items-center gap-3 rounded-2xl border border-dashed p-3.5 text-left font-bold transition-colors',
                    selectedId === 'new' ? 'border-ink bg-lemon-soft' : 'border-edge-strong bg-white hover:bg-lemon-soft',
                  )}
                >
                  <Plus className="h-5 w-5 shrink-0" aria-hidden /> Người nhận / địa chỉ khác
                </button>
              </div>
            )}

            {/* Luôn đăng ký field để validate; ẩn khi đang chọn địa chỉ có sẵn */}
            <div className={cn('grid gap-4 sm:grid-cols-2', !showFields && 'hidden')}>
              <TextField label="Tên người nhận" autoComplete="name" maxLength={60} placeholder="VD: Nguyễn Văn A" error={errors.name?.message} {...register('name')} />
              <TextField
                label="Số điện thoại"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={16}
                placeholder="0901234567"
                hint="Tiệm / tài xế gọi số này"
                error={errors.phone?.message}
                {...register('phone')}
              />
              {fulfillment === 'delivery' && (
                <TextField
                  className="sm:col-span-2"
                  label="Địa chỉ giao hàng"
                  autoComplete="street-address"
                  maxLength={200}
                  placeholder="Số nhà, đường, phường, quận"
                  error={errors.address?.message}
                  {...register('address')}
                />
              )}
              {account && fulfillment === 'delivery' && (
                <label className="flex min-h-[2.75rem] cursor-pointer items-center gap-3 sm:col-span-2">
                  <input type="checkbox" {...register('saveAddress')} className="h-5 w-5 accent-ink" />
                  Lưu vào sổ địa chỉ cho lần sau
                </label>
              )}
            </div>
            {/* Đang chọn địa chỉ có sẵn mà địa chỉ bị lỗi (sửa tay trong DB…) → vẫn báo */}
            {!showFields && (errors.name || errors.phone || errors.address) && (
              <p className="mt-2 font-bold text-danger" role="alert">
                Địa chỉ này thiếu thông tin, bấm “Sổ địa chỉ” để sửa.
              </p>
            )}

            {!account && !DEMO && (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-edge-strong bg-cream p-3.5">
                <LogIn className="h-5 w-5 shrink-0" aria-hidden />
                <p className="min-w-0 flex-1 text-[0.95rem]">Có tài khoản thì chọn nhanh địa chỉ đã lưu và xem đơn trên mọi máy.</p>
                <Button variant="secondary" onClick={() => openLogin({ reason: 'Đăng nhập để dùng sổ địa chỉ. Giỏ hàng của bạn vẫn giữ nguyên.' })}>
                  Đăng nhập
                </Button>
              </div>
            )}
          </fieldset>

          <fieldset>
            <legend className="label">Thanh toán</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {payments.includes('cod') && (
                <label className={optionCls(paymentMethod === 'cod')}>
                  <input type="radio" value="cod" {...register('paymentMethod')} className="h-5 w-5 accent-ink" />
                  <Banknote className="h-6 w-6 shrink-0" aria-hidden />
                  <span>
                    <span className="block font-bold">Tiền mặt</span>
                    <span className="text-[0.9rem] text-ink-soft">Trả khi nhận món</span>
                  </span>
                </label>
              )}
              {payments.includes('transfer') && (
                <label className={optionCls(paymentMethod === 'transfer')}>
                  <input type="radio" value="transfer" {...register('paymentMethod')} className="h-5 w-5 accent-ink" />
                  <QrCode className="h-6 w-6 shrink-0" aria-hidden />
                  <span>
                    <span className="block font-bold">Chuyển khoản QR</span>
                    <span className="text-[0.9rem] text-ink-soft">Quét mã ngay sau khi đặt</span>
                  </span>
                </label>
              )}
            </div>
            {fulfillment === 'delivery' && settings.shipPrepaid && payments.length === 1 && payments[0] === 'transfer' && (
              <p className="mt-2 text-[0.9rem] text-ink-soft">Đơn ship cần chuyển khoản trước, tiệm làm món ngay khi nhận được tiền.</p>
            )}
          </fieldset>

          <TextAreaField
            label="Ghi chú cho tiệm (không bắt buộc)"
            rows={2}
            maxLength={300}
            placeholder="VD: giao trước 12h, gọi trước khi tới…"
            error={errors.note?.message}
            {...register('note')}
          />
        </div>

        <aside className="sticker bg-lemon-soft p-5 sm:p-6 lg:sticky lg:top-[calc(var(--sticky-top,5rem)+1rem)]" aria-label="Tóm tắt đơn">
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
            <div className="flex justify-between gap-3">
              <dt>Phí ship</dt>
              <dd className="text-right tabular">{toDriver ? 'Trả tài xế khi nhận' : deliveryFee ? formatPrice(deliveryFee) : 'Miễn phí'}</dd>
            </div>
            {fulfillment === 'delivery' && (
              <div className="py-1">
                <FreeShipHint subtotal={subtotal} />
              </div>
            )}
            <div className="flex items-baseline justify-between pt-2 text-xl font-bold">
              <dt>{toDriver ? 'Tiền món' : 'Tổng cộng'}</dt>
              <dd className="price text-2xl">{formatPrice(total)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-[0.9rem] text-ink-soft">
            {paymentMethod === 'transfer'
              ? 'Sau khi đặt, bạn sẽ thấy mã QR chuyển khoản đúng số tiền.'
              : 'Thanh toán tiền mặt khi nhận món.'}
            {toDriver && ' Phí ship tính theo app giao hàng, trả trực tiếp cho tài xế.'}
          </p>

          {shopStatus === 'ready' && !settings.isOpen && (
            <p className="mt-4 rounded-xl border border-edge bg-white p-3 font-bold" role="alert">
              Tiệm đang tạm nghỉ nhận đơn online.
            </p>
          )}
          {phase.kind === 'after-hours' && (
            <p className="mt-4 flex items-start gap-2.5 rounded-xl border border-edge bg-white p-3 font-bold" role="status">
              <Moon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              {afterHoursNote(phase)}
            </p>
          )}
          {belowMin && (
            <p className="mt-4 rounded-xl border border-edge bg-white p-3 font-bold" role="alert">
              Đơn tối thiểu {formatPrice(settings.minOrder)}, bạn thêm {formatPrice(settings.minOrder - subtotal)} nữa nhé.
            </p>
          )}
          <Button type="submit" size="lg" className="mt-5 w-full" loading={submitting} disabled={!settings.isOpen || belowMin}>
            {submitting ? 'Đang gửi đơn…' : `${phase.kind === 'after-hours' ? 'Đặt trước' : 'Đặt món'} · ${formatPrice(total)}`}
          </Button>
        </aside>
      </form>
    </div>
  );
}
