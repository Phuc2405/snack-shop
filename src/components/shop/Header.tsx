import { lazy, Suspense, useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { LayoutDashboard, LogIn, ReceiptText, ShoppingBasket } from 'lucide-react';
import { useCartStore, selectCount } from '@/stores/cart.store';
import { useShopStore } from '@/stores/shop.store';
import { useUiStore } from '@/stores/ui.store';
import { cn } from '@/lib/cn';
import { BrandMark } from './BrandMark';

import { useAccountStore } from '@/stores/account.store';
import { DEMO } from '@/lib/demo';

// Hộp tài khoản chỉ cần khi đã đăng nhập → tách chunk, khách vãng lai không phải tải (ngân sách JS lần đầu)
const AccountMenu = lazy(() => import('./AccountMenu').then((m) => ({ default: m.AccountMenu })));

export function Header() {
  const name = useShopStore((s) => s.settings.name);
  const announcement = useShopStore((s) => s.settings.announcement);
  const count = useCartStore(selectCount);
  const openCart = useUiStore((s) => s.openCart);
  const bump = useUiStore((s) => s.bump);
  const openLogin = useUiStore((s) => s.openLogin);
  const loggedIn = useAccountStore((s) => !!s.account);
  const isStaff = useAccountStore((s) => !!s.account?.isStaff);

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
      'inline-flex min-h-[2.75rem] items-center gap-2 rounded-full px-3 font-bold transition-colors hover:bg-white sm:px-4',
      isActive && 'bg-white',
    );

  return (
    <header ref={ref} className="vt-header sticky top-0 z-40 [@media(max-height:500px)]:static">
      {announcement && (
        <p className="bg-ink px-4 py-1.5 text-center text-[0.9rem] font-bold text-cream">{announcement}</p>
      )}
      <div className="border-b border-edge bg-cream">
        <div className="shell flex h-16 items-center justify-between gap-2 sm:h-[4.5rem] sm:gap-3">
          <Link viewTransition to="/" className="flex min-h-[2.75rem] min-w-[2.75rem] items-center gap-2 sm:gap-2.5" aria-label={`${name}, về trang chủ`}>
            <BrandMark className="h-9 w-9 shrink-0 sm:h-11 sm:w-11" />
            {/* Tên dài thì xuống 2 dòng thay vì bị cắt "Tiệm Ă…" trên điện thoại */}
            <span className="hidden min-w-0 text-base font-bold leading-tight min-[360px]:line-clamp-2 sm:line-clamp-1 sm:text-xl" aria-hidden>
              {name}
            </span>
          </Link>

          <nav className="flex shrink-0 items-center gap-1 sm:gap-2" aria-label="Điều hướng chính">
            {isStaff && (
              <Link viewTransition to="/admin" className={cn(navCls({ isActive: false }), 'bg-tangerine-soft')}>
                <LayoutDashboard className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                <span className="hidden sm:inline">Quản lý</span>
                <span className="sr-only sm:hidden">Quản lý</span>
              </Link>
            )}
            {/* "Đơn của tôi" chỉ hiện khi đã đăng nhập (bản demo không có tài khoản → luôn hiện đơn trên máy) */}
            {(loggedIn || DEMO) && (
              <NavLink viewTransition to="/orders" className={navCls}>
                <ReceiptText className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                <span className="hidden sm:inline">Đơn của tôi</span>
                <span className="sr-only sm:hidden">Đơn của tôi</span>
              </NavLink>
            )}
            {loggedIn ? (
              <Suspense fallback={<span className="inline-block h-11 w-11" aria-hidden />}>
                <AccountMenu />
              </Suspense>
            ) : (
              !DEMO && (
                <button type="button" onClick={() => openLogin()} className={navCls({ isActive: false })}>
                  <LogIn className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                  <span className="hidden min-[400px]:inline">Đăng nhập</span>
                  <span className="sr-only min-[400px]:hidden">Đăng nhập</span>
                </button>
              )
            )}
            <button
              type="button"
              onClick={openCart}
              className="relative inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border border-edge bg-white px-3.5 font-bold shadow-sticker transition-transform hover:-translate-y-0.5 sm:px-4"
              aria-label={`Giỏ hàng, ${count} món`}
            >
              <ShoppingBasket key={bump} className={cn('h-5 w-5', bump > 0 && 'animate-bump')} strokeWidth={2.25} aria-hidden />
              <span className="hidden sm:inline">Giỏ hàng</span>
              {count > 0 && (
                <span className="grid h-6 min-w-[1.5rem] place-items-center rounded-full bg-tangerine px-1 text-[0.8rem] leading-none tabular">
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
