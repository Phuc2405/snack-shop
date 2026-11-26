import { useLocation } from 'react-router-dom';
import { ShoppingBasket } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { useCartStore, selectCount, selectSubtotal } from '@/stores/cart.store';
import { useUiStore } from '@/stores/ui.store';

/**
 * Thanh giỏ dính đáy màn hình (chỉ điện thoại, khi giỏ có món): ngón cái bấm tới được ngay,
 * khỏi cuộn lên đầu trang tìm icon giỏ. Trang chừa sẵn khoảng trống (pb-24) để không che nội dung.
 */
export function MobileCartBar() {
  const count = useCartStore(selectCount);
  const subtotal = useCartStore(selectSubtotal);
  const openCart = useUiStore((s) => s.openCart);
  const { pathname } = useLocation();
  // Trang Đặt món đã có nút đặt riêng → ẩn thanh giỏ để không che form
  if (count === 0 || pathname === '/checkout') return null;
  return (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-30 px-3 pt-2 sm:hidden">
      <button
        type="button"
        onClick={openCart}
        className="flex min-h-[3.5rem] w-full animate-slide-up items-center justify-between gap-3 rounded-2xl border border-edge bg-tangerine px-4 font-bold shadow-sticker active:translate-y-[2px] active:shadow-none"
      >
        <span className="flex items-center gap-2">
          <ShoppingBasket className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          {count} món
        </span>
        <span className="flex items-center gap-2">
          {formatPrice(subtotal)} <span aria-hidden>→</span>
        </span>
      </button>
    </div>
  );
}
