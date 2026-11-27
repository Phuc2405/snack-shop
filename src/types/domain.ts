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
  /**
   * Ẩn khỏi menu khách (rules chặn khách đọc món ẩn). Khác "tạm hết": món ẩn biến mất hẳn,
   * nhưng doc vẫn còn → đơn cũ (bản chụp tên + giá) và báo cáo không mất gì. Khác xoá: hiện lại được.
   */
  hidden: boolean;
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
  /**
   * Cách tính phí ship:
   *  - 'flat': đồng giá `deliveryFee` (freeship từ `freeShipFrom`) → biết tổng tiền ngay khi đặt.
   *  - 'driver': tiệm không thu phí ship; khách trả phí cho tài xế (Grab/Be/Ahamove) khi nhận.
   */
  shipFeeMode: ShipFeeMode;
  /** Đơn ship bắt buộc chuyển khoản trước (chống "bom hàng"). Cần đã khai báo tài khoản ngân hàng. */
  shipPrepaid: boolean;
}

export type ShipFeeMode = 'flat' | 'driver';

export type Fulfillment = 'delivery' | 'pickup';

export type OrderStatus = 'new' | 'confirmed' | 'preparing' | 'delivering' | 'done' | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  /** Đơn giá tại thời điểm đặt (snapshot) = giá món + giá các tuỳ chọn */
  price: number;
  qty: number;
  options: SelectedOption[];
  /** Ghi chú riêng cho món (có thể rỗng) */
  note: string;
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
  /** Đơn ship mà phí ship khách trả trực tiếp cho tài xế (deliveryFee = 0, không nằm trong total) */
  shipToDriver: boolean;
  cancelledBy?: 'customer' | 'shop';
  /** Lý do huỷ (id trong domain/cancelReasons.ts) — bắt buộc với đơn huỷ từ nay; đơn huỷ trước đó có thể trống */
  cancelReason?: string;
  /** Ghi chú khi huỷ (không bắt buộc, trừ lý do "other") */
  cancelNote?: string;
  staffNote?: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/** Một địa chỉ nhận hàng trong sổ địa chỉ của tài khoản khách */
export interface Address {
  id: string;
  /** Tên người nhận */
  name: string;
  phone: string;
  address: string;
}

/** Doc users/{uid}: dữ liệu riêng của tài khoản khách (chỉ chính chủ đọc/ghi) */
export interface UserDoc {
  addresses: Address[];
  defaultAddressId: string;
}

/** Tài khoản đang đăng nhập phía khách */
export interface Account {
  uid: string;
  email: string;
  /** Có doc staff/{uid} → hiện nút "Quản lý" (quyền thật vẫn do firestore.rules quyết) */
  isStaff: boolean;
}

export interface StaffProfile {
  uid: string;
  name: string;
  email: string;
}
