import { useState } from 'react';
import type { Product } from '@/types/domain';
import { CATEGORIES } from '@/config/catalog';
import { FoodArt } from '@/components/art/FoodArt';
import { cn } from '@/lib/cn';

/**
 * Ảnh món: ảnh chụp nếu có (lazy, giữ tỉ lệ vuông → không giật layout),
 * không có / lỗi ảnh → hình minh hoạ theo danh mục trên nền pastel.
 */
export function ProductImage({
  product,
  className,
  eager,
}: {
  product: Pick<Product, 'name' | 'imageUrl' | 'category' | 'available'>;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const cat = CATEGORIES[product.category];
  const showPhoto = product.imageUrl && !failed;
  return (
    <div className={cn('relative aspect-square overflow-hidden', cat.bg, className)}>
      {showPhoto ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className={cn('h-full w-full object-cover', !product.available && 'grayscale')}
        />
      ) : (
        <div className={cn('h-full w-full p-[12%]', !product.available && 'opacity-50 grayscale')}>
          <FoodArt category={product.category} seed={product.name} />
        </div>
      )}
    </div>
  );
}
