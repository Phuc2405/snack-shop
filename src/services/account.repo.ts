import type { CartLine } from '@/domain/cart';

/**
 * Giỏ hàng riêng của từng tài khoản trên máy này (localStorage, theo uid).
 * Đăng xuất → cất giỏ vào đây, máy về giỏ trống; đăng nhập lại → lấy ra gộp với giỏ đang chọn.
 * (Sổ địa chỉ thì lưu trên Firestore users/{uid} — xem customer.service.ts — nên theo tài khoản sang máy khác.)
 */
const KEY = 'nb-account-carts';

function readAll(): Record<string, CartLine[]> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

export const accountCartRepo = {
  get(uid: string): CartLine[] {
    const lines = readAll()[uid];
    return Array.isArray(lines) ? lines : [];
  },
  save(uid: string, lines: CartLine[]) {
    try {
      const all = readAll();
      all[uid] = lines;
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch {
      /* hết dung lượng / chế độ riêng tư — bỏ qua */
    }
  },
};
