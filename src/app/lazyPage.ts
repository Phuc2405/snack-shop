import { lazy, type ComponentType } from 'react';

const FLAG = 'nb-chunk-reload';

/**
 * lazy() có "cứu hộ": sau mỗi lần deploy, file JS cũ bị xoá khỏi hosting. Tab nào đang mở bản cũ
 * mà chuyển trang sẽ tải chunk lỗi 404 → thay vì màn hình trắng, tự tải lại trang MỘT lần.
 */
export function lazyPage<T extends ComponentType<object>>(load: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const mod = await load();
      sessionStorage.removeItem(FLAG);
      return mod;
    } catch (err) {
      if (!sessionStorage.getItem(FLAG)) {
        sessionStorage.setItem(FLAG, '1');
        window.location.reload();
        return new Promise<{ default: T }>(() => {}); // chờ reload
      }
      throw err;
    }
  });
}
