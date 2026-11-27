import { Truck } from 'lucide-react';
import { freeShipRemaining } from '@/domain/pricing';
import { formatPrice } from '@/lib/format';
import { useShopStore } from '@/stores/shop.store';

/** "Mua thêm 25.000đ để được freeship" + thanh tiến độ. Ẩn khi tiệm không bật freeship hoặc phí ship trả tài xế. */
export function FreeShipHint({ subtotal }: { subtotal: number }) {
  const freeShipFrom = useShopStore((s) => s.settings.freeShipFrom);
  const driverPays = useShopStore((s) => s.settings.shipFeeMode === 'driver');
  if (freeShipFrom <= 0 || driverPays) return null;
  const remaining = freeShipRemaining(subtotal, { freeShipFrom });
  const pct = Math.min(100, Math.round((subtotal / freeShipFrom) * 100));
  return (
    <div className="rounded-xl border border-edge bg-mint-soft px-3 py-2" role="status">
      <p className="flex items-center gap-2 text-[0.95rem] font-bold">
        <Truck className="h-5 w-5 shrink-0" aria-hidden />
        {remaining === null ? 'Đơn của bạn được miễn phí giao hàng!' : `Mua thêm ${formatPrice(remaining)} để được freeship`}
      </p>
      <div
        className="mt-1.5 h-2.5 overflow-hidden rounded-full border border-edge bg-white"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Tiến độ freeship"
      >
        <div className="h-full bg-mint transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
