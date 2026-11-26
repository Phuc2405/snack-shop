/**
 * Làm sạch chữ người dùng nhập (tên, ghi chú, mô tả món…).
 * React đã tự escape khi hiển thị nên đây là lớp phòng thủ THỨ HAI: dữ liệu trong DB sạch luôn,
 * an toàn cả khi sau này ai đó đem ra dùng ở nơi không escape (email, Excel, bản in…).
 *  - bỏ nguyên thẻ HTML (<b>, <script …>) thay vì chỉ bỏ dấu < >
 *  - bỏ ký tự điều khiển, gom khoảng trắng thừa
 *  - chặn "công thức" Excel/CSV injection ở đầu chuỗi (=, +, -, @) khi xuất file
 */
export function cleanText(s: string): string {
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
    .replace(/^[=+\-@]+/, '')
    .trim();
}
