import { memo, type CSSProperties } from 'react';
import { Plus } from 'lucide-react';
import type { Product } from '@/types/domain';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/Feedback';
import { useAddToCart } from '@/hooks/useAddToCart';
import { useUiStore } from '@/stores/ui.store';
import { useCartStore } from '@/stores/cart.store';
import { qtyOfProduct } from '@/domain/cart';
import { ProductImage } from './ProductImage';

/**
 * Thẻ món. Cả thẻ bấm được để xem chi tiết (nút "phủ" thẻ — stretched button),
 * còn nút tròn nằm trên cùng; hai vùng bấm không lồng nhau (a11y hợp lệ).
 *
 * Kiểu GrabFood:
 *  - Chưa có trong giỏ → nút "+" (món không tuỳ chọn: thêm luôn; có tuỳ chọn: mở hộp chọn).
 *  - Đã có → chỉ là VÒNG TRÒN CÓ SỐ (tổng mọi size / tuỳ chọn, vd 2 Size M + 3 Size L = 5), không có − / +.
 *    Bấm vào → hộp chi tiết: "Món đã chọn" (bấm từng dòng để sửa) + "Chọn thêm".
 *  - Tạm hết → không có nút, chỉ xem.
 */
export const ProductCard = memo(function ProductCard({ product, eager }: { product: Product; eager?: boolean }) {
  const view = useUiStore((s) => s.view);
  const add = useAddToCart();
  const soldOut = !product.available;
  // Chọn số (không chọn mảng) → thẻ chỉ vẽ lại khi số của CHÍNH món này đổi
  const inCart = useCartStore((s) => qtyOfProduct(s.lines, product.id));

  return (
    <article
      className={cn('sticker sticker-hover group relative flex flex-col overflow-hidden', soldOut && 'opacity-80')}
      // Tên riêng cho View Transition: lọc / tìm món thì thẻ tự trượt về chỗ mới (index.css)
      style={{ viewTransitionName: `card-${product.id.replace(/[^\w-]/g, '')}` } as CSSProperties}
    >
      <div className="relative">
        <ProductImage product={product} eager={eager} />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          {soldOut ? (
            <Badge className="border-transparent bg-white/90">Tạm hết</Badge>
          ) : (
            product.featured && <Badge className="border-transparent bg-white/90 text-tangerine-deep">Bán chạy</Badge>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <h3 className="text-[1.02rem] leading-snug sm:text-lg">
          <button type="button" onClick={() => view(product)} className="text-left after:absolute after:inset-0 after:content-['']">
            {product.name}
          </button>
        </h3>
        {product.description && <p className="hidden text-[0.9rem] leading-snug text-ink-soft line-clamp-2 sm:block">{product.description}</p>}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-1.5 pt-2">
          <span className="price text-lg sm:text-xl">{formatPrice(product.price)}</span>
          {soldOut ? null : inCart > 0 ? (
            <button
              key={inCart}
              type="button"
              onClick={() => view(product)}
              className="relative z-10 ml-auto grid h-11 min-w-[2.75rem] shrink-0 animate-bump place-items-center rounded-full bg-tangerine px-2 text-lg font-bold shadow-sticker tabular transition-transform hover:scale-105 active:scale-95"
              aria-label={`${product.name}: ${inCart} phần trong giỏ. Bấm để xem, sửa hoặc chọn thêm`}
            >
              {inCart}
            </button>
          ) : (
            <button
              type="button"
              // Món có tuỳ chọn (size, đường…) → mở sheet để khách chọn, không thêm mù
              onClick={() => (product.options.length ? view(product) : add(product))}
              className="relative z-10 ml-auto grid h-11 w-11 shrink-0 place-items-center rounded-full bg-tangerine shadow-sticker transition-transform hover:scale-105 active:scale-95 active:shadow-none"
              aria-label={product.options.length ? `Chọn size, topping cho ${product.name}` : `Thêm ${product.name} vào giỏ`}
            >
              <Plus className="h-5 w-5" strokeWidth={3} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
});
