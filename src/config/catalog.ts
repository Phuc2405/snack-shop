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
  name: 'Con Nhà Bảy Food',
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

/**
 * Ảnh chụp thật từ Unsplash (giấy phép Unsplash: dùng miễn phí cho mục đích thương mại, không cần xin phép).
 * Nguồn từng ảnh: docs/CREDITS.md. Chỉ chọn ảnh KHÔNG có logo thương hiệu khác.
 * Hotlink qua CDN images.unsplash.com (đúng hướng dẫn của Unsplash) — ProductImage tự thêm kích thước + định dạng.
 */
const photo = (id: string) => `https://images.unsplash.com/${id}`;

export const HERO_PHOTO = photo('photo-1738212784974-b852a8c77277');

/** Menu mẫu — nhân viên bấm "Tạo menu mẫu" ở dashboard khi DB còn trống (và là dữ liệu của bản demo). */
export const SAMPLE_MENU: ProductInput[] = [
  { name: 'Trà sữa trân châu đường đen', description: 'Sữa tươi, trà đen ủ lạnh, trân châu nấu đường đen mỗi sáng.', price: 35000, category: 'drink', imageUrl: photo('photo-1525803377221-4f6ccdaa5133'), available: true, featured: true, sortOrder: 10, ...DRINK },
  { name: 'Trà đào cam sả', description: 'Trà xanh nhài, đào miếng giòn, cam tươi và sả thơm.', price: 32000, category: 'drink', imageUrl: photo('photo-1676693420436-7fa448f054eb'), available: true, featured: true, sortOrder: 20, ...DRINK },
  { name: 'Matcha latte kem muối', description: 'Matcha Nhật pha sữa tươi, phủ lớp kem muối béo nhẹ.', price: 39000, category: 'drink', imageUrl: photo('photo-1749280447307-31a68eb38673'), available: true, featured: false, sortOrder: 30, ...DRINK },
  { name: 'Nước ép dưa hấu', description: 'Ép tươi khi đặt, không thêm đường.', price: 29000, category: 'drink', imageUrl: photo('photo-1579503739626-d1cfa5cba7fa'), available: true, featured: false, sortOrder: 40, ...JUICE },
  { name: 'Bánh flan caramel', description: 'Mềm mịn, caramel đắng nhẹ, ăn kèm đá bào cà phê.', price: 18000, category: 'cake', imageUrl: photo('photo-1702728109878-c61a98d80491'), available: true, featured: true, sortOrder: 50, ...NO_OPTIONS },
  { name: 'Bông lan trứng muối', description: 'Bông lan mềm, sốt bơ trứng, chà bông và trứng muối.', price: 45000, category: 'cake', imageUrl: photo('photo-1675227977042-a572dac762be'), available: true, featured: false, sortOrder: 60, ...NO_OPTIONS },
  { name: 'Bánh su kem (hộp 6)', description: 'Vỏ giòn, nhân kem vani mát lạnh.', price: 30000, category: 'cake', imageUrl: photo('photo-1702234867439-bec43ed4e369'), available: false, featured: false, sortOrder: 70, ...NO_OPTIONS },
  { name: 'Khoai tây lắc phô mai', description: 'Khoai chiên giòn lắc bột phô mai, thêm tương ớt.', price: 30000, category: 'snack', imageUrl: photo('photo-1584378868074-1ebfd5a636c7'), available: true, featured: true, sortOrder: 80, ...SNACK_SIZE },
  { name: 'Bánh bèo chén (7 chén)', description: 'Bánh bèo mềm, tôm chấy, mỡ hành, chan nước mắm chua ngọt.', price: 25000, category: 'snack', imageUrl: photo('photo-1672858502422-ab27ac933910'), available: true, featured: false, sortOrder: 90, ...NO_OPTIONS },
  { name: 'Cá viên chiên (10 viên)', description: 'Cá viên, bò viên chiên vàng, chấm tương ngọt.', price: 25000, category: 'snack', imageUrl: photo('photo-1727303600939-b63d2ffc53d6'), available: true, featured: false, sortOrder: 100, ...SNACK_SIZE },
  { name: 'Combo Chill: 2 trà sữa + 1 khoai', description: '2 ly trà sữa + 1 phần khoai tây chiên giòn.', price: 89000, category: 'combo', imageUrl: `${photo('photo-1774896037291-e60d2cc5fedc')}?crop=bottom`, available: true, featured: true, sortOrder: 110, ...NO_OPTIONS },
  { name: 'Combo Ngọt ngào: trà đào + flan', description: '1 trà đào cam sả + 2 bánh flan caramel.', price: 59000, category: 'combo', imageUrl: photo('photo-1788016339171-dd7046a99cf2'), available: true, featured: false, sortOrder: 120, ...NO_OPTIONS },
];
