import { lazy, Suspense, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/Toaster';
import { ConfirmHost } from '@/components/ui/ConfirmHost';
import { PageLoader } from '@/components/ui/Feedback';
import { Header } from '@/components/shop/Header';
import { Footer } from '@/components/shop/Footer';
import { CartDrawer } from '@/components/shop/CartDrawer';
import { MobileCartBar } from '@/components/shop/MobileCartBar';
import { useUiStore } from '@/stores/ui.store';
import { useShopStore } from '@/stores/shop.store';
import { isFirebaseConfigured } from '@/lib/firebase';
import { DEMO } from '@/lib/demo';

/** Gốc mọi route: dịch vụ toàn cục gắn MỘT lần (toast, hộp xác nhận, tải menu + cấu hình). */
export function RootLayout() {
  const { pathname, hash } = useLocation();
  const load = useShopStore((s) => s.load);

  useEffect(() => {
    void load();
    // Quay lại tab sau một lúc → tải lại menu (món vừa tạm hết / đổi giá hiện đúng trước khi khách bấm thêm)
    const onVisible = () => document.visibilityState === 'visible' && void useShopStore.getState().refreshIfStale(60_000);
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  // Đổi trang → lên đầu (trừ khi bấm link có #neo)
  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0 });
  }, [pathname, hash]);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-xl focus:border-2 focus:border-ink focus:bg-white focus:px-4 focus:py-2 focus:font-bold"
      >
        Bỏ qua, tới nội dung chính
      </a>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
      <ConfirmHost />
      <Toaster />
    </>
  );
}

/** Khung trang bán hàng công khai. */
export function ShopLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      {DEMO ? (
        <p className="bg-tangerine-soft px-4 py-1.5 text-center text-[0.9rem] text-ink">
          <strong>Bản xem thử (option 2):</strong> dữ liệu mẫu, đơn chỉ lưu trên máy bạn, không giao hàng thật. Freeship cho đơn từ 100k.
        </p>
      ) : !isFirebaseConfigured && (
        <p className="bg-danger px-4 py-1.5 text-center text-[0.9rem] font-bold text-white">
          Chưa kết nối Firebase: tạo file .env từ .env.example, hoặc chạy chế độ emulator (xem README).
        </p>
      )}
      <Header />
      <main id="main" className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <CartDrawer />
      <LazyProductSheet />
      <MobileCartBar />
      <AccountDialogs />
    </div>
  );
}

// Hộp đăng nhập / sổ thông tin kéo theo react-hook-form + zod (~45 KB) → chỉ tải khi khách mở, không nằm trong bundle đầu
// Hộp chi tiết món (chọn size / sửa món đã chọn) kéo theo form, OptionPicker… → tải khi khách bấm món lần đầu
const loadProductSheet = () => import('@/components/shop/ProductSheet');
const ProductSheet = lazy(() => loadProductSheet().then((m) => ({ default: m.ProductSheet })));

function LazyProductSheet() {
  const used = useOnceTrue(useUiStore((s) => s.viewing !== null));
  // Tải sẵn lúc trình duyệt rảnh → lần đầu bấm món không phải chờ tải code
  useEffect(() => {
    const go = () => void loadProductSheet();
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(go, { timeout: 4000 });
      return () => cancelIdleCallback(id);
    }
    const t = setTimeout(go, 2500);
    return () => clearTimeout(t);
  }, []);
  return <Suspense fallback={null}>{used && <ProductSheet />}</Suspense>;
}

const LoginDialog = lazy(() => import('@/components/shop/LoginDialog').then((m) => ({ default: m.LoginDialog })));
const ProfilesDialog = lazy(() => import('@/components/shop/ProfilesDialog').then((m) => ({ default: m.ProfilesDialog })));

function AccountDialogs() {
  const loginOpen = useUiStore((s) => s.loginOpen);
  const profilesOpen = useUiStore((s) => s.profilesOpen);
  // Chỉ tải code khi mở lần đầu; sau đó giữ gắn để hộp chạy được hiệu ứng đóng (không biến mất cái rụp)
  const loginUsed = useOnceTrue(loginOpen);
  const profilesUsed = useOnceTrue(profilesOpen);
  return (
    <Suspense fallback={null}>
      {loginUsed && <LoginDialog />}
      {profilesUsed && <ProfilesDialog />}
    </Suspense>
  );
}

function useOnceTrue(v: boolean) {
  const ref = useRef(false);
  if (v) ref.current = true;
  return ref.current;
}
