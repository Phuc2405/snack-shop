---
name: responsive-layout-check
description: Kiểm tra layout responsive của web app (Snack Shop hoặc SPA tương tự) — màn hình điện thoại 320–414px, tablet, desktop, xoay ngang/dọc, phóng to 200% (WCAG reflow), resize cửa sổ mượt. Dùng khi người dùng nói "check layout", "check responsive", "màn hình nhỏ bị vỡ", "zoom bị tràn", "resize ngang dọc", "kiểm tra giao diện điện thoại", "tap target", "cuộn ngang", hoặc trước khi release có thay đổi giao diện.
---

# Responsive layout check

Mục tiêu: mọi trang dùng được và đẹp ở **mọi** chiều rộng 320 → 1920px, khi xoay máy, khi phóng to 200%,
và khi kéo đổi kích thước cửa sổ — không cuộn ngang, không chữ bị cắt, không nút quá nhỏ, không thứ gì che nội dung.

## Cách làm (theo thứ tự)

### 1. Chạy app
- Có Firebase thật: `npm run dev`. Không có: `npm run dev:emu` (cửa sổ 1) → `npm run seed:emu` → `npm run dev -- --mode emulator`.
- Kiểm tra bản build (gần production nhất): `npm run build -- --mode emulator && npm run preview -- --mode emulator`.

### 2. Audit tự động bằng `layout-audit.js` (file cạnh SKILL này)
Script đo ở kích thước hiện tại: cuộn ngang trang, phần tử tràn mép, vùng chạm < 44px, chữ < 14px,
chữ bị cắt không có "…", ảnh thiếu alt/không giữ tỉ lệ (gây CLS), thanh fixed/sticky che > 35% màn hình.
Đã tự bỏ qua: phần tử `.sr-only`, link trong đoạn văn, stretched button (`::after` phủ cả thẻ).

**Chrome không cho cửa sổ nhỏ hơn ~500px** → đo màn điện thoại bằng iframe đúng kích thước (cùng origin):

```js
// Chạy trong tab đang mở app (Claude in Chrome: javascript_tool). Chạy NỀN vì 25 lượt > 45s timeout.
window.__out = []; window.__done = false;
(async () => {
  const code = await (await fetch('/.claude/skills/responsive-layout-check/layout-audit.js?' + Date.now())).text();
  for (const path of ['/', '/checkout', '/orders', '/admin', '/admin/products', '/khong-ton-tai'])
    for (const [w, h] of [[320, 640], [375, 812], [414, 896], [768, 1024], [1024, 768], [1440, 900], [812, 375]]) {
      const f = Object.assign(document.createElement('iframe'), { src: path });
      f.style.cssText = `width:${w}px;height:${h}px;position:fixed;top:0;left:0;border:0;z-index:2147483647`;
      document.documentElement.appendChild(f);
      await new Promise(r => (f.onload = r)); await new Promise(r => setTimeout(r, 1500));
      const r = f.contentWindow.eval(code); f.remove();
      if (!r.ok) window.__out.push({ path, size: `${w}x${h}`, ...r });
    }
  window.__done = true;
})();
// Đợi ~60s rồi đọc: window.__done && JSON.stringify(window.__out)
```
(Dev server Vite phục vụ được file trong `.claude/` vì cùng thư mục gốc. Ở bản preview/production thì dán nội dung script vào.)

### 3. Bảng kích thước bắt buộc

| Kích thước | Đại diện | Chú ý |
|---|---|---|
| 320×640 | iPhone SE 1 / máy Android nhỏ | Không cuộn ngang; header không chen chúc |
| 375×812, 414×896 | iPhone phổ biến | Thanh giỏ dính đáy không che nút; bottom sheet vừa màn |
| 812×375 | Điện thoại **xoay ngang** | Chiều cao rất thấp: dialog phải cuộn được (`max-h-[90dvh]`), header sticky không ăn hết màn |
| 768×1024, 1024×768 | Tablet dọc / ngang | Lưới 3 cột; sidebar admin chuyển dạng |
| 1440×900, 1920×1080 | Desktop | Nội dung không giãn quá rộng (`max-w-shell`) |
| **Zoom 200%** | WCAG 1.4.4 / 1.4.10 | 1280px phóng 200% = layout 640px CSS → đã phủ bởi các mốc trên. Kiểm thêm bằng tay: Ctrl + `+` tới 200% trên trang thật |

### 4. Kiểm tra bằng mắt (script không thay được)
Chụp màn hình ở 375px và 1440px cho từng trang, xem:
- Chữ xuống dòng có đẹp không (`text-wrap: balance` cho tiêu đề), highlight/gạch chân có đi theo dòng không
  (dùng `box-decoration-break: clone`, KHÔNG dùng thanh `absolute` dưới chữ — vỡ khi chữ xuống dòng).
- Dấu tiếng Việt: chữ hai dấu (ầ, ế, ổ, ữ) có bị tách rời không → font phải có glyph tiếng Việt (bài học: Georgia
  gốc của Windows vỡ dấu, dự án dùng Gelasio). Kiểm tra: `document.fonts.check('16px Gelasio', 'ầ')`.
- Thứ tự lớp: toast có nổi trên dialog không (dùng Popover API / top layer), sticky có bị header che không
  (dùng `--header-h` đo bằng ResizeObserver, không hard-code chiều cao).
- Thứ gì "dính" (sticky/fixed) có thừa ở trang đó không (vd: thanh giỏ ẩn ở trang Đặt món).

### 5. Resize mượt
- Kéo cửa sổ từ 1440 → 500 và ngược lại: không giật/nhảy (không có JS đo layout chạy theo `resize` mà thiếu
  debounce; ưu tiên CSS: grid/flex, `clamp()`, container query). Dùng `ResizeObserver` thay vì `window.onresize`.
- Breakpoint của Tailwind: `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`. Kiểm tra ±1px quanh mỗi mốc.
- `min-h-dvh` thay `100vh` (thanh địa chỉ mobile), `pb-safe` cho tai thỏ / thanh home iOS.

## Quy tắc thiết kế của dự án (khi sửa lỗi)
- Vùng chạm ≥ 44×44px (`min-h-[2.75rem]`, nút icon `h-11 w-11`).
- Chữ gốc 18px mobile / 19px desktop; không dùng chữ < 14px. Đơn vị `rem` để zoom trình duyệt hoạt động.
- Ảnh luôn trong khung tỉ lệ cố định (`aspect-square`) → CLS = 0.
- Không `overflow-x: hidden` để "giấu" lỗi tràn — tìm phần tử gây tràn và sửa (body đã có `overflow-x: clip` làm lưới an toàn cuối).

## Báo cáo
Liệt kê: kích thước × trang đã kiểm, lỗi tìm thấy (ảnh chụp), đã sửa gì, cái gì còn để ngỏ. Chạy lại audit sau khi sửa.
