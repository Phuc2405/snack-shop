# Bảo mật: tóm tắt

Checklist đầy đủ và cách kiểm tra: [`.claude/skills/security-hardening/SKILL.md`](../.claude/skills/security-hardening/SKILL.md).

## Mô hình
Không có server riêng. **`firestore.rules` là backend**: mọi quyền và mọi ràng buộc dữ liệu được kiểm tra ở đó, có 48 test tấn công
(`npm run test:rules`). Client validate (zod) chỉ để báo lỗi sớm cho người dùng.

## Đã làm

| Mối đe doạ | Biện pháp | Test |
|---|---|---|
| Sửa giá / tổng tiền | Rules: `total == subtotal + deliveryFee`, phí ship khớp cấu hình, whitelist field; dashboard đối chiếu giá từng món với menu | rules + `auditOrder` |
| Tự đánh dấu "đã trả tiền", chọn chuyển khoản khi tiệm chưa có tài khoản, né/ăn gian freeship | Rules: `paid == false` khi tạo, chỉ staff đổi `paid`; phí ship tính lại theo `freeShipFrom` trong rules | rules |
| Sửa giá topping / tuỳ chọn giả | Dashboard tính lại đơn giá từ menu (`repriceOptions`), cảnh báo `unknown_option` / `price_differs` | unit |
| Tự đặt trạng thái "đã xong", sửa đơn người khác | Rules: đơn mới phải `new`, `customerUid == auth.uid`, máy trạng thái | rules |
| Tự cấp quyền quản lý | `staff/{uid}` chỉ tạo trong Console; tài khoản ẩn danh không bao giờ là staff | rules |
| Spam đơn | 1 đơn / 60s / người (throttle trong cùng batch); App Check (khi bật) | rules |
| Đọc dữ liệu hàng loạt / hoá đơn tăng vọt | Truy vấn bắt buộc `limit`, cache SWR, poll chỉ khi tab hiển thị | rules |
| XSS | React escape, không `innerHTML`; `cleanText` bỏ thẻ HTML; link ảnh chỉ `https://`; CSP chặt | unit |
| Clickjacking, MIME sniffing, rò rỉ referrer | `X-Frame-Options`, `frame-ancestors`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP, HSTS | preview headers |
| Lộ secret | `.env` git-ignore, `check:secrets` trong CI, không có service account trong repo | CI |
| Zombie API | Deny-by-default; chỉ 5 collection; không có Cloud Function/endpoint riêng | rules |
| Open redirect | Trang login chỉ quay về `/admin…` | code |

## Giới hạn đã biết (chấp nhận ở gói miễn phí)
- **Giá từng món** không kiểm được trong rules (rules không lặp mảng). Đơn bị sửa giá vẫn tạo được nhưng dashboard hiện **cảnh báo đỏ**
  trước khi nhân viên nhận đơn. Khắc phục triệt để: Cloud Function (gói Blaze) tính lại giá.
- Khách xoá dữ liệu trình duyệt sẽ có uid ẩn danh mới → mất danh sách "Đơn của tôi" trên máy đó (đơn vẫn còn ở tiệm).
- Chuyển khoản VietQR: hệ thống **không tự biết** tiền đã về (cần nối API ngân hàng / cổng thanh toán). Nhân viên đối chiếu sao kê
  rồi bấm "Đã nhận tiền"; badge "CK · chưa nhận tiền" nhắc không giao món trước khi kiểm tra.
- ~~Nhân viên đăng nhập cùng trình duyệt làm mất phiên khách~~ → **đã sửa** (2 Firebase app instance tách phiên, xem `lib/firebase.ts`).
- Phiên khách ẩn danh "chết" (tài khoản bị dọn / vô hiệu hoá) → app tự tạo phiên mới thay vì kẹt lỗi (`auth.service.ensureGuest`).
- Firebase Hosting Emulator không áp `headers` → kiểm tra header bằng `npm run preview` (cùng cấu hình) và `curl -I` sau deploy thật.

## Việc chủ tiệm cần làm trên Console (không làm được từ code)
1. Bật **App Check** (reCAPTCHA v3) → điền `VITE_APPCHECK_SITE_KEY` → sau vài ngày bấm **Enforce**.
2. Google Cloud Console → Credentials → **giới hạn API key** theo domain của tiệm.
3. Authentication → Settings → bật **Email enumeration protection**; Sign-in method chỉ bật Email/Password + Anonymous.
4. Nếu lên gói Blaze: đặt **Budget alert**.
