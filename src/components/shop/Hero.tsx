import { Clock } from 'lucide-react';
import { HERO_PHOTO } from '@/config/catalog';
import { useShopStore } from '@/stores/shop.store';
import { cn } from '@/lib/cn';
import { useShopPhase } from '@/hooks/useShopPhase';
import { prefersReducedMotion } from '@/lib/viewTransition';
import { heroImage } from '@/lib/image';

/**
 * Banner đầu trang (option 2): ảnh chụp thật, ánh sáng tự nhiên, phủ lớp tối mờ bên trái để chữ trắng
 * luôn đủ tương phản. Ảnh là phần tử lớn nhất (LCP) → tải ngay, ưu tiên cao, đúng kích thước màn hình.
 */
export function Hero() {
  const s = useShopStore((st) => st.settings);
  const status = useShopStore((st) => st.status);
  const known = status === 'ready';
  const phase = useShopPhase();
  const badge =
    phase.kind === 'open'
      ? { dot: 'bg-mint', text: 'Đang mở cửa · nhận đơn' }
      : phase.kind === 'after-hours'
        ? { dot: 'bg-lemon', text: 'Đang đóng cửa · vẫn nhận đặt trước' }
        : { dot: 'bg-danger', text: 'Tạm nghỉ nhận đơn' };

  /** Cuộn mượt xuống menu (chừa chỗ cho header dính); máy tắt chuyển động thì nhảy thẳng */
  const goMenu = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = document.getElementById('menu');
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(history.state, '', '#menu');
    // Đưa focus xuống menu cho người dùng bàn phím / trình đọc màn hình
    el.focus({ preventScroll: true });
  };
  const img = heroImage(HERO_PHOTO); // cùng bộ với <link rel=preload> trong index.html

  return (
    <section className="shell pt-4 sm:pt-8" aria-labelledby="hero-title">
      <div className="relative isolate overflow-hidden rounded-3xl bg-ink shadow-sticker-lg">
        <img
          src={img.src}
          srcSet={img.srcSet}
          sizes={img.sizes}
          alt=""
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        {/* Lớp tối: đậm bên trái (chỗ có chữ), trong dần sang phải để ảnh vẫn sáng tự nhiên */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/35 to-black/10 sm:bg-gradient-to-r sm:from-black/70 sm:via-black/35 sm:to-transparent" aria-hidden />

        <div className="flex min-h-[24rem] flex-col justify-end px-5 py-7 sm:min-h-[28rem] sm:max-w-xl sm:justify-center sm:px-10 sm:py-12 lg:min-h-[32rem]">
          {known && (
            <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[0.9rem] font-bold text-ink">
              <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', badge.dot)} aria-hidden />
              {badge.text}
            </p>
          )}
          <h1 id="hero-title" className="text-[2.1rem] leading-[1.1] text-white sm:text-5xl lg:text-6xl">
            Ăn vặt vui, uống mát lạnh
          </h1>
          <p className="mt-3 max-w-md text-lg text-white/90 sm:mt-4 sm:text-xl">{s.tagline}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <a
              href="#menu"
              onClick={goMenu}
              className="inline-flex min-h-[3.5rem] items-center rounded-xl bg-tangerine px-7 text-lg font-bold text-ink shadow-sticker transition-transform hover:-translate-y-px hover:shadow-sticker-lg"
            >
              Xem menu ↓
            </a>
            {s.openHours && (
              <span className="inline-flex items-center gap-2 text-white/90">
                <Clock className="h-5 w-5" aria-hidden /> {s.openHours}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
