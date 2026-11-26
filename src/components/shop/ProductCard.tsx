import { memo } from 'react';
import { Plus } from 'lucide-react';
import type { Product } from '@/types/domain';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/Feedback';
import { useAddToCart } from '@/hooks/useAddToCart';
import { useUiStore } from '@/stores/ui.store';
import { ProductImage } from './ProductImage';

/**
 * Thẻ món. Cả thẻ bấm được để xem chi tiết (nút "phủ" thẻ — stretched button),
 * còn nút "+" nằm trên cùng để thêm nhanh; hai vùng bấm không lồng nhau (a11y hợp lệ).
 */
export const ProductCard = memo(function ProductCard({ product, eager }: { product: Product; eager?: boolean }) {
  const view = useUiStore((s) => s.view);
  const add = useAddToCart();
  const soldOut = !product.available;

  return (
    <article className={cn('sticker sticker-hover group relative flex flex-col overflow-hidden', soldOut && 'opacity-80')}>
      <div className="relative border-b-2 border-ink">
        <ProductImage product={product} eager={eager} />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          {soldOut ? <Badge className="bg-white">Tạm hết</Badge> : product.featured && <Badge className="bg-berry">Hot</Badge>}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <h3 className="text-[1.02rem] leading-snug sm:text-lg">
          <button type="button" onClick={() => view(product)} className="text-left after:absolute after:inset-0 after:content-['']">
            {product.name}
          </button>
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <span className="price text-lg sm:text-xl">{formatPrice(product.price)}</span>
          <button
            type="button"
            // Món có tuỳ chọn (size, đường…) → mở sheet để khách chọn, không thêm mù
            onClick={() => (product.options.length ? view(product) : add(product))}
            disabled={soldOut}
            className="relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-ink bg-tangerine shadow-sticker transition-transform hover:scale-105 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:bg-white disabled:opacity-50 disabled:shadow-none"
            aria-label={
              soldOut ? `${product.name} tạm hết` : product.options.length ? `Chọn size, topping cho ${product.name}` : `Thêm ${product.name} vào giỏ`
            }
          >
            <Plus className="h-5 w-5" strokeWidth={3} />
          </button>
        </div>
      </div>
    </article>
  );
});
