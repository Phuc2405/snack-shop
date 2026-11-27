import { useCallback } from 'react';
import type { Product, SelectedOption } from '@/types/domain';
import { useCartStore } from '@/stores/cart.store';
import { useUiStore } from '@/stores/ui.store';
import { toast } from '@/stores/toast.store';
import { useShopStore } from '@/stores/shop.store';
import { MAX_LINES, MAX_QTY_PER_ITEM } from '@/domain/cart';
import { optionsLabel } from '@/domain/options';

/** Thêm món vào giỏ + phản hồi cho khách (toast, icon giỏ nảy). Dùng chung cho thẻ món và sheet. */
export function useAddToCart() {
  const addToCart = useCartStore((s) => s.add);
  const bumpCart = useUiStore((s) => s.bumpCart);
  return useCallback(
    (p: Product, qty = 1, options: SelectedOption[] = [], note = '') => {
      const r = addToCart(p, qty, options, note);
      const what = `${qty > 1 ? `${qty} ` : ''}${p.name}${options.length ? ` (${optionsLabel(options)})` : ''}`;
      if (r === 'added' || r === 'capped') {
        // Menu trên máy có thể đã cũ (tiệm vừa tắt món sau khi khách mở trang) → kiểm lại món này trên server.
        // Thêm ngay cho nhanh (lạc quan), nếu món đã tạm hết / bị ẩn thì bỏ khỏi giỏ và báo rõ.
        void useShopStore.getState().verifyProduct(p.id); // tự báo khách nếu món vừa hết
      }
      if (r === 'added') {
        bumpCart();
        toast.success(`Đã thêm ${what}`);
      } else if (r === 'capped') {
        bumpCart();
        toast.info(`Mỗi món tối đa ${MAX_QTY_PER_ITEM} phần mỗi đơn.`);
      } else if (r === 'full') toast.error(`Giỏ hàng tối đa ${MAX_LINES} món khác nhau.`);
      else toast.error(`${p.name} đang tạm hết.`);
      return r;
    },
    [addToCart, bumpCart],
  );
}
