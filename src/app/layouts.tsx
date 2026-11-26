import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/Toaster';
import { ConfirmHost } from '@/components/ui/ConfirmHost';
import { PageLoader } from '@/components/ui/Feedback';
import { Header } from '@/components/shop/Header';
import { Footer } from '@/components/shop/Footer';
import { CartDrawer } from '@/components/shop/CartDrawer';
import { ProductSheet } from '@/components/shop/ProductSheet';
import { MobileCartBar } from '@/components/shop/MobileCartBar';
import { useShopStore } from '@/stores/shop.store';
import { isFirebaseConfigured } from '@/lib/firebase';
import { DEMO } from '@/lib/demo';

/** Gốc mọi route: dịch vụ toàn cục gắn MỘT lần (toast, hộp xác nhận, tải menu + cấu hình). */
export function RootLayout() {
  const { pathname, hash } = useLocation();
  const load = useShopStore((s) => s.load);

  useEffect(() => {
    void load();
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
      <ProductSheet />
      <MobileCartBar />
    </div>
  );
}
