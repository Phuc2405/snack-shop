import { useEffect, useState } from 'react';
import { shopPhase, type ShopPhase } from '@/domain/hours';
import { useShopStore } from '@/stores/shop.store';

/** Trạng thái mở cửa hiện tại, tự cập nhật mỗi phút (qua giờ đóng/mở thì giao diện đổi theo). */
export function useShopPhase(): ShopPhase {
  const isOpen = useShopStore((s) => s.settings.isOpen);
  const openHours = useShopStore((s) => s.settings.openHours);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  return shopPhase({ isOpen, openHours }, now);
}
