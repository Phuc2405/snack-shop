/**
 * Kiểu dữ liệu domain — khớp 1-1 với các collection Firestore (xem docs/DATABASE.md
 * và firestore.rules). Ngày giờ ở domain luôn là `Date` (repository tự chuyển từ Timestamp).
 */

export type Category = 'drink' | 'cake' | 'snack' | 'combo';

/** Một lựa chọn trong nhóm tuỳ chọn, vd "Size L" (+6.000đ), "50% đường" (+0đ) */
export interface OptionChoice {
  id: string;
  name: string;
  /** Giá cộng thêm (VND, ≥ 0) */
  price: number;
}

/** Nhóm tuỳ chọn của món, vd "Size" (chọn 1, bắt buộc), "Topping" (chọn nhiều, không bắt buộc) */
export interface OptionGroup {
  id: string;
  name: string;
  /** true = chọn nhiều (topping), false = chọn đúng 1 (size, đường, đá) */
  multi: boolean;
  required: boolean;
  choices: OptionChoice[];
}

/** Tuỳ chọn khách đã chọn — lưu bản chụp tên + giá vào đơn */
export interface SelectedOption {
  group: string;
  choice: string;
  name: string;
  price: number;
}

export type PaymentMethod = 'cod' | 'transfer';

export interface Product {
  id: string;
  name: string;
  description: string;
  /** Giá VND, số nguyên */
  price: number;
  category: Category;
  /** Ảnh https (để trống thì hiện hình minh hoạ theo danh mục) */
  imageUrl: string;
  /** Còn bán hay tạm hết */
  available: boolean;
  /** Hiện ở mục "Món nổi bật" */
  featured: boolean;
  /** Thứ tự hiển thị, nhỏ đứng trước */
  sortOrder: number;
  /** Nhóm tuỳ chọn (size, đường, đá, topping…). Rỗng = món không có tuỳ chọn */
  options: OptionGroup[];
  updatedAt: Date | null;
}

export type ProductInput = Omit<Product, 'id' | 'updatedAt'>;

export interface ShopSettings {
  name: string;
  tagline: string;
  hotline: string;
  address: string;
  openHours: string;
  /** Tắt = khách không đặt được (rules cũng chặn) */
  isOpen: boolean;
  deliveryFee: number;
  /** Đơn từ mức này được miễn phí ship (0 = không áp dụng) */
  freeShipFrom: number;
  minOrder: number;
  announcement: string;
  /** Chuyển khoản VietQR — để trống số tài khoản = chỉ nhận tiền mặt */
  bankBin: string;
  bankAccount: string;
  bankAccountName: string;
}

export type Fulfillment = 'delivery' | 'pickup';

export type OrderStatus = 'new' | 'confirmed' | 'preparing' | 'delivering' | 'done' | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  /** Đơn giá tại thời điểm đặt (snapshot) = giá món + giá các tuỳ chọn */
  price: number;
  qty: number;
  options: SelectedOption[];
}

export interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
  note: string;
}

export interface Order {
  id: string;
  code: string;
  customerUid: string;
  customer: CustomerInfo;
  fulfillment: Fulfillment;
  items: OrderItem[];
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  /** Nhân viên xác nhận đã nhận tiền (chuyển khoản / tiền mặt) */
  paid: boolean;
  cancelledBy?: 'customer' | 'shop';
  staffNote?: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface StaffProfile {
  uid: string;
  name: string;
  email: string;
}
