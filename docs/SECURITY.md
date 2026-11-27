# Bảo mật: tóm tắt

Checklist đầy đủ và cách kiểm tra: [`.claude/skills/security-hardening/SKILL.md`](../.claude/skills/security-hardening/SKILL.md).

## Mô hình
Không có server riêng. **`firestore.rules` là backend** (tương đương RLS của Supabase): mọi quyền và mọi ràng buộc dữ liệu được kiểm tra ở đó,
có 62 test tấn công (`npm run test:rules`). Client validate (zod) chỉ để báo lỗi sớm cho người dùng.

## Kiểm tra tự động
| Lệnh | Kiểm gì |
|---|---|
| `npm run check:secrets` | Secret trong file sẽ commit: khoá PEM, service account, API key, token GitHub/Slack/Stripe/AWS, JWT, mật khẩu gắn cứng, file `.env` |
| `npm run check:security` | **Cấu hình**: đủ header bảo mật + CSP chặt (không `unsafe-eval`, không `*`), CSP Firebase = Vercel; rules không có `if true` khi ghi, không wildcard `{x=**}`, mọi `list` có `limit`, `staff`/`users` khoá đúng; bản build không có source map, không code/địa chỉ emulator, không tài khoản test, không khoá bí mật, không script inline, có `robots.txt`; `.gitignore` chặn `.env` / service account |
| `npm run test:rules` | 62 ca tấn công vào rules trên emulator (đọc trộm, leo thang quyền, sửa giá, spam đơn, món ẩn, sổ địa chỉ người khác…) |
| `npm test` | Validate, sanitize, máy trạng thái, phí ship / cách thanh toán **khớp rules** |

`npm run check` chạy cả `check:secrets` + `check:security` (CI chạy mỗi lần push).

## Đã làm

| Mối đe doạ | Biện pháp | Test |
|---|---|---|
| Sửa giá / tổng tiền | Rules: `total == subtotal + deliveryFee`, phí ship khớp cấu hình (đồng giá / trả tài xế / freeship), whitelist field; dashboard đối chiếu giá từng món | rules + `auditOrder` |
| Tự đánh dấu "đã trả tiền", né "bắt chuyển khoản trước" | Rules: `paid == false` khi tạo; `shipPrepaid` → đơn ship phải `transfer`; `shipToDriver` khớp cấu hình | rules |
| Tự cấp quyền quản lý | `staff/{uid}` chỉ tạo trong Console; **khách có tài khoản email vẫn không phải staff** nếu không có doc staff | rules |
| Đọc / sửa sổ địa chỉ người khác | `users/{uid}`: chỉ chính chủ (token email, không ẩn danh), whitelist field, kiểm từng địa chỉ (≤ 5), nhân viên cũng không đọc | rules |
| Xem món đã ẩn qua API | Rules: khách chỉ `get` món `hidden == false`, `list` phải lọc `hidden` | rules |
| Spam đơn | 1 đơn / 60s / người (throttle trong cùng batch); App Check (khi bật) | rules |
| Dò mật khẩu / dò email | Firebase Auth tự khoá khi sai nhiều (`too-many-requests`); thông báo lỗi chung "Email hoặc mật khẩu không đúng"; quên mật khẩu luôn báo "nếu email đã đăng ký…" | code |
| Mật khẩu yếu | Tối thiểu 8 ký tự, có chữ và số (form); bật thêm Password policy trên Console (mục dưới) | unit |
| Đọc dữ liệu hàng loạt / hoá đơn tăng vọt (denial of wallet) | Truy vấn bắt buộc `limit`, cache SWR, poll chỉ khi tab hiển thị | rules + check:security |
| XSS | React escape, không `innerHTML`/`eval`; `cleanText` bỏ thẻ HTML; link ảnh chỉ `https://`; CSP chặt, không script inline | unit + check:security |
| NoSQL injection | Không ghép chuỗi người dùng vào đường dẫn; rules ép kiểu + độ dài từng field | rules |
| Clickjacking, MIME sniffing, rò rỉ referrer | `X-Frame-Options`, `frame-ancestors`, `nosniff`, `Referrer-Policy` (mã đặt lại mật khẩu trong URL không lọt sang site khác), `Permissions-Policy`, COOP, HSTS | check:security |
| Lộ secret / cấu hình | `.env` git-ignore, `check:secrets`; bản build không source map, không code emulator (`lib/firebase.ts` đọc thẳng `import.meta.env.VITE_*` để bị xoá khi build) | check:security |
| Tài khoản test lọt lên web thật | Chỉ nằm trong `scripts/seed-emulator.mjs` (emulator `demo-…`), `check:security` cấm xuất hiện trong bản build | check:security |
| Zombie API | Deny-by-default; chỉ 6 collection (products, settings, orders, throttle, staff, users); không có Cloud Function/endpoint riêng | rules |
| Open redirect | Login quản lý chỉ quay về `/admin…`; trang `/auth/action` không dùng `continueUrl` | code |
| Máy dùng chung (quầy) | Đăng xuất khách → giỏ cất vào tài khoản, máy về giỏ trống; "Thoát" ở trang quản lý đăng xuất cả phiên khách cùng tài khoản | code |
| SEO lộ trang nội bộ | `robots.txt` chặn `/admin`, `/checkout`, `/orders`, `/auth`; `sitemap.xml` chỉ có trang menu (cần `SITE_URL` khi build) | check:security |

### CORS
Web là SPA tĩnh, **không có API riêng** nên không có gì để cấu hình CORS. Firestore/Auth là API của Google: bảo vệ bằng **rules + token + App Check**,
không phải CORS (ai cũng gọi được API bằng script, CORS chỉ là luật của trình duyệt). Vercel tự thêm `Access-Control-Allow-Origin: *` cho file tĩnh
công khai: vô hại (trang menu vốn công khai). Nếu sau này thêm Cloud Function HTTP: chỉ cho đúng tên miền của tiệm, ưu tiên Callable Function.

### DDoS / DoS
Firebase Hosting / Vercel đứng sau CDN (hấp thụ tấn công tầng mạng). Rủi ro thật là **hoá đơn** khi bị gọi Firestore liên tục:
gói Spark (miễn phí) hết quota thì dừng, không tính tiền; lên Blaze **bắt buộc** đặt Budget alert. App Check enforce chặn bot không chạy trong trang thật.

## Giới hạn đã biết
- **Từng dòng món** (giá, tuỳ chọn, số lượng, độ dài tên / ghi chú) và tổng các dòng (tạm tính, số món) không kiểm được trong rules:
  rules không lặp mảng, và kiểm theo vị trí 0..29 vượt giới hạn 1000 biểu thức / request (đo 2026-11-27: chỉ kiểm số lượng đã hỏng
  từ ~18 dòng). Đơn bị sửa vẫn tạo được nhưng dashboard hiện **cảnh báo đỏ** (`auditOrder`: sai giá, số lượng âm / lẻ / quá 20,
  số món sai, chữ quá dài) trước khi nhân viên nhận đơn. Khắc phục triệt để: Cloud Function (gói Blaze) tính lại đơn,
  hoặc giảm số dòng tối đa (khoảng 10) để rules kiểm được từng dòng.
- Kẻ xấu tạo nhiều tài khoản / phiên ẩn danh để lách giới hạn 1 đơn/phút → giới hạn tạo tài khoản theo IP của Firebase + App Check.
- Sổ địa chỉ: chính chủ ghi liên tục được (Firestore tự giới hạn ~1 lần ghi/giây/doc; mỗi doc ≤ 5 địa chỉ ngắn).
- `npm audit`: 4 cảnh báo "high" về `@grpc/grpc-js@1.9` nằm trong **bản Node** của Firestore SDK (chỉ dùng cho script seed/test trên máy);
  web chạy trên trình duyệt không dùng gói này. `npm audit fix --force` sẽ hạ Firebase về bản 9 cũ → không làm; chờ Firebase cập nhật.
- Chuyển khoản VietQR: hệ thống **không tự biết** tiền đã về. Nhân viên đối chiếu sao kê rồi bấm "Đã nhận tiền".
- Firebase Hosting Emulator không áp `headers` → kiểm bằng `npm run preview` và `curl -I` sau deploy thật.

## Việc chủ tiệm cần làm trên Console (không làm được từ code)
1. **Authentication → Sign-in method**: bật **Email/Password** + **Anonymous** (khách vãng lai), tắt mọi cách khác.
2. **Authentication → Settings**:
   - bật **Email enumeration protection** (mặc định bật ở project mới);
   - **Password policy**: tối thiểu 8 ký tự, bắt buộc chữ + số, chọn *Require enforcement*;
   - **Authorized domains**: chỉ để tên miền của tiệm (xoá tên miền thử nghiệm không dùng).
3. **Authentication → Templates → Password reset**: đổi ngôn ngữ **Tiếng Việt**, bấm *Customize action URL* = `https://<tên-miền>/auth/action`
   (link trong email mở trang đặt mật khẩu mới của web thay vì trang mặc định của Firebase).
4. Bật **App Check** (reCAPTCHA v3) → điền `VITE_APPCHECK_SITE_KEY` → sau vài ngày bấm **Enforce** cho Firestore **và Authentication**.
5. Google Cloud Console → Credentials → **giới hạn API key** theo tên miền của tiệm (HTTP referrer) và chỉ các API Firebase.
6. Build có `SITE_URL=https://<tên-miền>` trong `.env` để có `sitemap.xml`; sau deploy gửi sitemap trong Google Search Console.
7. Nếu lên gói Blaze: đặt **Budget alert**.
