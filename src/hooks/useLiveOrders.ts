import { useEffect, useRef, useState } from 'react';
import type { Order } from '@/types/domain';
import type { AppError } from '@/lib/errors';
import { subscribeOrders } from '@/services/orders.live';
import { toast } from '@/stores/toast.store';

/** Tiếng "ting" ngắn bằng WebAudio (không cần file âm thanh). */
function chime(ctx: AudioContext) {
  const now = ctx.currentTime;
  [880, 1320].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + i * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.3, now + i * 0.15 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.15 + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.15);
    osc.stop(now + i * 0.15 + 0.4);
  });
}

/**
 * Đơn hàng realtime cho dashboard + báo đơn mới:
 * âm thanh (khi nhân viên đã bật), toast, và số đơn mới trên tiêu đề tab.
 */
export function useLiveOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const seen = useRef<Set<string> | null>(null);

  useEffect(
    () =>
      subscribeOrders(
        (list) => {
          setError(null);
          setOrders(list);
          const fresh = list.filter((o) => o.status === 'new' && !seen.current?.has(o.id));
          // Lần nhận dữ liệu đầu tiên chỉ ghi nhớ, không báo (tránh "ting" khi vừa mở trang)
          if (seen.current && fresh.length) {
            toast.info(fresh.length === 1 ? `Có đơn mới ${fresh[0]!.code}!` : `Có ${fresh.length} đơn mới!`);
            if (audio.current) chime(audio.current);
          }
          seen.current = new Set(list.map((o) => o.id));
        },
        (e) => setError(e),
      ),
    [],
  );

  // Số đơn mới trên tiêu đề tab → thấy được cả khi đang ở tab khác
  const newCount = orders?.filter((o) => o.status === 'new').length ?? 0;
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, '');
    document.title = newCount ? `(${newCount}) ${base}` : base;
    return () => {
      document.title = document.title.replace(/^\(\d+\)\s*/, '');
    };
  }, [newCount]);

  /** Trình duyệt chỉ cho phát âm thanh sau một cú bấm của người dùng. */
  const enableSound = () => {
    audio.current ??= new AudioContext();
    void audio.current.resume();
    chime(audio.current);
    setSoundOn(true);
  };

  return { orders, error, newCount, soundOn, enableSound };
}
