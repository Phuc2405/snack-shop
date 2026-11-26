import { useDeferredValue, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Category, Product } from '@/types/domain';
import { CATEGORIES, CATEGORY_ORDER } from '@/config/catalog';
import { useShopStore } from '@/stores/shop.store';
import { Hero } from '@/components/shop/Hero';
import { ProductCard } from '@/components/shop/ProductCard';
import { EmptyState, ProductGridSkeleton } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { FoodArt } from '@/components/art/FoodArt';

type Filter = Category | 'all';

/** Bỏ dấu tiếng Việt để tìm "tra sua" vẫn ra "Trà sữa". */
const fold = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

const GRID = 'grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4';

export default function HomePage() {
  const products = useShopStore((s) => s.products);
  const status = useShopStore((s) => s.status);
  const error = useShopStore((s) => s.error);
  const load = useShopStore((s) => s.load);
  const isOpen = useShopStore((s) => s.settings.isOpen);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const query = useDeferredValue(q); // gõ phím không bị khựng khi menu dài

  const visible = useMemo(() => {
    const k = fold(query.trim());
    return products.filter(
      (p) => (filter === 'all' || p.category === filter) && (!k || fold(p.name).includes(k) || fold(p.description).includes(k)),
    );
  }, [products, filter, query]);

  const groups = useMemo(() => {
    const m = new Map<Category, Product[]>();
    for (const c of CATEGORY_ORDER) m.set(c, []);
    for (const p of visible) m.get(p.category)!.push(p);
    return [...m.entries()].filter(([, list]) => list.length > 0);
  }, [visible]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: products.length, drink: 0, cake: 0, snack: 0, combo: 0 };
    for (const p of products) c[p.category]++;
    return c;
  }, [products]);

  let rendered = 0; // ảnh của 4 thẻ đầu tải ngay (ảnh lớn đầu màn hình — LCP), còn lại lazy

  return (
    <>
      <Hero />

      {status === 'ready' && !isOpen && (
        <div className="shell mt-5">
          <p className="sticker bg-white px-4 py-3 text-center font-bold" role="status">
            Tiệm đang tạm nghỉ nhận đơn online. Bạn vẫn xem menu được, quay lại sau nhé!
          </p>
        </div>
      )}

      <section id="menu" className="shell mt-10" aria-labelledby="menu-title">
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

        {/* Chip danh mục: dính dưới header khi cuộn, vuốt ngang trên điện thoại */}
        <div className="sticky top-[var(--header-h,4rem)] z-20 -mx-4 mt-4 bg-cream/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="scrollbar-none -my-1 flex gap-2 overflow-x-auto py-1" role="group" aria-label="Lọc theo danh mục">
            {(['all', ...CATEGORY_ORDER] as Filter[]).map((f) => (
              <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {f === 'all' ? 'Tất cả' : CATEGORIES[f].plural}
                <span className="text-[0.85rem] font-normal text-ink-soft tabular">{counts[f]}</span>
              </button>
            ))}
          </div>
        </div>

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
              icon={<div className="h-24 w-24"><FoodArt category="snack" /></div>}
              title={q ? `Không tìm thấy “${q}”` : 'Menu đang được cập nhật'}
              description={q ? 'Thử gõ tên khác, hoặc bỏ dấu xem sao.' : 'Bạn quay lại sau ít phút nhé!'}
              action={
                (q || filter !== 'all') && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQ('');
                      setFilter('all');
                    }}
                  >
                    Xem tất cả món
                  </Button>
                )
              }
            />
          ) : (
            <div className="space-y-10">
              {groups.map(([cat, list]) => (
                <section key={cat} aria-labelledby={`cat-${cat}`}>
                  {(filter === 'all' || groups.length > 1) && (
                    <h3 id={`cat-${cat}`} className="mb-4 flex items-center gap-3 text-2xl">
                      <span className={`inline-block h-4 w-4 rotate-45 rounded-sm border-2 border-ink ${CATEGORIES[cat].accent}`} aria-hidden />
                      {CATEGORIES[cat].plural}
                    </h3>
                  )}
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
