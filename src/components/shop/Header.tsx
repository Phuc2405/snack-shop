import { useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ReceiptText, ShoppingBasket } from 'lucide-react';
import { useCartStore, selectCount } from '@/stores/cart.store';
import { useShopStore } from '@/stores/shop.store';
import { useUiStore } from '@/stores/ui.store';
import { cn } from '@/lib/cn';
import { BrandMark } from './BrandMark';

export function Header() {
  const name = useShopStore((s) => s.settings.name);
  const announcement = useShopStore((s) => s.settings.announcement);
  const count = useCartStore(selectCount);
  const openCart = useUiStore((s) => s.openCart);
  const bump = useUiStore((s) => s.bump);

  // Chiều cao header thật (có/không có dòng thông báo, chữ to lên khi zoom) → biến CSS --header-h
  // để thanh chip danh mục dính ngay bên dưới, không bị che ở mọi kích thước màn hình.
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const navCls =({ isActive }: { isActive: boolean }) =>
    cn(
      'inline-flex min-h-[2.75rem] items-center gap-2 rounded-full px-3 font-bold transition-colors hover:bg-lemon-soft sm:px-4',
      isActive && 'bg-lemon-soft',
    );

  return (
    <header ref={ref} className="sticky top-0 z-40">
      {announcement && (
        <p className="border-b-2 border-ink bg-berry px-4 py-1.5 text-center text-[0.9rem] font-bold text-ink">{announcement}</p>
      )}
      <div className="border-b-2 border-ink bg-lemon">
        <div className="shell flex h-16 items-center justify-between gap-2 sm:h-[4.5rem] sm:gap-3">
          <Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-2.5" aria-label={`${name}, về trang chủ`}>
            <BrandMark className="h-9 w-9 shrink-0 sm:h-11 sm:w-11" />
            {/* Tên dài thì xuống 2 dòng thay vì bị cắt "Tiệm Ă…" trên điện thoại */}
            <span className="hidden text-base font-bold leading-tight min-[360px]:line-clamp-2 sm:text-xl" aria-hidden>
              {name}
            </span>
          </Link>

          <nav className="flex shrink-0 items-center gap-1 sm:gap-2" aria-label="Điều hướng chính">
            <NavLink to="/orders" className={navCls}>
              <ReceiptText className="h-5 w-5" strokeWidth={2.25} aria-hidden />
              <span className="hidden sm:inline">Đơn của tôi</span>
              <span className="sr-only sm:hidden">Đơn của tôi</span>
            </NavLink>
            <button
              type="button"
              onClick={openCart}
              className="relative inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border-2 border-ink bg-white px-3.5 font-bold shadow-sticker transition-transform hover:-translate-y-0.5 sm:px-4"
              aria-label={`Giỏ hàng, ${count} món`}
            >
              <ShoppingBasket key={bump} className={cn('h-5 w-5', bump > 0 && 'animate-bump')} strokeWidth={2.25} aria-hidden />
              <span className="hidden sm:inline">Giỏ hàng</span>
              {count > 0 && (
                <span className="grid h-6 min-w-[1.5rem] place-items-center rounded-full border-2 border-ink bg-tangerine px-1 text-[0.8rem] leading-none tabular">
                  {count}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
