/**
 * Kiểu dữ liệu domain — khớp 1-1 với các collection Firestore (xem docs/DATABASE.md
 * và firestore.rules). Ngày giờ ở domain luôn là `Date` (repository tự chuyển từ Timestamp).
 */

export type Category = 'drink' | 'cake' | 'snack' | 'combo';

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
  minOrder: number;
  announcement: string;
}

export type Fulfillment = 'delivery' | 'pickup';

export type OrderStatus = 'new' | 'confirmed' | 'preparing' | 'delivering' | 'done' | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  /** Giá tại thời điểm đặt (snapshot) */
  price: number;
  qty: number;
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
