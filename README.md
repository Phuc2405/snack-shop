# Con Nhà Bảy Food 🧋

Trang bán đồ ăn vặt (trà sữa, nước, bánh, đồ ăn vặt) cho **một tiệm, nhiều khách**:
khách xem menu và đặt món (không bắt buộc tạo tài khoản); nhân viên nhận đơn **realtime** trên trang quản lý, xử lý đơn,
quản lý món và cài đặt tiệm.

React 19 · Vite · TypeScript · Tailwind · Zustand · React Hook Form + Zod · **Firebase** (Firestore, Auth, Hosting, App Check)

| Trang bán hàng | Trang quản lý |
|---|---|
| ![Trang bán hàng](docs/screenshots/option2-desktop.jpg) | ![Trang quản lý](docs/screenshots/admin-dashboard.jpg) |

- **Xem thử ngay** (chế độ demo, dữ liệu mẫu, không cần Firebase): **https://snack-shop-option-2.vercel.app**
- Nhánh `main` dùng giao diện "tự nhiên" (option 2): ảnh chụp thật (nguồn: [docs/CREDITS.md](docs/CREDITS.md)), viền mảnh, bóng mềm.
  Giao diện "sticker kẹo ngọt" cũ (option 1) vẫn ở nhánh `option-1`.
- Tách ra từ dự án Antique Shop, chuyển từ Supabase sang Firebase. So sánh kiến trúc: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

**Mục lục:** [Tính năng](#tính-năng) · [3 cách chạy](#3-cách-chạy) · [Đăng nhập & tài khoản](#đăng-nhập--tài-khoản) ·
[Môi trường dev để kiểm thử](#môi-trường-dev-để-kiểm-thử-emulator) · [Kết nối Firebase thật](#kết-nối-firebase-thật) ·
[Cơ sở dữ liệu](#cơ-sở-dữ-liệu) · [Kiểm tra chất lượng](#kiểm-tra-chất-lượng) · [Cấu trúc](#cấu-trúc)

## Tính năng

**Khách** (`/`, `/checkout`, `/orders`)
- Menu dạng danh sách dài theo danh mục (tự đánh dấu danh mục đang xem), tìm món không dấu, chi tiết món dạng bottom sheet
- **Tuỳ chọn món**: size, % đường, đá, topping (giá cộng thêm hiện ngay), ghi chú riêng từng món
- Giỏ hàng nhớ trên máy, đồng bộ giữa các tab; đăng nhập thì giỏ được cất theo tài khoản và gộp với giỏ đang chọn
- Đặt món: giao tận nơi / ghé lấy, **freeship theo ngưỡng**, ngoài giờ mở cửa vẫn đặt trước được, chống bấm trùng
- Thanh toán **tiền mặt** hoặc **chuyển khoản VietQR** (QR đúng số tiền + nội dung = mã đơn)
- **Tài khoản email** (không bắt buộc): sổ địa chỉ người nhận (tối đa 5), "Đơn của tôi", quên mật khẩu
- Theo dõi đơn tự cập nhật trạng thái; huỷ đơn khi tiệm chưa nhận (bắt buộc chọn lý do)

**Nhân viên** (`/admin`)
- Đơn hàng realtime: âm báo + số đơn mới trên tab, 1 bấm chuyển bước (Nhận → Làm → Giao → Xong), nhắn khách,
  cảnh báo đơn sai giá, badge "CK · chưa nhận tiền" + nút **Đã nhận tiền**, huỷ đơn có lý do
- Món ăn: thêm / sửa / xoá, **Tạm hết**, **Ẩn / Hiện**, soạn tuỳ chọn món (có mẫu đồ uống), tạo menu mẫu
- Cài đặt tiệm: mở/đóng nhận đơn, giờ mở cửa, phí ship (đồng giá hoặc khách trả tài xế), freeship, đơn tối thiểu,
  bắt chuyển khoản trước cho đơn ship, tài khoản nhận VietQR, thông báo đầu trang
- Báo cáo doanh thu, món bán chạy

## 3 cách chạy

| Cách | Lệnh | Cần gì | Dữ liệu | Dùng khi |
|---|---|---|---|---|
| **Demo** | `npm run dev -- --mode demo` | Node 20+ | Menu mẫu trong code, đơn lưu ở trình duyệt | Xem giao diện. Không có đăng nhập, không có trang quản lý |
| **Emulator** (khuyên dùng để dev/test) | `npm run dev:local` | Node 20+, **Java 11+** | Firebase giả trên máy, có sẵn tài khoản test | Kiểm thử đủ luồng: đăng nhập, đặt món, quản lý |
| **Firebase thật** | `npm run dev` (có file `.env`) | Project Firebase | Firestore thật | Chạy thật, deploy |

Mỗi cách đọc một file biến môi trường riêng (Vite tự chọn theo `--mode`):

| File | Mode | Commit? | Nội dung |
|---|---|---|---|
| `.env` | mặc định (`npm run dev`, `npm run build`) | **Không** (git-ignore) | Config project Firebase thật, tạo từ `.env.example` |
| `.env.emulator` | `--mode emulator` | Có | Config giả `demo-snack-shop` + `VITE_USE_EMULATORS=true` |
| `.env.demo` | `--mode demo` | Có | `VITE_DEMO_MODE=true` |

## Đăng nhập & tài khoản

Có 3 loại người dùng. Tất cả dùng **Firebase Authentication**; quyền thật được kiểm ở `firestore.rules`, không phải ở giao diện.

| Ai | Đăng nhập thế nào | Làm được gì |
|---|---|---|
| **Khách vãng lai** | Không cần. Khi đặt món, web tự tạo phiên **ẩn danh** (Anonymous) | Đặt món, xem đơn vừa đặt trên máy đó |
| **Khách có tài khoản** | Header → **Đăng nhập** → email + mật khẩu (hoặc **Tạo tài khoản**) | Thêm: sổ địa chỉ, "Đơn của tôi" trên mọi máy, giỏ nhớ theo tài khoản |
| **Nhân viên / chủ tiệm** | Tài khoản khách bình thường **có thêm doc `staff/{uid}`** | Thêm: nút **Quản lý** trên header → `/admin` |

Chi tiết:
- **Tạo tài khoản**: mật khẩu ≥ 8 ký tự, có cả chữ và số. Nếu khách đã đặt đơn (phiên ẩn danh) rồi mới tạo tài khoản,
  phiên đó được **nâng cấp** giữ nguyên uid, nên các đơn cũ vẫn nằm trong "Đơn của tôi".
- **Quên mật khẩu**: hộp Đăng nhập → Quên mật khẩu → Firebase gửi email có link mở trang `/auth/action` của web để đặt mật khẩu mới.
  Web luôn báo "đã gửi" kể cả khi email chưa đăng ký (không cho dò email nào có tài khoản).
- **Nhân viên đăng nhập** ở một trong hai chỗ:
  - header trang bán hàng (như khách) → nút **Quản lý** hiện ra, bấm là vào thẳng `/admin`;
  - hoặc trang riêng **`/admin/login`** (vào `/admin` khi chưa đăng nhập cũng được chuyển tới đây).
- **Hai phiên tách biệt** trên cùng trình duyệt (phiên khách và phiên quản lý, xem `src/lib/firebase.ts`): nhân viên vừa quản lý
  vừa đặt món thử được, không đá văng nhau. Đăng xuất phía khách thì đóng luôn phiên quản lý cùng tài khoản; giỏ được cất vào tài khoản
  và máy về giỏ trống (máy dùng chung không lộ giỏ người trước).
- **Cấp / thu quyền quản lý**: không có màn hình nào trong web làm được việc này (cố ý). Chủ tiệm thêm hoặc xoá doc `staff/{uid}`
  trong Firebase Console, xem [Tạo tài khoản quản lý đầu tiên](#5-tạo-tài-khoản-quản-lý-đầu-tiên).

## Môi trường dev để kiểm thử (emulator)

Chạy cả shop trên máy, **không cần tài khoản Firebase**, có sẵn dữ liệu và tài khoản test.

### Cài một lần
- **Node 20+** (`node -v`) và **Java 11+** (`java -version`; Firebase Emulator chạy bằng Java).
- `npm install`

### Chạy
```bash
npm run dev:local
```
Một lệnh này: bật Firebase Emulator (Auth + Firestore) → tạo dữ liệu mẫu → mở web. Khi thấy dòng `▶ Trang khách`, mở:

| Gì | Địa chỉ |
|---|---|
| Trang khách | http://localhost:5173 |
| Trang quản lý | http://localhost:5173/admin |
| Emulator UI: xem/sửa Firestore | http://127.0.0.1:4000/firestore |
| Emulator UI: danh sách tài khoản | http://127.0.0.1:4000/auth |

Tắt: **Ctrl+C**. DB emulator nằm trong RAM nên tắt là mất hết; chạy lại lệnh là có lại dữ liệu mẫu từ đầu.

### Tài khoản test (chỉ có trên emulator)
| Vai trò | Email | Mật khẩu | Có sẵn |
|---|---|---|---|
| Quản lý tiệm | `admin@connhabay.test` | `Admin@2026` | Doc `staff/{uid}` → nút **Quản lý** |
| Khách 1 | `khach1@connhabay.test` | `Khach@2026` | 2 địa chỉ, 2 đơn (1 xong, 1 mới) |
| Khách 2 | `khach2@connhabay.test` | `Khach@2026` | 1 địa chỉ, 1 đơn đang làm |
| Khách 3 | `khach3@connhabay.test` | `Khach@2026` | Tài khoản trống: chưa có địa chỉ, chưa có đơn |

Ngoài ra: `settings/shop` đang nhận đơn (có tài khoản VietQR giả để thấy mã QR), 12 món mẫu + 1 món đang ẩn, 3 đơn mẫu.
Mật khẩu này chỉ tồn tại trong emulator trên máy (project `demo-snack-shop`), đừng dùng lại cho tài khoản thật.
Kịch bản test từng luồng (khách vãng lai, sổ địa chỉ, tạo tài khoản, quên mật khẩu, quản lý, ẩn món):
**[docs/TEST-ACCOUNTS.md](docs/TEST-ACCOUNTS.md)**.

### Mẹo khi test
- **Quên mật khẩu**: emulator không gửi email thật. Sau khi bấm "Quên mật khẩu", web hiện link **"Chế độ test (emulator)"**
  để mở thẳng trang đặt mật khẩu mới.
- **Test như 2 người cùng lúc** (khách đặt, quản lý nhận đơn realtime): mở trang quản lý ở cửa sổ thường, trang khách ở cửa sổ ẩn danh
  (hoặc trình duyệt khác).
- **Sửa dữ liệu tay** (đóng tiệm, đổi giá, thêm doc `staff`…): Emulator UI → Firestore. Thêm tài khoản: tạo trên web hoặc Emulator UI → Authentication.
- **Seed không ghi đè**: chạy lại `npm run seed:emu` khi emulator đang chạy chỉ tạo phần còn thiếu, không xoá dữ liệu bạn đã sửa.
- **Chạy từng phần** (khi muốn giữ emulator, chỉ khởi động lại web):
  ```bash
  npm run dev:emu                    # cửa sổ 1: emulator
  npm run seed:emu                   # cửa sổ 2: dữ liệu mẫu
  npm run dev -- --mode emulator     # cửa sổ 2: web
  ```
  `npm run dev:local` cũng tự dùng lại emulator nếu nó đang chạy sẵn.

### Lỗi hay gặp
| Triệu chứng | Cách xử lý |
|---|---|
| `Emulator chưa sẵn sàng sau 90s` | Chưa cài Java hoặc Java < 11: `java -version` |
| `Emulator dừng (mã 1)` / port in use | Cổng 4000, 8080, 9099 hoặc 5173 đang bị chương trình khác giữ (thường là emulator cũ chưa tắt hẳn). Tắt nó rồi chạy lại |
| Web báo "Cửa hàng chưa kết nối cơ sở dữ liệu" | Chạy `npm run dev` mà không có `.env`. Dùng `npm run dev:local` hoặc `npm run dev -- --mode emulator` |
| Không thấy nút **Quản lý** | Đăng nhập bằng `admin@connhabay.test`; nếu đã sửa DB, kiểm tra doc `staff/{uid}` còn đó (uid lấy ở Emulator UI → Authentication) |

## Kết nối Firebase thật

Gói **Spark (miễn phí)** là đủ cho một tiệm nhỏ.

### 1. Tạo project và bật dịch vụ
1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project**.
2. **Build → Firestore Database → Create database** → *production mode*, region gần VN: `asia-southeast1` (không đổi được về sau).
3. **Build → Authentication → Get started → Sign-in method**: bật **Email/Password** và **Anonymous** (cho khách vãng lai), tắt mọi cách khác.
4. **Authentication → Settings**:
   - **Password policy**: tối thiểu 8 ký tự, bắt buộc chữ + số, chọn *Require enforcement* (khớp với kiểm tra trên web);
   - **Email enumeration protection**: bật;
   - **Authorized domains**: thêm tên miền của tiệm (`localhost` có sẵn để chạy `npm run dev`).
5. **Authentication → Templates → Password reset**: chọn **Tiếng Việt**, *Customize action URL* = `https://<tên-miền>/auth/action`
   (link trong email mở trang đặt mật khẩu của web thay vì trang mặc định của Firebase).

### 2. Điền cấu hình vào `.env`
**Project settings → General → Your apps → Web (`</>`)** → đăng ký app → copy `firebaseConfig`. Tạo `.env` từ mẫu:

```bash
cp .env.example .env        # PowerShell: Copy-Item .env.example .env
```

| Biến trong `.env` | Lấy từ `firebaseConfig` | Bắt buộc |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | `apiKey` | Có |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` | Có |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` | Có |
| `VITE_FIREBASE_APP_ID` | `appId` | Có |
| `VITE_USE_EMULATORS` | để `false` | Có |
| `VITE_APPCHECK_SITE_KEY` | reCAPTCHA v3 site key (bước 6) | Không, để trống = tắt |
| `SITE_URL` | tên miền công khai, VD `https://ten-tiem.web.app` | Không, có thì build sinh `robots.txt` + `sitemap.xml` |

Các giá trị `VITE_FIREBASE_*` không phải mật khẩu (Google thiết kế để nằm trong trình duyệt), nhưng `.env` vẫn được git-ignore.
**Không bao giờ** đặt service account key hay khoá admin vào biến `VITE_*`: mọi biến `VITE_*` đều lộ ra trình duyệt.

### 3. Nối Firebase CLI và deploy rules
```bash
npx firebase login
npx firebase use --add          # chọn project vừa tạo, đặt alias "default"
npx firebase deploy --only firestore    # đẩy firestore.rules + index (bắt buộc trước khi dùng)
```
`.firebaserc` mặc định trỏ `demo-snack-shop` (project giả cho emulator); `firebase use --add` ghi project thật vào đó.
Các lệnh emulator và `npm run test:rules` luôn tự chỉ định `--project demo-snack-shop` nên không bao giờ chạm vào project thật.

### 4. Chạy thử trên máy với Firebase thật
```bash
npm run dev                     # đọc .env → http://localhost:5173
```
Lúc này DB còn trống: trang khách chưa có món và tiệm đang đóng. Làm tiếp bước 5.

### 5. Tạo tài khoản quản lý đầu tiên
1. Trên web, header → **Đăng nhập → Tạo tài khoản** bằng email của chủ tiệm
   (hoặc Console → **Authentication → Users → Add user**).
2. Console → **Authentication → Users** → copy **User UID** của tài khoản đó.
3. Console → **Firestore → Start collection** `staff` → *Document ID* = **UID vừa copy** → thêm field
   `name` (string) và `email` (string) → **Save**.
4. Tải lại web (hoặc đăng xuất, đăng nhập lại) → nút **Quản lý** hiện ra → vào `/admin`:
   - **Cài đặt tiệm**: tên, hotline, giờ mở cửa, phí ship, tài khoản nhận VietQR, bật **"Nhận đơn online"** → Lưu;
   - **Món ăn**: **Tạo menu mẫu** (12 món, khi menu trống) hoặc thêm món của tiệm.

Thêm nhân viên khác / cho nghỉ việc: [docs/DATABASE.md](docs/DATABASE.md#thêm-nhân-viên-quản-lý).

### 6. Deploy lên Firebase Hosting
```bash
npm run deploy                  # = npm run check  +  firebase deploy --only hosting,firestore
```
Web có ở `https://<project-id>.web.app`. Nhớ thêm tên miền này vào **Authorized domains** và cập nhật `SITE_URL`, action URL ở bước 1.

### 7. Bảo vệ thêm (khuyến nghị trước khi mở bán)
- Bật **App Check** (reCAPTCHA v3) → điền `VITE_APPCHECK_SITE_KEY` → deploy lại → sau vài ngày bấm **Enforce** cho Firestore và Authentication.
- Google Cloud Console → Credentials → **giới hạn API key** theo tên miền của tiệm.
- Lên gói Blaze thì đặt **Budget alert**.

Đủ danh sách: [docs/SECURITY.md](docs/SECURITY.md#việc-chủ-tiệm-cần-làm-trên-console-không-làm-được-từ-code).

### Bản demo (Vercel)
`npm run build:demo` rồi `vercel deploy dist --prod` (hoặc `npm run deploy:demo`). Bản demo không gọi Firebase, không có trang quản lý.

## Cơ sở dữ liệu
Sơ đồ, ý nghĩa từng field, cách sửa trong Console: **[docs/DATABASE.md](docs/DATABASE.md)**.

| Collection | Nội dung |
|---|---|
| `products` | Món: tên, giá, danh mục, ảnh, tuỳ chọn, còn bán, ẩn/hiện, nổi bật, thứ tự |
| `settings/shop` | Tên tiệm, hotline, giờ mở, **mở/đóng nhận đơn**, phí ship, freeship, đơn tối thiểu, tài khoản VietQR |
| `orders` | Đơn hàng + trạng thái, thanh toán, lý do huỷ |
| `users` | Sổ địa chỉ của khách có tài khoản (chỉ chính chủ đọc/ghi) |
| `staff` | Ai là nhân viên (chỉ tạo trong Console) |
| `throttle` | Chống spam đơn (hệ thống tự ghi) |

## Kiểm tra chất lượng

| Lệnh | Làm gì |
|---|---|
| `npm run check` | Quét secret → typecheck → unit test → build → kiểm cấu hình bảo mật bản build → ngân sách dung lượng |
| `npm run test:rules` | 70 ca kiểm thử (gồm tấn công) vào Firestore rules trên emulator (cần Java) |
| `npm test` | Unit test domain (giỏ, giá, trạng thái, validate, sanitize, khớp rules ↔ code) |
| `npm run check:size` | Dung lượng gzip; JS tải lần đầu ≤ 175KB |

CI (GitHub Actions) chạy tất cả trên mỗi push vào `main` và mỗi pull request.

### Skill cho Claude Code (`.claude/skills/`)
| Skill | Dùng khi |
|---|---|
| `ui-ux-latency-check` | Rà UX luồng đặt món, a11y, Web Vitals, bundle, số lần đọc Firestore |
| `responsive-layout-check` | Kiểm layout 320px → desktop, xoay ngang/dọc, zoom 200%, resize; có script `layout-audit.js` |
| `security-hardening` | DDoS / rate limit / XSS / CORS / CSP / secret / zombie API / rules / App Check |

## Cấu trúc

```
src/
  app/          router (lazy theo route), layout gốc
  config/       danh mục, cấu hình mặc định, menu mẫu
  domain/       logic thuần: giỏ, giá, giờ mở cửa, máy trạng thái đơn, lý do huỷ, payload đơn (+ test)
  schemas/      Zod: form đặt món, đăng nhập, món, cài đặt
  services/     Repository: product / order / settings / auth / customer, orders.live (realtime), demo, mappers
  stores/       Zustand: cart, account, shop (menu + cấu hình, cache), staff, ui, toast, confirm
  hooks/        useAsync (poll khi tab hiện), useLiveOrders, useAddToCart…
  components/   ui/ (Button, Dialog, FormField…), shop/, admin/, art/
  pages/        trang khách + pages/admin
  lib/          firebase (Facade, 2 phiên guest/staff), demo, errors, format, sanitize, id
firestore.rules · firestore.indexes.json · firebase.json (hosting + header bảo mật + emulator)
tests/rules/    test security rules
scripts/        dev-local, seed emulator, check bundle size / secrets / security
docs/           DATABASE · ARCHITECTURE · SECURITY · TEST-ACCOUNTS · CREDITS
```

## Thiết kế
Ảnh món chụp thật, viền mảnh, bóng mềm, nền kem. Font **Gelasio** (dáng giống Georgia nhưng đủ dấu tiếng Việt; Georgia gốc
trên Windows bị vỡ dấu ở các chữ ầ, ế, ổ), chữ gốc 18–19px, vùng bấm ≥ 44px, màu chữ đạt tương phản WCAG AA.
Token màu: `tailwind.config.js`.
