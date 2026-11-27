import type { OptionGroup, Product, SelectedOption } from '@/types/domain';

/**
 * Tuỳ chọn món (size, đường, đá, topping) — hàm thuần, dùng chung cho bottom sheet, giỏ hàng,
 * payload đơn và kiểm tra giá ở dashboard.
 */

/** Lựa chọn của khách: groupId → danh sách choiceId */
export type Selection = Record<string, string[]>;

export const MAX_GROUPS = 8; // khớp rules: options.size() <= 8
export const MAX_CHOICES = 12;

/** Mặc định: nhóm "chọn 1 + bắt buộc" chọn sẵn lựa chọn đầu tiên → khách bấm Thêm được ngay. */
export function defaultSelection(p: Pick<Product, 'options'>): Selection {
  const sel: Selection = {};
  for (const g of p.options) sel[g.id] = !g.multi && g.required && g.choices[0] ? [g.choices[0].id] : [];
  return sel;
}

/** Bấm một lựa chọn: nhóm chọn 1 thì thay, nhóm chọn nhiều thì bật/tắt. Nhóm chọn 1 không bắt buộc được bỏ chọn. */
export function toggleChoice(sel: Selection, g: OptionGroup, choiceId: string): Selection {
  const cur = sel[g.id] ?? [];
  if (g.multi) {
    return { ...sel, [g.id]: cur.includes(choiceId) ? cur.filter((c) => c !== choiceId) : [...cur, choiceId] };
  }
  if (cur[0] === choiceId && !g.required) return { ...sel, [g.id]: [] };
  return { ...sel, [g.id]: [choiceId] };
}

/**
 * Ngược của toSelectedOptions: tuỳ chọn đã lưu trong giỏ → Selection để mở lại form sửa.
 * Lựa chọn không còn trong menu bị bỏ qua (khách chọn lại).
 */
export function selectionFromOptions(p: Pick<Product, 'options'>, opts: Pick<SelectedOption, 'group' | 'choice'>[]): Selection {
  const sel: Selection = {};
  for (const g of p.options) {
    const ids = new Set(g.choices.map((c) => c.id));
    sel[g.id] = opts.filter((o) => o.group === g.id && ids.has(o.choice)).map((o) => o.choice);
    if (!g.multi) sel[g.id] = sel[g.id]!.slice(0, 1);
  }
  return sel;
}

/** Tên các nhóm bắt buộc chưa chọn. */
export function missingRequired(p: Pick<Product, 'options'>, sel: Selection): string[] {
  return p.options.filter((g) => g.required && !(sel[g.id]?.length)).map((g) => g.name);
}

/** Selection → danh sách tuỳ chọn (theo thứ tự nhóm/lựa chọn trong menu, bỏ id không tồn tại). */
export function toSelectedOptions(p: Pick<Product, 'options'>, sel: Selection): SelectedOption[] {
  const out: SelectedOption[] = [];
  for (const g of p.options) {
    const picked = new Set(sel[g.id] ?? []);
    for (const c of g.choices) if (picked.has(c.id)) out.push({ group: g.id, choice: c.id, name: c.name, price: c.price });
  }
  return out;
}

export const optionsTotal = (opts: { price: number }[]) => opts.reduce((s, o) => s + o.price, 0);

/** Khoá dòng giỏ: cùng món nhưng khác tuỳ chọn = 2 dòng khác nhau. */
export function lineKey(productId: string, opts: Pick<SelectedOption, 'group' | 'choice'>[]): string {
  const part = opts.map((o) => `${o.group}:${o.choice}`).sort().join(',');
  return part ? `${productId}|${part}` : productId;
}

/** "Size L · 50% đường · Trân châu đen" */
export const optionsLabel = (opts: Pick<SelectedOption, 'name'>[]) => opts.map((o) => o.name).join(' · ');

/**
 * Tính lại tuỳ chọn theo menu HIỆN TẠI (giá có thể đã đổi).
 * Trả về null nếu có lựa chọn không còn tồn tại (nhân viên đã xoá) hoặc bắt buộc mà thiếu.
 */
export function repriceOptions(p: Pick<Product, 'options'>, opts: Pick<SelectedOption, 'group' | 'choice'>[]): SelectedOption[] | null {
  const sel: Selection = {};
  for (const o of opts) {
    const g = p.options.find((x) => x.id === o.group);
    if (!g || !g.choices.some((c) => c.id === o.choice)) return null;
    (sel[g.id] ??= []).push(o.choice);
  }
  for (const g of p.options) if (!g.multi && (sel[g.id]?.length ?? 0) > 1) return null;
  if (missingRequired(p, sel).length) return null;
  return toSelectedOptions(p, sel);
}

// ---------- Bộ tuỳ chọn mẫu cho đồ uống (nhân viên bấm "Dùng mẫu" trong form món) ----------
const choice = (id: string, name: string, price = 0) => ({ id, name, price });

export const DRINK_PRESET: OptionGroup[] = [
  { id: 'size', name: 'Size', multi: false, required: true, choices: [choice('m', 'Size M'), choice('l', 'Size L', 6000)] },
  {
    id: 'sugar',
    name: 'Độ ngọt',
    multi: false,
    required: true,
    choices: [choice('100', '100% đường'), choice('70', '70% đường'), choice('50', '50% đường'), choice('30', '30% đường'), choice('0', 'Không đường')],
  },
  { id: 'ice', name: 'Đá', multi: false, required: true, choices: [choice('normal', 'Đá bình thường'), choice('less', 'Ít đá'), choice('none', 'Không đá')] },
  {
    id: 'topping',
    name: 'Topping',
    multi: true,
    required: false,
    choices: [choice('pearl', 'Trân châu đen', 5000), choice('jelly', 'Thạch dừa', 5000), choice('cheese', 'Kem cheese', 10000), choice('pudding', 'Pudding trứng', 7000)],
  },
];

export const SIZE_ONLY_PRESET: OptionGroup[] = [
  { id: 'size', name: 'Phần', multi: false, required: true, choices: [choice('s', 'Phần nhỏ'), choice('l', 'Phần lớn', 10000)] },
];

/** Sinh id ngắn cho nhóm / lựa chọn mới trong form. */
export const newOptionId = () => Math.random().toString(36).slice(2, 8);
