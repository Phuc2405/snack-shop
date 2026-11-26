import { Link } from 'react-router-dom';
import { BrandMark } from '@/components/shop/BrandMark';

/** Bản demo không có backend → khu quản lý chỉ giải thích, không giả vờ đăng nhập được. */
export function DemoAdminNotice() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="sticker w-full max-w-lg p-7 text-center">
        <BrandMark className="mx-auto h-12 w-12" />
        <h1 className="mt-4 text-2xl">Trang quản lý không có trong bản xem thử</h1>
        <p className="mt-3 text-ink-soft">
          Bản này chỉ để xem giao diện bán hàng với dữ liệu mẫu. Trang quản lý (nhận đơn realtime, sửa món, báo cáo) chạy khi tiệm nối
          với Firebase thật.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex min-h-[3rem] items-center rounded-xl bg-tangerine px-6 font-bold text-ink shadow-sticker"
        >
          ← Về trang bán hàng
        </Link>
      </div>
    </main>
  );
}
