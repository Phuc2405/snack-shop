# Tài khoản test (chỉ trên máy, Firebase Emulator)

Các tài khoản này do `scripts/seed-emulator.mjs` tạo khi chạy `npm run dev:local`.
Chúng **chỉ tồn tại trong emulator trên máy bạn** (project `demo-snack-shop`), không có trên Firebase thật,
nên không phải mật khẩu thật và không cần giấu. Đừng dùng lại các mật khẩu này cho tài khoản thật.

| Vai trò | Email | Mật khẩu | Có sẵn gì |
|---|---|---|---|
| Quản lý tiệm | `admin@connhabay.test` | `Admin@2026` | Doc `staff/{uid}` → thấy nút **Quản lý**, vào `/admin` |
| Khách 1 | `khach1@connhabay.test` | `Khach@2026` | 2 địa chỉ (nhà, công ty), 2 đơn (1 xong, 1 mới) |
| Khách 2 | `khach2@connhabay.test` | `Khach@2026` | 1 địa chỉ, 1 đơn đang làm |
| Khách 3 | `khach3@connhabay.test` | `Khach@2026` | Tài khoản mới: chưa có địa chỉ, chưa có đơn |

Menu mẫu có 13 món, trong đó **1 món đang ẩn** ("Trà sữa bí đỏ"), để test Ẩn/Hiện.

## Kịch bản test nhanh

1. **Khách vãng lai**: mở http://localhost:5173, đặt món không cần đăng nhập (tự nhập tên, SĐT, địa chỉ).
2. **Đăng nhập khách 1** → trang Đặt món tự chọn sẵn địa chỉ mặc định; bấm địa chỉ khác để đổi người nhận.
3. **Khách 3** → lần đầu đặt ship: nhập người nhận, để tick "Lưu vào sổ địa chỉ" → lần sau có sẵn.
4. **Tạo tài khoản mới**: Đăng nhập → Tạo tài khoản (email bất kỳ dạng `ten@vidu.test`, mật khẩu ≥ 8 ký tự có chữ và số).
5. **Quên mật khẩu**: Đăng nhập → Quên mật khẩu → nhập email. Emulator không gửi email thật, nên
   màn hình hiện link "Chế độ test" để mở trang đặt mật khẩu mới.
6. **Admin**: đăng nhập `admin@…` ở trang khách → nút **Quản lý** trên header → Đơn hàng (đổi trạng thái),
   Món ăn (Tạm hết / Ẩn / Hiện / Thêm / Xoá), Cài đặt tiệm (cách tính phí ship, bắt chuyển khoản trước).
7. **Ẩn món**: Admin bấm "Ẩn" một món → tab khách tải lại không còn thấy món đó; đơn cũ có món đó vẫn hiện đủ.

## Trên Firebase thật

Không có tài khoản test sẵn. Tạo tài khoản bằng nút "Tạo tài khoản" trên trang bán hàng, rồi cấp quyền
quản lý theo [DATABASE.md](DATABASE.md#thêm-nhân-viên-quản-lý).
