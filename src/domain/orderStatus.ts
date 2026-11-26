import type { Fulfillment, OrderStatus } from '@/types/domain';

/**
 * Máy trạng thái đơn hàng (State Machine pattern).
 * PHẢI giống hàm nextStatuses() trong firestore.rules — test `orderStatus.test.ts` giữ hai nơi khớp nhau.
 *
 *   new → confirmed → preparing → delivering → done
 *    └──────┴────────────┴────────────┴──→ cancelled
 */
export const NEXT_STATUSES: Record<OrderStatus, readonly OrderStatus[]> = {
  new: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['delivering', 'cancelled'],
  delivering: ['done', 'cancelled'],
  done: [],
  cancelled: [],
};

export const ACTIVE_STATUSES: readonly OrderStatus[] = ['new', 'confirmed', 'preparing', 'delivering'];

export const canTransition = (from: OrderStatus, to: OrderStatus) => NEXT_STATUSES[from].includes(to);

/** Bước "tiến lên" tiếp theo (bỏ qua huỷ) — dùng cho nút hành động chính ở dashboard. */
export const nextForwardStatus = (from: OrderStatus): OrderStatus | null =>
  NEXT_STATUSES[from].find((s) => s !== 'cancelled') ?? null;

export const isFinal = (s: OrderStatus) => NEXT_STATUSES[s].length === 0;

export function statusLabel(s: OrderStatus, f: Fulfillment = 'delivery'): string {
  if (s === 'delivering') return f === 'pickup' ? 'Chờ khách lấy' : 'Đang giao';
  return STATUS_LABEL[s];
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  new: 'Đơn mới',
  confirmed: 'Đã nhận đơn',
  preparing: 'Đang làm',
  delivering: 'Đang giao',
  done: 'Hoàn tất',
  cancelled: 'Đã huỷ',
};

/** Nhãn nút cho nhân viên: bấm để chuyển sang trạng thái `to`. */
export function actionLabel(to: OrderStatus, f: Fulfillment): string {
  switch (to) {
    case 'confirmed':
      return 'Nhận đơn';
    case 'preparing':
      return 'Bắt đầu làm';
    case 'delivering':
      return f === 'pickup' ? 'Đã xong, chờ lấy' : 'Giao hàng';
    case 'done':
      return 'Hoàn tất';
    case 'cancelled':
      return 'Huỷ đơn';
    default:
      return statusLabel(to, f);
  }
}

/** Các bước hiển thị trên thanh tiến trình cho khách. */
export const PROGRESS_STEPS: readonly OrderStatus[] = ['new', 'confirmed', 'preparing', 'delivering', 'done'];
