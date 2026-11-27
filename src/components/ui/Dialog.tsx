import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { cn } from '@/lib/cn';
import { prefersReducedMotion } from '@/lib/viewTransition';

type Placement = 'center' | 'sheet' | 'side';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** center: hộp giữa màn hình · sheet: trượt từ dưới lên (mobile), giữa màn hình (desktop) · side: ngăn kéo bên phải */
  placement?: Placement;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Chặn đóng khi đang gửi dữ liệu */
  busy?: boolean;
  /** Thanh tiêu đề màu */
  tone?: 'white' | 'lemon' | 'mint' | 'sky' | 'berry';
}

const SIZES = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' };
const TONES = { white: 'bg-white', lemon: 'bg-lemon', mint: 'bg-mint-soft', sky: 'bg-sky-soft', berry: 'bg-berry-soft' };

const PLACEMENT: Record<Placement, string> = {
  center: 'm-auto w-[calc(100%-2rem)] max-h-[90dvh] rounded-3xl',
  sheet: 'mb-0 mt-auto w-full max-w-none max-h-[92dvh] rounded-t-3xl sm:m-auto sm:w-[calc(100%-2rem)] sm:max-h-[90dvh] sm:rounded-3xl',
  side: 'my-0 ml-auto mr-0 h-dvh max-h-none w-[min(26rem,100%)] max-w-none rounded-none border-y-0 border-r-0',
};
/** Hiệu ứng mở / đóng theo kiểu hộp (đóng: giữ hộp thêm ~200ms cho chạy xong rồi mới close()) */
const ENTER: Record<Placement, string> = {
  center: 'animate-pop-in',
  sheet: 'animate-slide-up sm:animate-pop-in',
  side: 'animate-slide-left',
};
const EXIT: Record<Placement, string> = {
  center: 'animate-pop-out',
  sheet: 'animate-slide-down sm:animate-pop-out',
  side: 'animate-slide-right',
};
const EXIT_MS = 200;

/**
 * Hộp thoại dựa trên <dialog> gốc của trình duyệt: Esc để đóng, focus bị giữ bên trong,
 * phần nền phía sau "inert" (trình đọc màn hình không lạc ra ngoài) — không cần thư viện.
 */
export function Dialog({ open, onClose, title, placement = 'center', children, footer, size = 'md', busy, tone = 'white' }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  /** Đang chạy hiệu ứng đóng: nội dung vẫn hiện tới khi hiệu ứng xong */
  const [closing, setClosing] = useState(false);
  useLockBodyScroll(open);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      setClosing(false);
      if (!el.open) el.showModal();
      return;
    }
    if (!el.open) return;
    if (prefersReducedMotion()) {
      el.close();
      return;
    }
    setClosing(true);
    const t = window.setTimeout(() => {
      el.close();
      setClosing(false);
    }, EXIT_MS);
    return () => window.clearTimeout(t);
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      data-closing={closing || undefined}
      onCancel={(e) => {
        e.preventDefault(); // Esc: tự quyết định đóng (chặn khi busy)
        if (!busy) onClose();
      }}
      onClick={(e) => {
        // Bấm vào vùng nền (chính thẻ dialog, ngoài khung nội dung) → đóng
        if (e.target === e.currentTarget && !busy) onClose();
      }}
      className={cn(
        'overflow-hidden border border-edge bg-white p-0 text-ink shadow-sticker-lg backdrop:bg-ink/45 open:flex open:flex-col',
        PLACEMENT[placement],
        closing ? EXIT[placement] : ENTER[placement],
        closing && 'pointer-events-none',
        placement !== 'side' && SIZES[size],
      )}
    >
      {(open || closing) && (
        <>
          <header className={cn('flex items-center justify-between gap-3 border-b border-edge px-5 py-3.5', TONES[tone])}>
            <h2 id={titleId} className="min-w-0 text-xl">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-edge bg-white transition-transform hover:rotate-90 disabled:opacity-40"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
          {footer && <footer className="pb-safe border-t border-edge bg-cream px-5 pt-4">{footer}</footer>}
        </>
      )}
    </dialog>
  );
}
