import { useRef } from 'react';

/**
 * Giữ giá trị khác null gần nhất. Dùng cho hộp thoại: khi đóng, dữ liệu nguồn về null ngay
 * nhưng hộp còn chạy hiệu ứng đóng ~0,2s → vẫn vẽ nội dung cũ thay vì một hộp trống.
 */
export function useLastValue<T>(value: T | null | undefined): T | null {
  const ref = useRef<T | null>(value ?? null);
  if (value != null) ref.current = value;
  return ref.current;
}
