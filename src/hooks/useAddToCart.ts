import { useCallback } from 'react';
import type { Product } from '@/types/domain';
import { useCartStore } from '@/stores/cart.store';
import { useUiStore } from '@/stores/ui.store';
import { toast } from '@/stores/toast.store';
import { MAX_LINES, MAX_QTY_PER_ITEM } from '@/domain/cart';

/** Thêm món vào giỏ + phản hồi cho khách (toast, icon giỏ nảy). Dùng chung cho thẻ món và sheet. */
export function useAddToCart() {
  const addToCart = useCartStore((s) => s.add);
  const bumpCart = useUiStore((s) => s.bumpCart);
  return useCallback(
    (p: Product, qty = 1) => {
      const r = addToCart(p, qty);
      if (r === 'added') {
        bumpCart();
        toast.success(`Đã thêm ${qty > 1 ? `${qty} ` : ''}${p.name}`);
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
