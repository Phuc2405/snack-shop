import { useEffect, useMemo, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { QtyStepper } from '@/components/ui/QtyStepper';
import { CATEGORIES } from '@/config/catalog';
import { defaultSelection, missingRequired, optionsTotal, toSelectedOptions, type Selection } from '@/domain/options';
import { formatPrice } from '@/lib/format';
import { useAddToCart } from '@/hooks/useAddToCart';
import { useUiStore } from '@/stores/ui.store';
import { toast } from '@/stores/toast.store';
import { ProductImage } from './ProductImage';
import { OptionPicker } from './OptionPicker';

/** Chi tiết món + chọn size/đường/đá/topping: bottom sheet trên điện thoại, hộp giữa màn hình trên máy tính. */
export function ProductSheet() {
  const product = useUiStore((s) => s.viewing);
  const view = useUiStore((s) => s.view);
  const add = useAddToCart();
  const [qty, setQty] = useState(1);
  const [sel, setSel] = useState<Selection>({});

  useEffect(() => {
    setQty(1);
    setSel(product ? defaultSelection(product) : {});
  }, [product]);

  const options = useMemo(() => (product ? toSelectedOptions(product, sel) : []), [product, sel]);
  const missing = product ? missingRequired(product, sel) : [];
  const unit = product ? product.price + optionsTotal(options) : 0;

  const close = () => view(null);
  const submit = () => {
    if (!product) return;
    if (missing.length) {
      toast.error(`Bạn chọn giúp: ${missing.join(', ')}`);
      return;
    }
    if (add(product, qty, options) !== 'unavailable') close();
  };

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
            <Button size="lg" className="flex-1 whitespace-nowrap px-4" disabled={!product.available} onClick={submit}>
              {product.available ? `Thêm · ${formatPrice(unit * qty)}` : 'Tạm hết'}
            </Button>
          </div>
        )
      }
    >
      {product && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,12rem)_1fr] sm:items-start">
            <ProductImage product={product} eager className="mx-auto w-full max-w-[12rem] rounded-2xl border-2 border-ink" />
            <div>
              <h3 className="text-2xl">{product.name}</h3>
              <p className="price mt-1 text-2xl">{formatPrice(product.price)}</p>
              {product.description && <p className="mt-3 text-ink-soft">{product.description}</p>}
              {!product.available && <p className="mt-3 font-bold text-danger">Món này đang tạm hết, bạn quay lại sau nhé!</p>}
            </div>
          </div>
          {product.options.length > 0 && product.available && (
            <OptionPicker groups={product.options} value={sel} onChange={setSel} missing={missing} />
          )}
        </div>
      )}
    </Dialog>
  );
}
