import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { AppError, toAppError } from '@/lib/errors';

export interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: AppError | null;
  reload: () => void;
  setData: (fn: (prev: T | undefined) => T | undefined) => void;
}

/**
 * Đọc dữ liệu bất đồng bộ: loading / error / reload.
 * - Kết quả của lần gọi cũ về muộn bị bỏ qua (chống race khi deps đổi nhanh).
 * - `pollMs`: tự tải lại định kỳ, CHỈ khi tab đang hiển thị (tab ẩn = không tốn request).
 */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList, opts: { pollMs?: number; enabled?: boolean } = {}): AsyncState<T> {
  const { pollMs, enabled = true } = opts;
  const [data, setDataState] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<AppError | null>(null);
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const hasData = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    if (!hasData.current) setLoading(true);
    fnRef
      .current()
      .then((d) => {
        if (!active) return;
        hasData.current = true;
        setDataState(d);
        setError(null);
      })
      .catch((e) => active && setError(toAppError(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, tick]);

  useEffect(() => {
    if (!pollMs || !enabled) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') setTick((t) => t + 1);
    }, pollMs);
    const onVisible = () => document.visibilityState === 'visible' && setTick((t) => t + 1);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [pollMs, enabled]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((f: (prev: T | undefined) => T | undefined) => setDataState(f), []);
  return { data, loading, error, reload, setData };
}
