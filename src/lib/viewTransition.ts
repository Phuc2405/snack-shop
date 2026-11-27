import { flushSync } from 'react-dom';

type Doc = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Đổi giao diện có hiệu ứng (View Transitions API). Trình duyệt chưa hỗ trợ / người dùng tắt chuyển động
 * → đổi ngay như bình thường. `kind = 'menu'`: chỉ thẻ món chuyển động, trang không trượt (xem index.css).
 */
export function withViewTransition(update: () => void, kind: 'menu' | 'page' = 'page') {
  const doc = document as Doc;
  if (!doc.startViewTransition || prefersReducedMotion()) return update();
  const root = document.documentElement;
  if (kind === 'menu') root.dataset.vt = 'menu';
  const t = doc.startViewTransition(() => flushSync(update));
  void t.finished.finally(() => {
    if (root.dataset.vt === kind) delete root.dataset.vt;
  });
}
