---
name: ui-ux-latency-check
description: Rà soát UI/UX và tốc độ (latency) cho web bán hàng Snack Shop hoặc SPA React + Firebase tương tự — luồng đặt món, trạng thái loading/lỗi/trống, khả năng tiếp cận (a11y), Core Web Vitals (LCP, CLS, INP), dung lượng bundle, số lần đọc Firestore. Dùng khi người dùng nói "check UI", "check UX", "kiểm tra giao diện", "trang chậm", "latency", "tối ưu tốc độ", "Lighthouse", "web vitals", "bundle nặng", hoặc trước khi release.
---

# UI/UX + latency check

## A. Đo trước khi sửa (latency)

1. **Ngân sách dung lượng** — `npm run build && npm run check:size`
   In kích thước gzip từng file; `*` = tải ngay lần đầu. Ngân sách trong `scripts/check-bundle-size.mjs`
   (JS lần đầu ≤ 175KB, CSS ≤ 15KB, mỗi chunk lazy ≤ 140KB). Vượt → tìm thủ phạm:
   ```bash
   npx vite build --sourcemap   # rồi gom sourcesContent theo package (xem lịch sử: react-dom, react-router, firestore lite là 3 phần lớn nhất)
   ```
   Quy tắc tách chunk của dự án: trang khách chỉ dùng `firebase/firestore/lite`; `firebase/auth` tải lười khi đặt món;
   `firebase/firestore` đầy đủ (realtime) **chỉ** ở `services/orders.live.ts` (dashboard). Import nhầm bản đầy đủ ở
   trang khách = +130KB. Kiểm tra: `grep -rn "from 'firebase/firestore'" src | grep -v "import type"` chỉ được ra orders.live.ts.

2. **Web Vitals trên bản build** — `npm run build -- --mode emulator && npm run preview -- --mode emulator`, mở trang, chạy:
   ```js
   const lcp = await new Promise(r => new PerformanceObserver(l => r(Math.round(l.getEntries().at(-1).startTime))).observe({ type: 'largest-contentful-paint', buffered: true }));
   let cls = 0; new PerformanceObserver(l => l.getEntries().forEach(e => !e.hadRecentInput && (cls += e.value))).observe({ type: 'layout-shift', buffered: true });
   ({ lcp, cls, fcp: performance.getEntriesByType('paint').at(-1)?.startTime, jsKB: Math.round(performance.getEntriesByType('resource').filter(r => r.name.endsWith('.js')).reduce((s, r) => s + r.transferSize, 0) / 1024) })
   ```
   Mục tiêu (máy thật, 4G): **LCP < 2.5s, CLS < 0.1, INP < 200ms**. Trên localhost: LCP ~100ms, CLS = 0 (đo 2026-11-26).
   Lighthouse đầy đủ: `npx lighthouse http://127.0.0.1:4173 --preset=desktop` và `--form-factor=mobile --throttling-method=simulate`.
   Sau deploy: PageSpeed Insights với URL thật.

3. **Latency mạng / Firestore**
   - Menu: stale-while-revalidate (`stores/shop.store.ts`) — lần mở sau hiện ngay từ cache localStorage, tải bản mới ở nền.
     Kiểm tra: tải trang lần 2 với DevTools → Network "Slow 3G" → menu phải hiện trước khi request Firestore xong.
   - Đếm lần đọc: mỗi lần mở trang khách = 2 request (products + settings). Theo dõi đơn = 1 getDoc mỗi 15s **chỉ khi tab đang hiện**
     (`useAsync` + `visibilitychange`), dừng khi đơn xong. Dashboard = 2 listener realtime. Thêm truy vấn mới → ghi số lần đọc vào PR.
   - Mọi truy vấn có `limit()` (rules bắt buộc) và đúng index (`firestore.indexes.json`); thiếu index → lỗi `failed-precondition`.
   - Request trùng: `load()` gộp các lần gọi đồng thời (`inflight`). Kết quả cũ về muộn bị bỏ qua (`useAsync`, `staff.store` dùng bộ đếm thế hệ).

4. **Font & ảnh**
   - Font tự host (Gelasio qua @fontsource), `unicode-range` → chỉ tải subset cần (latin + vietnamese). Không gọi Google Fonts (thêm DNS + CSP).
   - Ảnh món: `loading="lazy"` trừ 4 thẻ đầu (`eager`), khung `aspect-square` → không CLS. Ảnh do nhân viên dán link: nhắc dùng ảnh ≤ 200KB, WebP.

## B. UX checklist (luồng bán hàng)

| Mục | Kiểm tra | Trạng thái dự án |
|---|---|---|
| Đến được menu nhanh | Điện thoại: menu thấy được sau ≤ 1 lần cuộn; nút "Xem menu" | ✅ hero gọn trên mobile |
| Tìm món | Tìm không dấu ("tra sua" ra "Trà sữa"), xoá nhanh, lọc danh mục dính dưới header | ✅ |
| Thêm vào giỏ | Phản hồi tức thì (toast + icon giỏ nảy), nút + ≥ 44px, món hết hàng không bấm được | ✅ |
| Giỏ luôn trong tầm tay | Thanh giỏ dính đáy trên mobile (ẩn ở trang Đặt món) | ✅ |
| Form đặt món | Ít ô nhất có thể; `autocomplete`, `inputMode=tel`; báo lỗi cạnh ô + focus ô lỗi đầu; nhớ thông tin lần sau | ✅ |
| Chống bấm 2 lần | Nút loading + khoá ref + idempotency key (id đơn tạo trước) | ✅ |
| Sau khi đặt | Trang theo dõi đơn tự cập nhật, có nút gọi tiệm, huỷ khi tiệm chưa nhận | ✅ |
| Lỗi | Thông điệp tiếng Việt, nói cách khắc phục, không lộ chi tiết kỹ thuật (`lib/errors.ts`) | ✅ |
| Trạng thái trống / đang tải | Skeleton đúng kích thước thật; empty state có hành động tiếp theo | ✅ |
| Tiệm đóng cửa | Banner rõ, nút đặt bị khoá (rules cũng chặn) | ✅ |
| Nhân viên | Đơn mới: âm báo + số trên tab + đơn cũ nhất lên đầu; 1 nút "bước tiếp theo" trên mỗi thẻ | ✅ |
| Cảnh báo giá | Đơn có giá khác menu → cảnh báo đỏ trước khi nhận | ✅ |

## C. Accessibility (a11y) nhanh
- Bàn phím: Tab đi hết trang, focus thấy rõ (outline 3px), Esc đóng dialog, link "Bỏ qua, tới nội dung chính".
- `<dialog>` gốc (focus trap + inert sẵn), toast `aria-live`, nút icon có `aria-label`, switch có `role="switch"` + `aria-checked`.
- Tương phản: chữ trên nền màu luôn là `ink` (#2B2118); màu chữ phụ đã đo ≥ 4.5:1. Đổi màu → đo lại (DevTools → Inspect → Contrast).
- `prefers-reduced-motion`: animation tắt (index.css).
- Thử nhanh: `npx @axe-core/cli http://127.0.0.1:4173` hoặc tab Lighthouse → Accessibility.

## D. Báo cáo
Bảng: chỉ số trước/sau (KB, LCP, CLS, số request), vấn đề UX tìm thấy (ảnh chụp), đã sửa gì, còn lại gì. Không báo "nhanh hơn"
nếu không có số đo trước/sau.
