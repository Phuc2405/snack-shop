import { useCallback } from 'react';
import type { CartLine } from '@/domain/cart';
import { useCartStore } from '@/stores/cart.store';
import { toast } from '@/stores/toast.store';
import { optionsLabel } from '@/domain/options';

/**
 * Đổi số lượng 1 dòng trong giỏ (thẻ món, hộp chi tiết món, giỏ hàng dùng chung).
 * Về 0 = bỏ dòng đó + thông báo có nút "Hoàn tác" (bấm nhầm "−" không mất món — khuyến nghị của Baymard).
 */
export function useCartLineQty() {
  return useCallback((line: CartLine, qty: number) => {
    const { lines, setQty, replace } = useCartStore.getState();
    if (qty > 0) {
      setQty(line.key, qty);
      return;
    }
    const at = lines.findIndex((l) => l.key === line.key);
    setQty(line.key, 0);
    const what = line.options.length ? `${line.name} (${optionsLabel(line.options)})` : line.name;
    toast.info(`Đã bỏ ${what} khỏi giỏ`, {
      label: 'Hoàn tác',
      onClick: () => {
        const cur = useCartStore.getState().lines;
        if (cur.some((l) => l.key === line.key)) return;
        const next = [...cur];
        next.splice(Math.min(Math.max(at, 0), next.length), 0, line); // trả về đúng chỗ cũ
        replace(next);
      },
    });
  }, []);
}

export { qtyOfProduct } from '@/domain/cart';
