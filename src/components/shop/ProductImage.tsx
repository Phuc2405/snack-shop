import { useState } from 'react';
import type { Product } from '@/types/domain';
import { CATEGORIES } from '@/config/catalog';
import { FoodArt } from '@/components/art/FoodArt';
import { cn } from '@/lib/cn';
import { responsiveSrc } from '@/lib/image';

export { responsiveSrc } from '@/lib/image';

/**
 * Ảnh món: ảnh chụp nếu có (lazy, giữ tỉ lệ vuông → không giật layout, nền màu chờ khi đang tải),
 * không có / lỗi ảnh → hình minh hoạ theo danh mục trên nền pastel.
 */
export function ProductImage({
  product,
  className,
  eager,
  sizes = '(min-width: 1024px) 260px, (min-width: 768px) 30vw, 46vw',
}: {
  product: Pick<Product, 'name' | 'imageUrl' | 'category' | 'available'>;
  className?: string;
  eager?: boolean;
  /** Ảnh hiển thị rộng bao nhiêu (để trình duyệt chọn đúng kích thước trong srcset) */
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const cat = CATEGORIES[product.category];
  const showPhoto = product.imageUrl && !failed;
  const img = showPhoto ? responsiveSrc(product.imageUrl) : null;
  return (
    <div className={cn('relative aspect-square overflow-hidden', showPhoto ? 'bg-cream-deep' : cat.bg, className)}>
      {img ? (
        <img
          src={img.src}
          srcSet={img.srcSet}
          sizes={img.srcSet ? sizes : undefined}
          alt={product.name}
          // eager: không trì hoãn ảnh đầu danh sách; nhưng KHÔNG fetchPriority="high" — chỉ ảnh banner (LCP) được ưu tiên,
          // 4 ảnh món mà cùng "high" sẽ giành băng thông làm banner hiện chậm trên 4G
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            'h-full w-full object-cover transition-[opacity,transform] duration-500 group-hover:scale-[1.04]',
            loaded ? 'opacity-100' : 'opacity-0',
            !product.available && 'grayscale',
          )}
        />
      ) : (
        <div className={cn('h-full w-full p-[12%]', !product.available && 'opacity-50 grayscale')}>
          <FoodArt category={product.category} seed={product.name} />
        </div>
      )}
    </div>
  );
}
