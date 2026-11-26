import { Plus, Trash2, Wand2 } from 'lucide-react';
import type { OptionGroup } from '@/types/domain';
import { DRINK_PRESET, MAX_CHOICES, MAX_GROUPS, SIZE_ONLY_PRESET, newOptionId } from '@/domain/options';
import { Button } from '@/components/ui/Button';
import { confirmDialog } from '@/stores/confirm.store';

/**
 * Soạn nhóm tuỳ chọn của món (controlled: value/onChange, gắn vào form qua Controller).
 * Id nhóm/lựa chọn được giữ nguyên khi đổi tên → đơn cũ vẫn đối chiếu được giá.
 */
export function OptionsEditor({ value, onChange, error }: { value: OptionGroup[]; onChange: (v: OptionGroup[]) => void; error?: string }) {
  const setGroup = (gi: number, patch: Partial<OptionGroup>) => onChange(value.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  const setChoice = (gi: number, ci: number, patch: Partial<OptionGroup['choices'][number]>) =>
    setGroup(gi, { choices: value[gi]!.choices.map((c, i) => (i === ci ? { ...c, ...patch } : c)) });

  const usePreset = async (preset: OptionGroup[]) => {
    if (value.length && !(await confirmDialog({ title: 'Thay toàn bộ tuỳ chọn hiện tại bằng mẫu?', confirmLabel: 'Dùng mẫu' }))) return;
    onChange(structuredClone(preset));
  };

  const input = 'field min-h-[2.75rem] py-1.5';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="label mb-0">Tuỳ chọn món (size, đường, đá, topping…)</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => void usePreset(DRINK_PRESET)}>
            <Wand2 className="h-4 w-4" /> Mẫu đồ uống
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void usePreset(SIZE_ONLY_PRESET)}>
            <Wand2 className="h-4 w-4" /> Mẫu phần nhỏ/lớn
          </Button>
        </div>
      </div>
      {value.length === 0 && <p className="text-[0.95rem] text-ink-faint">Món không có tuỳ chọn, khách bấm + là thêm ngay.</p>}

      {value.map((g, gi) => (
        <fieldset key={g.id} className="rounded-2xl border-2 border-ink/70 bg-cream p-3">
          <legend className="sr-only">Nhóm {g.name || gi + 1}</legend>
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-[8rem] flex-1">
              <span className="text-[0.85rem] font-bold">Tên nhóm</span>
              <input className={input} value={g.name} maxLength={30} onChange={(e) => setGroup(gi, { name: e.target.value })} placeholder="VD: Size" />
            </label>
            <label>
              <span className="text-[0.85rem] font-bold">Kiểu</span>
              <select className={input} value={g.multi ? 'multi' : 'single'} onChange={(e) => setGroup(gi, { multi: e.target.value === 'multi' })}>
                <option value="single">Chọn 1</option>
                <option value="multi">Chọn nhiều</option>
              </select>
            </label>
            <label className="flex min-h-[2.75rem] items-center gap-2">
              <input type="checkbox" className="h-5 w-5 accent-ink" checked={g.required} onChange={(e) => setGroup(gi, { required: e.target.checked })} />
              Bắt buộc
            </label>
            <Button variant="danger" size="icon" aria-label={`Xoá nhóm ${g.name}`} onClick={() => onChange(value.filter((_, i) => i !== gi))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <ul className="mt-3 space-y-2">
            {g.choices.map((c, ci) => (
              <li key={c.id} className="flex items-center gap-2">
                <input
                  className={input}
                  value={c.name}
                  maxLength={40}
                  aria-label="Tên lựa chọn"
                  placeholder="VD: Size L"
                  onChange={(e) => setChoice(gi, ci, { name: e.target.value })}
                />
                <label className="flex w-36 shrink-0 items-center gap-1">
                  <span aria-hidden>+</span>
                  <input
                    className={input}
                    inputMode="numeric"
                    aria-label={`Giá cộng thêm cho ${c.name || 'lựa chọn'}`}
                    value={c.price}
                    onChange={(e) => setChoice(gi, ci, { price: Math.max(0, Math.min(200000, Number(e.target.value.replace(/\D/g, '')) || 0)) })}
                  />
                  <span aria-hidden>đ</span>
                </label>
                <button
                  type="button"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-faint hover:bg-danger-soft hover:text-danger"
                  aria-label={`Xoá lựa chọn ${c.name}`}
                  onClick={() => setGroup(gi, { choices: g.choices.filter((_, i) => i !== ci) })}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          {g.choices.length < MAX_CHOICES && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1"
              onClick={() => setGroup(gi, { choices: [...g.choices, { id: newOptionId(), name: '', price: 0 }] })}
            >
              <Plus className="h-4 w-4" /> Thêm lựa chọn
            </Button>
          )}
        </fieldset>
      ))}

      {value.length < MAX_GROUPS && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            onChange([...value, { id: newOptionId(), name: '', multi: false, required: true, choices: [{ id: newOptionId(), name: '', price: 0 }] }])
          }
        >
          <Plus className="h-4 w-4" /> Thêm nhóm tuỳ chọn
        </Button>
      )}
      {error && (
        <p className="font-bold text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
