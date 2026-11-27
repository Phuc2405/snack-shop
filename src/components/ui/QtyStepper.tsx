import { Minus, Plus, Trash2 } from 'lucide-react';
import { MAX_QTY_PER_ITEM } from '@/domain/cart';
import { cn } from '@/lib/cn';

/**
 * Nút −/+ số lượng. Vùng chạm 44px, có nhãn cho trình đọc màn hình.
 * Cho phép về 0 (min = 0, vd dòng trong giỏ) mà đang còn 1 → nút "−" thành THÙNG RÁC đỏ: khách thấy rõ bấm là bỏ khỏi giỏ
 * (bỏ xong có thông báo "Hoàn tác" — useCartLineQty).
 */
export function QtyStepper({
  value,
  onChange,
  name,
  min = 0,
  size = 'md',
}: {
  value: number;
  onChange: (v: number) => void;
  name: string;
  min?: number;
  size?: 'md' | 'lg';
}) {
  const btn = cn(
    'grid place-items-center rounded-full border border-edge bg-white transition-colors hover:bg-lemon disabled:opacity-40 disabled:hover:bg-white',
    size === 'lg' ? 'h-12 w-12' : 'h-11 w-11',
  );
  const removes = min === 0 && value === 1;
  return (
    <div className="inline-flex items-center gap-2" role="group" aria-label={`Số lượng ${name}`}>
      <button
        type="button"
        className={cn(btn, removes && 'border-danger/40 text-danger hover:bg-danger-soft')}
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={removes ? `Bỏ ${name} khỏi giỏ` : `Bớt 1 ${name}`}
      >
        {removes ? <Trash2 key="rm" className="h-4 w-4 animate-pop-in" strokeWidth={2.5} /> : <Minus className="h-4 w-4" strokeWidth={3} />}
      </button>
      <output className={cn('min-w-[2ch] text-center font-bold tabular', size === 'lg' ? 'text-2xl' : 'text-lg')} aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value + 1)}
        disabled={value >= MAX_QTY_PER_ITEM}
        aria-label={`Thêm 1 ${name}`}
      >
        <Plus className="h-4 w-4" strokeWidth={3} />
      </button>
    </div>
  );
}
