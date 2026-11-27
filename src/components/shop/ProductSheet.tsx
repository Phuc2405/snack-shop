import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { QtyStepper } from '@/components/ui/QtyStepper';
import { TextAreaField } from '@/components/ui/FormField';
import { MAX_NOTE, type CartLine } from '@/domain/cart';
import { cleanText } from '@/lib/sanitize';
import { CATEGORIES } from '@/config/catalog';
import {
  defaultSelection,
  missingRequired,
  optionsLabel,
  optionsTotal,
  selectionFromOptions,
  toSelectedOptions,
  type Selection,
} from '@/domain/options';
import { formatPrice } from '@/lib/format';
import { useAddToCart } from '@/hooks/useAddToCart';
import { useUiStore } from '@/stores/ui.store';
import { useCartStore } from '@/stores/cart.store';
import { useShopStore } from '@/stores/shop.store';
import { toast } from '@/stores/toast.store';
import { useLastValue } from '@/hooks/useLastValue';
import { qtyOfProduct, useCartLineQty } from '@/hooks/useCartLineQty';
import { ProductImage } from './ProductImage';
import { OptionPicker } from './OptionPicker';

/** list = danh sách món đã chọn · new = chọn thêm · edit = sửa 1 dòng đã chọn */
type Mode = { kind: 'list' } | { kind: 'new' } | { kind: 'edit'; key: string };

/**
 * Chi tiết món (bottom sheet trên điện thoại, hộp giữa màn hình trên máy tính) — kiểu GrabFood:
 *  - Món chưa có trong giỏ → mở sẵn phần chọn size / đường / đá / ghi chú.
 *  - Đã có → "Món đã chọn" (2× Size M, 3× Size L…). Bấm 1 dòng → SỬA đúng dòng đó (đổi tuỳ chọn, ghi chú,
 *    số lượng, hoặc bỏ). Nút "Chọn thêm" → thêm lựa chọn mới như bình thường.
 *  - Món tạm hết → CHỈ XEM: không thêm, không sửa, không đổi số lượng.
 */
export function ProductSheet() {
  const viewing = useUiStore((s) => s.viewing);
  const product = useLastValue(viewing); // còn nội dung trong lúc hộp chạy hiệu ứng đóng
  const view = useUiStore((s) => s.view);
  const add = useAddToCart();
  const changeQty = useCartLineQty();
  const update = useCartStore((s) => s.update);
  const inCart = useCartStore(useShallow((s) => (product ? s.lines.filter((l) => l.productId === product.id) : [])));
  const total = qtyOfProduct(inCart, product?.id ?? '');
  const [qty, setQty] = useState(1);
  const [sel, setSel] = useState<Selection>({});
  const [note, setNote] = useState('');
  const [mode, setMode] = useState<Mode>({ kind: 'list' });

  const readOnly = !!product && !product.available;
  const editing = mode.kind === 'edit' ? inCart.find((l) => l.key === mode.key) : undefined;
  // Không còn dòng nào để liệt kê → mở thẳng phần chọn; dòng đang sửa vừa bị bỏ → về danh sách
  const view_ = readOnly ? 'list' : mode.kind === 'edit' && !editing ? 'list' : mode.kind === 'list' && inCart.length === 0 ? 'new' : mode.kind;

  const startNew = () => {
    if (!product) return;
    setSel(defaultSelection(product));
    setNote('');
    setQty(1);
    setMode({ kind: 'new' });
  };
  const startEdit = (l: CartLine) => {
    if (!product || readOnly) return;
    setSel(selectionFromOptions(product, l.options));
    setNote(l.note);
    setQty(l.qty);
    setMode({ kind: 'edit', key: l.key });
  };

  useEffect(() => {
    if (!viewing) return; // đang đóng: giữ nguyên để hộp không "nhảy" nội dung
    setSel(defaultSelection(viewing));
    setNote('');
    setQty(1);
    setMode({ kind: 'list' });
  }, [viewing]);

  const options = useMemo(() => (product ? toSelectedOptions(product, sel) : []), [product, sel]);
  const missing = product ? missingRequired(product, sel) : [];
  const unit = product ? product.price + optionsTotal(options) : 0;

  const close = () => view(null);
  const submit = () => {
    if (!product || readOnly) return;
    if (missing.length) {
      toast.error(`Bạn chọn giúp: ${missing.join(', ')}`);
      return;
    }
    if (view_ === 'edit' && editing) {
      const r = update(editing.key, product, qty, options, cleanText(note));
      if (r === 'unavailable') toast.error(`${product.name} đang tạm hết.`);
      else {
        toast.success(r === 'merged' ? 'Đã cập nhật và gộp với món giống hệt trong giỏ' : 'Đã cập nhật món');
        void useShopStore.getState().verifyProduct(product.id);
        setMode({ kind: 'list' });
      }
      return;
    }
    if (add(product, qty, options, cleanText(note)) !== 'unavailable') close();
  };

  const picking = view_ === 'new' || view_ === 'edit';

  return (
    <Dialog
      open={!!viewing}
      onClose={close}
      placement="sheet"
      title={product ? CATEGORIES[product.category].label : ''}
      tone="lemon"
      footer={
        product &&
        (readOnly ? (
          <Button size="lg" variant="secondary" className="w-full" onClick={close}>
            Đóng · món đang tạm hết
          </Button>
        ) : picking ? (
          <div className="flex items-center justify-between gap-3">
            <QtyStepper value={qty} onChange={setQty} name={product.name} min={1} />
            <Button size="lg" className="flex-1 whitespace-nowrap px-4" onClick={submit}>
              {view_ === 'edit' ? `Cập nhật · ${formatPrice(unit * qty)}` : `Thêm · ${formatPrice(unit * qty)}`}
            </Button>
          </div>
        ) : (
          <Button size="lg" variant="secondary" className="w-full" onClick={close}>
            Xong · {total} phần trong giỏ
          </Button>
        ))
      }
    >
      {product && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,12rem)_1fr] sm:items-start">
            <ProductImage product={product} eager className="mx-auto w-full max-w-[12rem] rounded-2xl border border-edge" />
            <div>
              <h3 className="text-2xl">{product.name}</h3>
              <p className="price mt-1 text-2xl">{formatPrice(product.price)}</p>
              {product.description && <p className="mt-3 text-ink-soft">{product.description}</p>}
              {readOnly && <p className="mt-3 font-bold text-danger">Món này đang tạm hết, bạn quay lại sau nhé!</p>}
            </div>
          </div>

          {view_ === 'list' && inCart.length > 0 && (
            <section className="rounded-2xl border border-edge bg-cream p-3.5" aria-labelledby="in-cart-title">
              <h4 id="in-cart-title" className="flex items-baseline justify-between gap-2 text-lg">
                Món đã chọn <span className="text-[0.95rem] font-normal text-ink-soft tabular">{total} phần</span>
              </h4>
              <ul className="mt-2 space-y-2">
                {inCart.map((l) => (
                  // Một dòng = khung thông tin (bấm → sửa size / ghi chú) + bộ −/+ đổi số lượng ngay, không qua bước sửa.
                  // Hai vùng bấm nằm cạnh nhau, không lồng nhau (hợp lệ a11y). Tạm hết → chỉ xem.
                  <li key={l.key} className="flex items-center gap-2 rounded-xl border border-edge bg-white p-1.5 pl-1">
                    <button
                      type="button"
                      onClick={() => startEdit(l)}
                      disabled={readOnly}
                      className="group/edit flex min-h-[2.75rem] min-w-0 flex-1 items-center gap-2 rounded-lg p-1.5 text-left transition-colors hover:bg-lemon-soft disabled:cursor-default disabled:hover:bg-transparent"
                      aria-label={`Sửa ${l.name} ${optionsLabel(l.options)}${l.note ? `, ghi chú ${l.note}` : ''}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold leading-snug">{l.options.length ? optionsLabel(l.options) : 'Mặc định'}</span>
                        {l.note && <span className="block text-[0.9rem] italic text-ink-soft">Ghi chú: {l.note}</span>}
                        <span className="block text-[0.9rem] text-ink-soft tabular">{formatPrice(l.price * l.qty)}</span>
                      </span>
                    </button>
                    {readOnly ? (
                      <span className="shrink-0 px-2 font-bold tabular">×{l.qty}</span>
                    ) : (
                      <div className="shrink-0">
                        {/* về 0 = bỏ dòng này (có nút Hoàn tác) */}
                        <QtyStepper value={l.qty} onChange={(v) => changeQty(l, v)} name={`${l.name} ${optionsLabel(l.options)}`} min={0} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              {!readOnly && (
                <button
                  type="button"
                  onClick={startNew}
                  className="mt-2.5 flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-edge-strong bg-white px-3 font-bold transition-colors hover:bg-lemon-soft"
                >
                  <Plus className="h-4 w-4" strokeWidth={3} aria-hidden /> Chọn thêm
                </button>
              )}
            </section>
          )}

          {picking && (
            <div key={view_ === 'edit' ? `edit-${editing?.key}` : 'new'} className="animate-fade-up space-y-5">
              {inCart.length > 0 && (
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-lg">{view_ === 'edit' ? 'Sửa món đã chọn' : 'Chọn thêm'}</h4>
                  <button
                    type="button"
                    onClick={() => setMode({ kind: 'list' })}
                    className="inline-flex min-h-[2.75rem] items-center gap-1.5 px-2 font-bold text-ink-soft hover:text-ink"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden /> Món đã chọn
                  </button>
                </div>
              )}
              {product.options.length > 0 && <OptionPicker groups={product.options} value={sel} onChange={setSel} missing={missing} />}
              <TextAreaField
                label="Ghi chú cho món (không bắt buộc)"
                rows={2}
                maxLength={MAX_NOTE}
                placeholder="VD: ít đá, không hành, tách riêng nước sốt…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                hint="Cùng món nhưng ghi chú khác sẽ tách thành dòng riêng trong giỏ."
              />
              {view_ === 'edit' && editing && (
                <button
                  type="button"
                  onClick={() => {
                    changeQty(editing, 0); // có nút Hoàn tác
                    setMode({ kind: 'list' });
                  }}
                  className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-full px-3 font-bold text-danger hover:bg-danger-soft"
                >
                  <Trash2 className="h-4 w-4" aria-hidden /> Bỏ món này khỏi giỏ
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
