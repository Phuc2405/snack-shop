import { Check } from 'lucide-react';
import type { OptionGroup } from '@/types/domain';
import { toggleChoice, type Selection } from '@/domain/options';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/cn';

/**
 * Chọn tuỳ chọn món. Nhóm "chọn 1" là radio, "chọn nhiều" là checkbox — dùng input thật
 * (bàn phím, trình đọc màn hình hoạt động sẵn), giao diện dạng chip to dễ bấm.
 */
export function OptionPicker({
  groups,
  value,
  onChange,
  missing,
}: {
  groups: OptionGroup[];
  value: Selection;
  onChange: (s: Selection) => void;
  /** Tên các nhóm bắt buộc chưa chọn (hiện cảnh báo) */
  missing: string[];
}) {
  return (
    <div className="space-y-5">
      {groups.map((g) => {
        const picked = value[g.id] ?? [];
        const isMissing = missing.includes(g.name);
        return (
          <fieldset key={g.id}>
            <legend className="mb-2 flex w-full flex-wrap items-baseline justify-between gap-x-3 font-bold">
              <span>{g.name}</span>
              <span className={cn('text-[0.85rem] font-normal', isMissing ? 'font-bold text-danger' : 'text-ink-faint')}>
                {g.multi ? 'Chọn nhiều' : 'Chọn 1'}
                {g.required ? ' · bắt buộc' : ' · không bắt buộc'}
              </span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {g.choices.map((c) => {
                const on = picked.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={cn(
                      'inline-flex min-h-[2.75rem] cursor-pointer select-none items-center gap-2 rounded-full border px-3.5 transition-[background-color,border-color,box-shadow]',
                      'has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink',
                      on ? 'border-tangerine bg-tangerine-soft font-bold shadow-sticker' : 'border-edge-strong bg-white hover:border-ink/40',
                    )}
                  >
                    <input
                      type={g.multi ? 'checkbox' : 'radio'}
                      name={`opt-${g.id}`}
                      className="sr-only"
                      checked={on}
                      onChange={() => onChange(toggleChoice(value, g, c.id))}
                      onClick={(e) => {
                        // Radio không bắt buộc: bấm lại để bỏ chọn
                        if (!g.multi && !g.required && on) {
                          e.preventDefault();
                          onChange(toggleChoice(value, g, c.id));
                        }
                      }}
                    />
                    {on && <Check className="h-4 w-4 shrink-0" strokeWidth={3} aria-hidden />}
                    <span>{c.name}</span>
                    {c.price > 0 && <span className="text-[0.85rem] text-tangerine-deep">+{formatPrice(c.price)}</span>}
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
