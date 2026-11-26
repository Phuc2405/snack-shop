import { useState } from 'react';
import { useShopStore } from '@/stores/shop.store';
import { settingsRepo } from '@/services/settings.repo';
import { toast } from '@/stores/toast.store';
import { toAppError } from '@/lib/errors';
import { cn } from '@/lib/cn';

/** Công tắc nhanh Mở/Đóng nhận đơn online (rules chặn đặt đơn khi isOpen = false). */
export function ShopOpenSwitch() {
  const settings = useShopStore((s) => s.settings);
  const setSettings = useShopStore((s) => s.setSettings);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    const next = { ...settings, isOpen: !settings.isOpen };
    setBusy(true);
    try {
      await settingsRepo.save(next);
      setSettings(next);
      toast.success(next.isOpen ? 'Đã MỞ nhận đơn online' : 'Đã TẠM ĐÓNG nhận đơn online');
    } catch (e) {
      toast.error(toAppError(e).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={settings.isOpen}
      disabled={busy}
      onClick={() => void toggle()}
      className={cn(
        'inline-flex min-h-[2.75rem] items-center gap-2 rounded-xl border border-edge px-3.5 font-bold shadow-sticker transition-colors disabled:opacity-60',
        settings.isOpen ? 'bg-mint' : 'bg-white',
      )}
    >
      <span className={cn('h-3 w-3 rounded-full border border-edge', settings.isOpen ? 'bg-white' : 'bg-danger')} aria-hidden />
      {settings.isOpen ? 'Đang nhận đơn' : 'Đang đóng đơn'}
    </button>
  );
}
