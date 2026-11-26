import { Clock } from 'lucide-react';
import { FoodArt, Sparkle } from '@/components/art/FoodArt';
import { useShopStore } from '@/stores/shop.store';
import { cn } from '@/lib/cn';

/** Banner đầu trang: gọn trên điện thoại (menu phải thấy được sớm), rộng rãi trên máy tính. */
export function Hero() {
  const s = useShopStore((st) => st.settings);
  const status = useShopStore((st) => st.status);
  const known = status === 'ready';

  return (
    <section className="shell pt-6 sm:pt-10" aria-labelledby="hero-title">
      <div className="sticker relative overflow-hidden bg-tangerine-soft px-5 py-6 sm:px-10 sm:py-12">
        <Sparkle className="absolute right-[38%] top-5 hidden h-7 w-7 animate-wiggle md:block" />
        <Sparkle className="absolute bottom-6 left-[46%] hidden h-5 w-5 md:block" fill="#FF5C8A" />

        <div className="relative grid items-center gap-6 md:grid-cols-[1.2fr_1fr]">
          <div>
            {known && (
              <p
                className={cn(
                  'mb-4 inline-flex items-center gap-2 rounded-full border-2 border-ink px-3 py-1 text-[0.9rem] font-bold',
                  s.isOpen ? 'bg-mint' : 'bg-white',
                )}
              >
                <span className={cn('h-2.5 w-2.5 rounded-full border border-ink', s.isOpen ? 'bg-white' : 'bg-danger')} aria-hidden />
                {s.isOpen ? 'Đang nhận đơn' : 'Tạm nghỉ nhận đơn'}
              </p>
            )}
            <h1 id="hero-title" className="text-[2rem] leading-[1.1] sm:text-5xl lg:text-6xl">
              Ăn vặt vui,
              <br />
              {/* Highlight bằng nền gradient + box-decoration-break: chữ xuống dòng thì vạch vàng đi theo từng dòng */}
              <span className="bg-[linear-gradient(transparent_60%,#FFD43B_60%,#FFD43B_90%,transparent_90%)] px-1 [-webkit-box-decoration-break:clone] [box-decoration-break:clone]">
                uống mát lạnh!
              </span>
            </h1>
            <p className="mt-3 max-w-md text-ink-soft sm:mt-4 sm:text-xl">{s.tagline}</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
              <a
                href="#menu"
                className="inline-flex min-h-[3.5rem] items-center rounded-xl border-2 border-ink bg-tangerine px-7 text-lg font-bold shadow-sticker transition-transform hover:-translate-y-0.5 hover:shadow-sticker-lg"
              >
                Xem menu ↓
              </a>
              {s.openHours && (
                <span className="inline-flex items-center gap-2 text-ink-soft">
                  <Clock className="h-5 w-5" aria-hidden /> {s.openHours}
                </span>
              )}
            </div>
          </div>

          {/* Cụm sticker minh hoạ — ẩn trên màn rất nhỏ để menu lên sớm */}
          <div className="relative mx-auto hidden h-56 w-full max-w-sm sm:block md:h-72" aria-hidden>
            <div className="absolute left-[6%] top-[8%] h-36 w-36 -rotate-6 rounded-3xl border-2 border-ink bg-sky-soft p-3 shadow-sticker md:h-44 md:w-44">
              <FoodArt category="drink" />
            </div>
            <div className="absolute right-[4%] top-0 h-28 w-28 rotate-6 rounded-3xl border-2 border-ink bg-berry-soft p-2 shadow-sticker md:h-36 md:w-36">
              <FoodArt category="cake" />
            </div>
            <div className="absolute bottom-0 right-[18%] h-28 w-28 -rotate-3 rounded-3xl border-2 border-ink bg-lemon-soft p-2 shadow-sticker md:h-36 md:w-36">
              <FoodArt category="snack" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
