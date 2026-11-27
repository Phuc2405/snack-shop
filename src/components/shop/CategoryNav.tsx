import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { Category } from '@/types/domain';
import { CATEGORIES } from '@/config/catalog';
import { cn } from '@/lib/cn';
import { prefersReducedMotion } from '@/lib/viewTransition';

export const sectionId = (c: Category) => `cat-${c}`;

/**
 * Theo dõi đang cuộn tới loại món nào (scroll-spy, kiểu GrabFood).
 * Loại "đang xem" = mục cuối cùng có tiêu đề đã chạm/qua mép dưới của header + thanh danh mục.
 * Cuối trang thì chọn mục cuối (mục ngắn vẫn sáng được). Dùng scroll + rAF (4–5 mục, rẻ), không đo theo từng pixel.
 */
function useScrollSpy(ids: Category[]) {
  const [active, setActive] = useState<Category | null>(ids[0] ?? null);
  /** Đang cuộn do bấm chip → khoá scroll-spy tới khi cuộn xong (không nhấp nháy qua các mục ở giữa) */
  const lock = useRef<number>(0);

  useEffect(() => {
    if (!ids.length) return;
    let raf = 0;
    const compute = () => {
      raf = 0;
      if (Date.now() < lock.current) return;
      const css = getComputedStyle(document.documentElement);
      // + 32px: html có scroll-padding-top = header + 1rem → bấm chip, mục dừng thấp hơn thanh dính 16px; chừa dư
      const offset = (parseFloat(css.getPropertyValue('--sticky-top')) || 0) + (parseFloat(css.getPropertyValue('--catbar-h')) || 56) + 32;
      let cur: Category = ids[0]!;
      for (const id of ids) {
        const el = document.getElementById(sectionId(id));
        if (el && el.getBoundingClientRect().top - offset <= 1) cur = id;
      }
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      setActive(atBottom ? ids[ids.length - 1]! : cur);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };
    const onScrollEnd = () => {
      lock.current = 0;
      onScroll();
    };
    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scrollend', onScrollEnd);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('scrollend', onScrollEnd);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ids]);

  const jump = (c: Category) => {
    const el = document.getElementById(sectionId(c));
    if (!el) return;
    setActive(c);
    lock.current = Date.now() + 1200; // trình duyệt không có 'scrollend' (Safari cũ) thì tự mở khoá sau 1,2s
    el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  };

  return { active, jump };
}

/**
 * Thanh loại món dính dưới header (kiểu GrabFood): bấm loại → cuộn tới khung đó, cuộn trang → loại tự sáng theo.
 *  - Màn ≥ 640px: hàng chip vuốt ngang, chip đang xem tự cuộn vào giữa.
 *  - Điện thoại (< 640px): 1 nút dropdown hiện loại đang xem; bấm → xổ danh sách để nhảy tới loại khác.
 * Chiều cao thanh ghi vào biến CSS --catbar-h để tiêu đề mục không bị thanh này che khi cuộn tới.
 */
export function CategoryNav({ categories, counts }: { categories: Category[]; counts: Record<Category, number> }) {
  const { active, jump } = useScrollSpy(categories);
  const [open, setOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const ddRef = useRef<HTMLDivElement>(null);

  // Đo chiều cao thanh (đổi khi zoom / xoay máy / đổi giữa chip ↔ dropdown)
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty('--catbar-h', `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Chip đang xem tự trượt vào giữa hàng — chỉ cuộn NGANG trong hàng chip (không đụng cuộn trang đang chạy)
  useEffect(() => {
    const box = chipsRef.current;
    const chip = box?.querySelector<HTMLElement>(`[data-cat="${active}"]`);
    if (!box || !chip || box.scrollWidth <= box.clientWidth) return;
    const left = chip.offsetLeft - (box.clientWidth - chip.offsetWidth) / 2;
    box.scrollTo({ left, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [active]);

  // Dropdown: bấm ra ngoài / Esc để đóng
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ddRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!categories.length) return null;
  const current = active ?? categories[0]!;

  return (
    <div
      ref={barRef}
      className="sticky top-[var(--sticky-top,4rem)] z-20 -mx-4 mt-4 border-b border-edge/60 bg-cream px-4 py-2.5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      {/* ≥ 640px: hàng chip */}
      <nav aria-label="Loại món" className="hidden sm:block">
        <div ref={chipsRef} className="scrollbar-none -my-1 flex gap-2 overflow-x-auto py-1">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              data-cat={c}
              className="chip shrink-0"
              aria-current={c === current ? 'true' : undefined}
              aria-pressed={c === current}
              onClick={() => jump(c)}
            >
              {CATEGORIES[c].plural}
              <span className="text-[0.85rem] font-normal text-ink-soft tabular">{counts[c]}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* < 640px: dropdown */}
      <div ref={ddRef} className="relative sm:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="true"
          aria-controls="cat-dropdown"
          className="flex min-h-[2.75rem] w-full items-center justify-between gap-3 rounded-xl border border-edge bg-white px-4 font-bold shadow-sticker"
        >
          <span className="min-w-0 truncate">
            {CATEGORIES[current].plural} <span className="font-normal text-ink-soft tabular">· {counts[current]} món</span>
          </span>
          <ChevronDown className={cn('h-5 w-5 shrink-0 transition-transform duration-200', open && 'rotate-180')} aria-hidden />
        </button>
        {open && (
          <ul
            id="cat-dropdown"
            className="absolute inset-x-0 top-[calc(100%+0.375rem)] z-30 max-h-[min(60dvh,22rem)] animate-pop-in overflow-y-auto rounded-xl border border-edge bg-white p-1.5 shadow-sticker-lg"
          >
            {categories.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    jump(c);
                  }}
                  aria-current={c === current ? 'true' : undefined}
                  className={cn(
                    'flex min-h-[2.75rem] w-full items-center justify-between gap-3 rounded-lg px-3 text-left font-bold',
                    c === current ? 'bg-lemon' : 'hover:bg-lemon-soft',
                  )}
                >
                  <span>
                    {CATEGORIES[c].plural} <span className="font-normal text-ink-soft tabular">· {counts[c]}</span>
                  </span>
                  {c === current && <Check className="h-4 w-4 shrink-0" strokeWidth={3} aria-hidden />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
