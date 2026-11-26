---
name: security-hardening
description: Checklist bảo mật cho Snack Shop (React SPA + Firebase Auth/Firestore/Hosting) và web app tương tự — chống DDoS / "denial of wallet", rate limiting, XSS / injection, CORS, CSP & security headers, không để secret hay cấu hình database trong code, dọn zombie API (collection/route/endpoint bỏ quên), Firestore Security Rules, App Check. Dùng khi người dùng nói "check bảo mật", "security", "DDoS", "rate limit", "spam đơn", "XSS", "injection", "CORS", "lộ key", "zombie API", "rules Firestore", hoặc trước khi deploy thay đổi về dữ liệu/quyền/header.
---

# Security hardening (Firebase SPA)

**Nguyên tắc:** trình duyệt là nơi kẻ tấn công kiểm soát hoàn toàn. Mọi kiểm tra ở client chỉ để tiện cho người dùng;
**quyền thật nằm ở `firestore.rules`**. Ai cũng có thể lấy config Firebase trong bundle và gọi thẳng Firestore với payload bất kỳ.
Mỗi lỗ hổng sửa xong phải có **test chặn lại** (`tests/rules/*.test.mjs` hoặc `src/**/*.test.ts`).

## Lệnh kiểm tra nhanh
```bash
npm run check:secrets   # quét secret trong file sẽ commit
npm run test:rules      # 39+ ca tấn công vào rules trên emulator (cần Java 11+)
npm test                # unit: validate, sanitize, state machine, khớp rules ↔ code
npm run build && npm run preview   # preview gửi CÙNG header CSP như Firebase Hosting → lỗi CSP hiện trong console
```

## 1. Firestore Security Rules (quan trọng nhất)
- **Deny by default**: chỉ collection khai báo mới truy cập được (products, settings, orders, throttle, staff). Collection lạ
  (users, debug, reviews…) bị từ chối — có test "collection không khai báo bị chặn hoàn toàn".
- **Whitelist field**: `keys().hasOnly([...])` + `hasAll` cho mọi lần ghi → không nhét được field lạ (`paid: true`, `isAdmin`).
- **Kiểu & độ dài**: `isStr(v, min, max)`, `isInt`, regex số điện thoại, `imageUrl` chỉ `https://` không có `"<>` → chặn `javascript:`.
- **Thời gian do server quyết**: `createdAt == request.time` (client không giả mạo giờ).
- **Quyền staff**: phải đăng nhập email (không phải ẩn danh) **và** có doc `staff/{uid}` — doc này chỉ tạo trong Console (`allow write: if false`).
- **Máy trạng thái đơn** trong rules (`nextStatuses()`) giống `src/domain/orderStatus.ts` — unit test so khớp hai nơi.
- **Không tin giá từ client**: rules kiểm `total == subtotal + deliveryFee`, phí ship khớp `settings/shop`, tiệm đang mở, đơn tối thiểu.
  Rules KHÔNG lặp được qua mảng món → giá từng món được dashboard đối chiếu menu (`auditOrder`) và cảnh báo đỏ.
  Muốn chặn tuyệt đối: Cloud Function `onCreate` tính lại giá (cần gói Blaze) — xem docs/SECURITY.md.
- **Đọc có giới hạn**: `allow list: if request.query.limit <= N` → không ai đọc cả collection một lần.
- Sửa rules → thêm ca test tấn công tương ứng → `npm run test:rules` xanh → mới deploy (`firebase deploy --only firestore:rules`).

## 2. Rate limiting & chống spam
- **Đặt đơn: 1 đơn / 60 giây / người** — batch ghi `orders/{id}` + `throttle/{uid}`; rules của throttle chỉ cho ghi khi lần trước
  cách ≥ 60s, rules của order bắt buộc `getAfter(throttle).lastOrderAt == request.time`. Có test "đơn thứ 2 trong 60s bị từ chối".
- Client: khoá nút (ref + loading), idempotency key (id đơn tạo trước) → retry không tạo đơn trùng (có test).
- Kẻ tấn công tạo nhiều uid ẩn danh để lách giới hạn → bật **App Check** (mục 4) + Firebase tự giới hạn tạo tài khoản theo IP.
- Đăng nhập nhân viên: Firebase Auth tự khoá tạm khi sai nhiều lần (`auth/too-many-requests`). Bật thêm
  *Email enumeration protection* trong Console → Authentication → Settings.
- Tiệm quá tải: nhân viên tắt "Nhận đơn online" (rules chặn ngay, không cần deploy).

## 3. DDoS / "denial of wallet"
Web tĩnh trên Firebase Hosting đứng sau CDN Google (hấp thụ DDoS tầng mạng). Rủi ro thật là **hoá đơn**: ai đó gọi Firestore liên tục.
- Mọi truy vấn có `limit` (rules ép buộc); trang khách đọc 2 doc / lần mở + cache SWR; theo dõi đơn poll 15s chỉ khi tab hiển thị.
- **Gói Spark (miễn phí)**: hết quota thì dừng, không tính tiền — an toàn cho tiệm nhỏ.
  **Gói Blaze**: BẮT BUỘC đặt *Budget alert* (Google Cloud Billing → Budgets) và theo dõi Usage tab của Firestore.
- App Check enforcement (mục 4) chặn script/bot không chạy trong trang thật.
- Không mở API riêng (Cloud Functions HTTP) khi chưa cần; nếu thêm: App Check + giới hạn `maxInstances`.

## 4. App Check (chống bot gọi thẳng API)
1. Console → App Check → đăng ký web app với **reCAPTCHA v3** → lấy site key → `VITE_APPCHECK_SITE_KEY` trong `.env` / biến môi trường build.
2. Deploy, theo dõi tab App Check vài ngày (tỉ lệ request "verified").
3. Bấm **Enforce** cho Firestore và Authentication. Code đã sẵn (`lib/firebase.ts`, `ready()` chờ App Check trước request đầu).
CSP đã mở sẵn cho `www.google.com/recaptcha`, `www.gstatic.com/recaptcha`, `content-firebaseappcheck.googleapis.com`.

## 5. XSS / injection
- React tự escape text. Cấm: `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `href={giá trị người dùng}`.
  Kiểm tra: `grep -rnE "dangerouslySetInnerHTML|innerHTML|eval\(|new Function" src` → phải rỗng.
- Link người dùng nhập (ảnh món) chỉ `https://` — kiểm ở zod (`product.schema.ts`) **và** rules (regex). `tel:` dùng số đã chuẩn hoá.
- `cleanText()` (`lib/sanitize.ts`): bỏ thẻ HTML, ký tự điều khiển, và `= + - @` đầu chuỗi (CSV/Excel injection khi xuất file).
- NoSQL injection: không ghép chuỗi vào đường dẫn doc/collection từ input; id đơn từ URL chỉ dùng trong `doc(db,'orders',id)`
  và rules tự chặn đọc đơn người khác.
- Không có redirect theo tham số URL; `/admin/login` chỉ quay về đường dẫn bắt đầu bằng `/admin` (chống open redirect).

## 6. Security headers & CSP (`firebase.json` → hosting.headers)
CSP chặt (`default-src 'self'`, `script-src 'self'` + reCAPTCHA, `connect-src` chỉ các host Firebase, `object-src 'none'`,
`frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`,
`Permissions-Policy` tắt camera/mic/vị trí/thanh toán, `COOP same-origin`, HSTS. `/assets/**` cache 1 năm (file có hash),
còn lại `no-cache` (deploy mới có hiệu lực ngay).
- Thêm dịch vụ ngoài (analytics, ảnh CDN, chat) → thêm host vào đúng directive, KHÔNG nới thành `*` hay `'unsafe-eval'`.
- Sau deploy: `curl -sI https://<site>.web.app | grep -i -E "content-security|x-frame|strict"` và https://securityheaders.com.

## 7. CORS
SPA không có API riêng → không cần cấu hình CORS. Firestore/Auth tự xử lý CORS; bảo vệ là **rules + token**, không phải CORS.
Nếu sau này thêm Cloud Function HTTP: `cors({ origin: ['https://<site>.web.app', 'https://<domain>'] })`, không bao giờ
`origin: '*'` cho endpoint trả dữ liệu người dùng; ưu tiên Callable Function (tự kèm Auth + App Check).
`connect-src` trong CSP giới hạn nơi trang được gửi dữ liệu đi (chống rò rỉ dữ liệu qua script lạ).

## 8. Secret & cấu hình database không nằm trong code
- Config web Firebase (`apiKey`, `projectId`…) **không phải secret** nhưng vẫn để ở `.env` (git-ignore) → đổi project không sửa code.
- **Service account / admin key: không bao giờ** nằm trong repo hoặc biến `VITE_*` (mọi `VITE_*` lộ ra trình duyệt).
  `.gitignore` chặn `*serviceAccount*.json`, `*-firebase-adminsdk-*.json`.
- `npm run check:secrets` (CI chạy mỗi push): PEM key, service account JSON, Google API key, token GitHub/Slack/Stripe/AWS, JWT,
  mật khẩu gắn cứng, file `.env` bị commit.
- **Hạn chế API key** trong Google Cloud Console → Credentials: HTTP referrer = domain của tiệm; API restrictions = chỉ các API Firebase dùng.
- Lỡ push secret: **thu hồi/đổi khoá ngay** (xoá khỏi lịch sử git là không đủ — repo public đã bị quét trong vài phút).

## 9. Zombie API (endpoint / dữ liệu bị bỏ quên)
- Firestore: deny-by-default + test collection lạ. Định kỳ mở Console → Firestore, collection nào không có trong rules = dữ liệu mồ côi → xoá/backup.
- Index: `firestore.indexes.json` là nguồn duy nhất; `firebase deploy --only firestore:indexes` sẽ hỏi xoá index thừa.
- Hosting: SPA rewrite `**` → `index.html`; trang không tồn tại hiện 404 của app (không lộ file). Không để file debug/test trong `public/`.
- Auth: tắt provider không dùng (Console → Authentication → Sign-in method: chỉ Email/Password + Anonymous).
- Tài khoản nhân viên nghỉ việc: xoá doc `staff/{uid}` **và** disable user trong Authentication.
- Cloud Functions (nếu có sau này): xoá function không dùng (`firebase functions:delete`), không để endpoint thử nghiệm.
- Dọn định kỳ: user ẩn danh cũ (Authentication → bật "auto-cleanup anonymous accounts" khi dùng Identity Platform).

## 10. Trước mỗi lần deploy
- [ ] `npm run check` xanh (secrets, typecheck, unit, build, size) và `npm run test:rules` xanh
- [ ] Rules đổi → có test tấn công mới
- [ ] Không có `console.log` dữ liệu khách; lỗi hiện cho người dùng không lộ chi tiết kỹ thuật
- [ ] Header kiểm lại bằng `curl -I` sau deploy

## Báo cáo
Đã kiểm gì, tìm thấy gì (mức độ), đã sửa + test nào chặn lại, còn mở gì và vì sao, bước người dùng phải tự làm trên Console
(không tự đăng nhập Console hay nhập secret thay người dùng).
