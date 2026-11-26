# Snack Shop: ghi chú cho Claude

- Tiếng Việt cho mọi chữ hiện trên giao diện và tài liệu.
- **Quyền thật nằm ở `firestore.rules`.** Đổi cấu trúc dữ liệu → sửa cùng lúc: `firestore.rules`, `src/types/domain.ts`,
  `src/services/mappers.ts`, `docs/DATABASE.md`, và thêm test trong `tests/rules/` (`npm run test:rules`).
- Trang khách chỉ dùng `firebase/firestore/lite`; Firestore đầy đủ (realtime) chỉ ở `src/services/orders.live.ts`.
- Trước khi báo xong: `npm run check` (+ `npm run test:rules` nếu đụng rules/dữ liệu).
- Giao diện: token màu ở `tailwind.config.js`; vùng bấm ≥ 44px; chữ trên nền màu dùng `text-ink`.
- Skill trong `.claude/skills/`: `ui-ux-latency-check`, `responsive-layout-check`, `security-hardening`.
- Chạy local không cần Firebase thật: `npm run dev:emu` → `npm run seed:emu` → `npm run dev -- --mode emulator`.
