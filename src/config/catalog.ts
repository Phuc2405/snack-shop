import type { Category, ProductInput, ShopSettings } from '@/types/domain';
import { DRINK_PRESET, SIZE_ONLY_PRESET } from '@/domain/options';

/** Danh mục: nhãn + màu nền khối (pastel) dùng chung cho thẻ món, chip lọc, hình minh hoạ. */
export const CATEGORIES: Record<Category, { label: string; plural: string; bg: string; accent: string }> = {
  drink: { label: 'Đồ uống', plural: 'Trà sữa & nước', bg: 'bg-sky-soft', accent: 'bg-sky' },
  cake: { label: 'Bánh ngọt', plural: 'Bánh ngọt', bg: 'bg-berry-soft', accent: 'bg-berry' },
  snack: { label: 'Ăn vặt', plural: 'Đồ ăn vặt', bg: 'bg-lemon-soft', accent: 'bg-lemon' },
  combo: { label: 'Combo', plural: 'Combo tiết kiệm', bg: 'bg-mint-soft', accent: 'bg-mint' },
};

export const CATEGORY_ORDER: Category[] = ['drink', 'cake', 'snack', 'combo'];

/** Giá trị mặc định khi chưa có doc settings/shop (hoặc chưa kết nối Firebase). */
export const DEFAULT_SETTINGS: ShopSettings = {
  name: 'Tiệm Ăn Vặt Nhà Bông',
  tagline: 'Trà sữa mát lạnh, bánh ngọt mỗi ngày',
  hotline: '',
  address: '',
  openHours: '8:00 – 22:00 hằng ngày',
  isOpen: false,
  deliveryFee: 15000,
  freeShipFrom: 0,
  minOrder: 0,
  announcement: '',
  bankBin: '',
  bankAccount: '',
  bankAccountName: '',
};

const NO_OPTIONS = { options: [] };
const DRINK = { options: DRINK_PRESET };
const JUICE = { options: DRINK_PRESET.filter((g) => g.id !== 'topping') };
const SNACK_SIZE = { options: SIZE_ONLY_PRESET };

/** Menu mẫu — nhân viên bấm "Tạo menu mẫu" ở dashboard khi DB còn trống. */
export const SAMPLE_MENU: ProductInput[] = [
  { name: 'Trà sữa trân châu đường đen', description: 'Sữa tươi, trà đen ủ lạnh, trân châu nấu đường đen mỗi sáng.', price: 35000, category: 'drink', imageUrl: '', available: true, featured: true, sortOrder: 10, ...DRINK },
  { name: 'Trà đào cam sả', description: 'Trà xanh nhài, đào miếng giòn, cam tươi và sả thơm.', price: 32000, category: 'drink', imageUrl: '', available: true, featured: true, sortOrder: 20, ...DRINK },
  { name: 'Matcha latte kem muối', description: 'Matcha Nhật pha sữa tươi, phủ lớp kem muối béo nhẹ.', price: 39000, category: 'drink', imageUrl: '', available: true, featured: false, sortOrder: 30, ...DRINK },
  { name: 'Nước ép dưa hấu', description: 'Ép tươi khi đặt, không thêm đường.', price: 29000, category: 'drink', imageUrl: '', available: true, featured: false, sortOrder: 40, ...JUICE },
  { name: 'Bánh flan caramel', description: 'Mềm mịn, caramel đắng nhẹ, ăn kèm đá bào cà phê.', price: 18000, category: 'cake', imageUrl: '', available: true, featured: true, sortOrder: 50, ...NO_OPTIONS },
  { name: 'Bông lan trứng muối', description: 'Bông lan mềm, sốt bơ trứng, chà bông và trứng muối.', price: 45000, category: 'cake', imageUrl: '', available: true, featured: false, sortOrder: 60, ...NO_OPTIONS },
  { name: 'Bánh su kem (hộp 6)', description: 'Vỏ giòn, nhân kem vani mát lạnh.', price: 30000, category: 'cake', imageUrl: '', available: false, featured: false, sortOrder: 70, ...NO_OPTIONS },
  { name: 'Khoai tây lắc phô mai', description: 'Khoai chiên giòn lắc bột phô mai, thêm tương ớt.', price: 30000, category: 'snack', imageUrl: '', available: true, featured: true, sortOrder: 80, ...SNACK_SIZE },
  { name: 'Bánh tráng trộn', description: 'Bánh tráng, xoài, trứng cút, khô bò, rau răm, sốt me.', price: 25000, category: 'snack', imageUrl: '', available: true, featured: false, sortOrder: 90, ...NO_OPTIONS },
  { name: 'Cá viên chiên (10 viên)', description: 'Cá viên, bò viên chiên vàng, chấm tương ngọt.', price: 25000, category: 'snack', imageUrl: '', available: true, featured: false, sortOrder: 100, ...SNACK_SIZE },
  { name: 'Combo Chill: 2 trà sữa + 1 khoai', description: '2 trà sữa trân châu + 1 khoai tây lắc phô mai.', price: 89000, category: 'combo', imageUrl: '', available: true, featured: true, sortOrder: 110, ...NO_OPTIONS },
  { name: 'Combo Ngọt ngào: trà đào + flan', description: '1 trà đào cam sả + 2 bánh flan caramel.', price: 59000, category: 'combo', imageUrl: '', available: true, featured: false, sortOrder: 120, ...NO_OPTIONS },
];
