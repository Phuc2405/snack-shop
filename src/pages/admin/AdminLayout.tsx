import { Suspense, useEffect } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, ClipboardList, LogOut, Settings, Store, UtensilsCrossed } from 'lucide-react';
import { useStaffStore } from '@/stores/staff.store';
import { useShopStore } from '@/stores/shop.store';
import { PageLoader } from '@/components/ui/Feedback';
import { BrandMark } from '@/components/shop/BrandMark';
import { cn } from '@/lib/cn';

const NAV = [
  { to: '/admin', label: 'Đơn hàng', icon: ClipboardList, end: true },
  { to: '/admin/products', label: 'Món ăn', icon: UtensilsCrossed },
  { to: '/admin/report', label: 'Báo cáo', icon: BarChart3 },
  { to: '/admin/settings', label: 'Cài đặt tiệm', icon: Settings },
];

/**
 * Khung trang quản lý + cổng quyền (chỉ lớp UX — quyền thật do firestore.rules kiểm tra).
 * Chưa đăng nhập → /admin/login (nhớ trang muốn vào).
 */
export function AdminLayout() {
  const init = useStaffStore((s) => s.init);
  const status = useStaffStore((s) => s.status);
  const staff = useStaffStore((s) => s.staff);
  const signOut = useStaffStore((s) => s.signOut);
  const shopName = useShopStore((s) => s.settings.name);
  const location = useLocation();

  useEffect(() => init(), [init]);

  if (status !== 'ready') return <PageLoader label="Đang kiểm tra đăng nhập…" />;
  if (!staff) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex min-h-[2.75rem] shrink-0 items-center gap-2.5 rounded-xl border px-3.5 font-bold transition-colors',
      isActive ? 'border-edge bg-white shadow-sticker' : 'border-transparent hover:bg-white/60',
    );

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="border-b border-edge bg-tangerine-soft lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r lg:border-edge">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:block lg:px-5 lg:py-6">
          <Link to="/admin" className="flex min-w-0 items-center gap-2.5">
            <BrandMark className="h-10 w-10 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate font-bold leading-tight">{shopName}</span>
              <span className="block text-[0.85rem] text-ink-soft">Quản lý tiệm</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-edge bg-white lg:hidden"
            aria-label="Đăng xuất"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
        <nav className="scrollbar-none flex gap-1.5 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-4" aria-label="Quản lý">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkCls}>
              <Icon className="h-5 w-5" aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t border-edge/20 px-5 py-4 lg:block">
          <p className="truncate font-bold">{staff.name || staff.email}</p>
          <p className="truncate text-[0.85rem] text-ink-soft">{staff.email}</p>
          <div className="mt-3 flex gap-2">
            <Link to="/" className="inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-xl px-2 text-ink-soft hover:bg-white hover:text-ink">
              <Store className="h-4 w-4" aria-hidden /> Xem tiệm
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="ml-auto inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-xl px-2 text-ink-soft hover:bg-danger-soft hover:text-danger"
            >
              <LogOut className="h-4 w-4" aria-hidden /> Thoát
            </button>
          </div>
        </div>
      </aside>
      <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

export function AdminHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl">{title}</h1>
        {description && <p className="mt-1 text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
