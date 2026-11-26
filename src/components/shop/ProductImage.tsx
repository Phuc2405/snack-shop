import { useState } from 'react';
import type { Product } from '@/types/domain';
import { CATEGORIES } from '@/config/catalog';
import { FoodArt } from '@/components/art/FoodArt';
import { cn } from '@/lib/cn';

/**
 * Ảnh trên CDN Unsplash (imgix) → tạo srcset nhiều kích thước + định dạng tự động (AVIF/WebP):
 * điện thoại tải ảnh ~400px, máy tính ~800px, thay vì ảnh gốc vài MB. Ảnh khác giữ nguyên.
 */
export function responsiveSrc(url: string, widths = [320, 480, 640, 960], ratio = 'square' as 'square' | 'wide') {
  if (!url.startsWith('https://images.unsplash.com/')) return { src: url };
  const [base, query = ''] = url.split('?');
  // Giữ gợi ý cắt riêng của từng ảnh (vd ?crop=bottom); mặc định cắt giữa — món ăn thường nằm giữa khung
  const crop = new URLSearchParams(query).get('crop');
  const h = (w: number) => (ratio === 'square' ? w : Math.round((w * 9) / 16));
  const at = (w: number) => `${base}?w=${w}&h=${h(w)}&fit=crop${crop ? `&crop=${encodeURIComponent(crop)}` : ''}&auto=format&q=68`;
  return { src: at(widths[1] ?? 480), srcSet: widths.map((w) => `${at(w)} ${w}w`).join(', ') };
}

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
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : undefined}
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
