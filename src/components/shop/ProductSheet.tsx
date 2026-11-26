import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { QtyStepper } from '@/components/ui/QtyStepper';
import { CATEGORIES } from '@/config/catalog';
import { formatPrice } from '@/lib/format';
import { useAddToCart } from '@/hooks/useAddToCart';
import { useUiStore } from '@/stores/ui.store';
import { ProductImage } from './ProductImage';

/** Chi tiết món: bottom sheet trên điện thoại, hộp giữa màn hình trên máy tính. */
export function ProductSheet() {
  const product = useUiStore((s) => s.viewing);
  const view = useUiStore((s) => s.view);
  const add = useAddToCart();
  const [qty, setQty] = useState(1);

  useEffect(() => setQty(1), [product?.id]);

  const close = () => view(null);

  return (
    <Dialog
      open={!!product}
      onClose={close}
      placement="sheet"
      title={product ? CATEGORIES[product.category].label : ''}
      tone="lemon"
      footer={
        product && (
          <div className="flex items-center justify-between gap-3">
            <QtyStepper value={qty} onChange={setQty} name={product.name} min={1} />
            <Button
              size="lg"
              className="flex-1 whitespace-nowrap px-4"
              disabled={!product.available}
              onClick={() => {
                if (add(product, qty) !== 'unavailable') close();
              }}
            >
              {product.available ? `Thêm · ${formatPrice(product.price * qty)}` : 'Tạm hết'}
            </Button>
          </div>
        )
      }
    >
      {product && (
        <div className="grid gap-4 sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-start">
          <ProductImage product={product} eager className="mx-auto w-full max-w-[16rem] rounded-2xl border-2 border-ink" />
          <div>
            <h3 className="text-2xl">{product.name}</h3>
            <p className="price mt-1 text-2xl">{formatPrice(product.price)}</p>
            {product.description && <p className="mt-3 text-ink-soft">{product.description}</p>}
            {!product.available && <p className="mt-3 font-bold text-danger">Món này đang tạm hết, bạn quay lại sau nhé!</p>}
          </div>
        </div>
      )}
    </Dialog>
  );
}
