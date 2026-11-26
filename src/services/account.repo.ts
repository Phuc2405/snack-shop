import type { CartLine } from '@/domain/cart';

/**
 * Tài khoản khách (bản xem thử): lưu trên chính máy khách (localStorage), không gửi đi đâu.
 * Định danh = số điện thoại đăng nhập. Mỗi tài khoản có sổ "thông tin người đặt" (tên – SĐT – địa chỉ)
 * và giỏ hàng riêng. Bản chạy Firebase thật nên thay bằng Firebase Auth (SĐT + OTP) — xem docs/ROADMAP.md.
 */

export interface Profile {
  id: string;
  name: string;
  phone: string;
  address: string;
}

export interface AccountRecord {
  phone: string;
  profiles: Profile[];
  activeId: string;
  cart: CartLine[];
}

const KEY = 'nb-accounts';
export const MAX_PROFILES = 5;

function readAll(): Record<string, AccountRecord> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

export const accountRepo = {
  get(phone: string): AccountRecord | null {
    return readAll()[phone] ?? null;
  },
  save(rec: AccountRecord) {
    const all = readAll();
    all[rec.phone] = rec;
    localStorage.setItem(KEY, JSON.stringify(all));
  },
};
