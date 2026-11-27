import type { ShopSettings } from '@/types/domain';

/**
 * Chế độ DEMO (bản xem thử trên Vercel, chưa nối Firebase): `vite build --mode demo` (file .env.demo).
 * Menu = SAMPLE_MENU, cấu hình = DEMO_SETTINGS, đơn hàng lưu trong localStorage của chính khách
 * và trạng thái tự chạy theo thời gian (services/demo.repo.ts). Không có trang quản lý, không gọi mạng nào
 * ngoài ảnh. Giao diện y hệt bản thật vì UI chỉ nói chuyện với services/ (Repository pattern).
 */
// trim(): biến dán qua PowerShell có thể dính BOM (U+FEFF) vô hình → 'true' không khớp
export const DEMO = String(import.meta.env.VITE_DEMO_MODE ?? '').trim() === 'true';

export const DEMO_SETTINGS: ShopSettings = {
  name: 'Con Nhà Bảy Food',
  tagline: 'Trà sữa mát lạnh, bánh ngọt và đồ ăn vặt làm mới mỗi ngày',
  // Không để số điện thoại / địa chỉ thật trên bản demo công khai
  hotline: '',
  address: 'Địa chỉ mẫu (bản demo)',
  openHours: '8:00 – 22:00 hằng ngày',
  isOpen: true,
  deliveryFee: 15000,
  freeShipFrom: 100000,
  minOrder: 0,
  // Dải thông báo trùng với dải 'Bản xem thử' → để trống, freeship đã hiện trong giỏ
  announcement: '',
  // Tài khoản GIẢ (toàn số 0) — QR trên bản demo còn bị làm mờ, xem PaymentQR
  bankBin: '970436',
  bankAccount: '0000000000',
  bankAccountName: 'BAN DEMO',
  shipFeeMode: 'flat',
  shipPrepaid: false,
};
