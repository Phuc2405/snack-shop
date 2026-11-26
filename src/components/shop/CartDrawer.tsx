import { useNavigate } from 'react-router-dom';
import { ShoppingBasket, Trash2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { QtyStepper } from '@/components/ui/QtyStepper';
import { formatPrice } from '@/lib/format';
import { useCartStore, selectSubtotal } from '@/stores/cart.store';
import { useUiStore } from '@/stores/ui.store';
import { ProductImage } from './ProductImage';
import { FreeShipHint } from './FreeShipHint';
import { optionsLabel } from '@/domain/options';

export function CartDrawer() {
  const open = useUiStore((s) => s.cartOpen);
  const close = useUiStore((s) => s.closeCart);
  const lines = useCartStore((s) => s.lines);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);
  const subtotal = useCartStore(selectSubtotal);
  const navigate = useNavigate();

  return (
    <Dialog
      open={open}
      onClose={close}
      placement="side"
      tone="lemon"
      title="Giỏ hàng"
      footer={
        lines.length > 0 && (
          <div className="space-y-3">
            <FreeShipHint subtotal={subtotal} />
            <div className="flex items-baseline justify-between text-lg">
              <span>Tạm tính</span>
              <span className="price text-2xl">{formatPrice(subtotal)}</span>
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                close();
                navigate('/checkout');
              }}
            >
              Đặt món ngay
            </Button>
          </div>
        )
      }
    >
      {lines.length === 0 ? (
        <EmptyState
          icon={<ShoppingBasket className="h-14 w-14 text-tangerine" strokeWidth={1.75} />}
          title="Giỏ còn trống"
          description="Chọn vài món ngon trong menu nhé!"
          action={
            <Button variant="secondary" onClick={close}>
              Xem menu
            </Button>
          }
        />
      ) : (
        <ul className="divide-y-2 divide-dashed divide-ink/20">
          {lines.map((l) => (
            <li key={l.key} className="flex gap-3 py-3">
              <ProductImage
                product={{ name: l.name, imageUrl: l.imageUrl, category: l.category, available: true }}
                className="h-20 w-20 shrink-0 rounded-xl border-2 border-ink"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold leading-snug">{l.name}</p>
                    {l.options.length > 0 && <p className="text-[0.85rem] leading-snug text-ink-soft">{optionsLabel(l.options)}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(l.key)}
                    className="-mr-2 -mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-faint hover:bg-danger-soft hover:text-danger"
                    aria-label={`Bỏ ${l.name} khỏi giỏ`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <QtyStepper value={l.qty} onChange={(v) => setQty(l.key, v)} name={l.name} />
                  <span className="price">{formatPrice(l.price * l.qty)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
