import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Category, Product } from '@/types/domain';
import { CATEGORIES, CATEGORY_ORDER } from '@/config/catalog';
import { useShopStore } from '@/stores/shop.store';
import { Hero } from '@/components/shop/Hero';
import { ProductCard } from '@/components/shop/ProductCard';
import { EmptyState, ProductGridSkeleton } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { FoodArt } from '@/components/art/FoodArt';
import { withViewTransition } from '@/lib/viewTransition';
import { useShopPhase } from '@/hooks/useShopPhase';
import { afterHoursShort } from '@/domain/hours';
import { CategoryNav, sectionId } from '@/components/shop/CategoryNav';

/** Bỏ dấu tiếng Việt để tìm "tra sua" vẫn ra "Trà sữa". */
const fold = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

const GRID = 'grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4';

export default function HomePage() {
  const products = useShopStore((s) => s.products);
  const status = useShopStore((s) => s.status);
  const error = useShopStore((s) => s.error);
  const load = useShopStore((s) => s.load);
  const phase = useShopPhase();
  const [q, setQ] = useState('');
  /** Từ khoá đã "chốt" (sau khi ngừng gõ 180ms) → lọc + chạy hiệu ứng 1 lần, không giật theo từng phím */
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (q === query) return;
    const t = window.setTimeout(() => withViewTransition(() => setQuery(q), 'menu'), q ? 180 : 0);
    return () => window.clearTimeout(t);
  }, [q, query]);

  // Menu luôn là MỘT danh sách dài theo loại (kiểu GrabFood); chỉ ô tìm món mới lọc bớt
  const visible = useMemo(() => {
    const k = fold(query.trim());
    return k ? products.filter((p) => fold(p.name).includes(k) || fold(p.description).includes(k)) : products;
  }, [products, query]);

  const groups = useMemo(() => {
    const m = new Map<Category, Product[]>();
    for (const c of CATEGORY_ORDER) m.set(c, []);
    for (const p of visible) m.get(p.category)!.push(p);
    return [...m.entries()].filter(([, list]) => list.length > 0);
  }, [visible]);

  // Ổn định tham chiếu (useMemo) → thanh danh mục không gắn lại sự kiện cuộn mỗi lần vẽ
  const navCats = useMemo(() => groups.map(([c]) => c), [groups]);
  const counts = useMemo(() => {
    const c = { drink: 0, cake: 0, snack: 0, combo: 0 } as Record<Category, number>;
    for (const [cat, list] of groups) c[cat] = list.length;
    return c;
  }, [groups]);

  let rendered = 0; // ảnh của 4 thẻ đầu tải ngay (ảnh lớn đầu màn hình — LCP), còn lại lazy

  return (
    <>
      <Hero />

      {status === 'ready' && phase.kind !== 'open' && (
        <div className="shell mt-5">
          <p className="sticker bg-white px-4 py-3 text-center font-bold" role="status">
            {phase.kind === 'paused'
              ? 'Tiệm đang tạm nghỉ nhận đơn online. Bạn vẫn xem menu được, quay lại sau nhé!'
              : afterHoursShort(phase)}
          </p>
        </div>
      )}

      {/* html đã có scroll-padding-top = chiều cao header (index.css); tabIndex để nhận focus từ nút "Xem menu" */}
      <section id="menu" tabIndex={-1} className="shell mt-10 outline-none" aria-labelledby="menu-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="menu-title" className="text-3xl sm:text-4xl">
            Menu hôm nay
          </h2>
          <label className="relative w-full sm:w-72">
            <span className="sr-only">Tìm món</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" aria-hidden />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm món: trà sữa, flan…"
              className="field pl-11 pr-11"
              enterKeyHint="search"
              maxLength={50}
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full hover:bg-ink/5"
                aria-label="Xoá tìm kiếm"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
        </div>

        {status === 'ready' && <CategoryNav categories={navCats} counts={counts} />}

        <div className="mt-4">
          {status === 'idle' || status === 'loading' ? (
            <ProductGridSkeleton count={8} />
          ) : status === 'error' && products.length === 0 ? (
            <EmptyState
              tone="error"
              title="Chưa tải được menu"
              description={error?.message}
              action={<Button onClick={() => void load()}>Thử lại</Button>}
            />
          ) : groups.length === 0 ? (
            <EmptyState
              // Hình đồ ăn nghiêng trái ↔ phải cho đỡ "trống trải" (tự tắt khi máy bật giảm chuyển động)
              icon={<div className="h-24 w-24 origin-bottom animate-tilt"><FoodArt category="snack" /></div>}
              title={q ? `Không tìm thấy “${q}”` : 'Menu đang được cập nhật'}
              description={q ? 'Thử gõ tên khác, hoặc bỏ dấu xem sao.' : 'Bạn quay lại sau ít phút nhé!'}
              action={
                q && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQ('');
                      setQuery('');
                    }}
                  >
                    Xem tất cả món
                  </Button>
                )
              }
            />
          ) : (
            <div className="space-y-10 sm:space-y-14">
              {groups.map(([cat, list]) => (
                // scroll-margin = chiều cao thanh danh mục (header đã được html scroll-padding-top lo) → tiêu đề không bị che
                <section key={cat} id={sectionId(cat)} aria-labelledby={`${sectionId(cat)}-title`} className="scroll-mt-[var(--catbar-h,3.5rem)]">
                  <h3 id={`${sectionId(cat)}-title`} className="mb-4 flex items-baseline gap-3 text-[1.75rem] leading-tight sm:text-4xl">
                    <span className="inline-block h-7 w-1.5 shrink-0 self-center rounded-full bg-tangerine sm:h-8" aria-hidden />
                    {CATEGORIES[cat].plural}
                    <span className="text-base font-normal text-ink-soft tabular sm:text-lg">{list.length} món</span>
                  </h3>
                  <div className={GRID}>
                    {list.map((p) => (
                      <ProductCard key={p.id} product={p} eager={rendered++ < 4} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
