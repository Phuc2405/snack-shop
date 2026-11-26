import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/router';
// Gelasio = bản thay thế Georgia (cùng dáng, cùng số đo) nhưng ĐỦ dấu tiếng Việt.
// Georgia trên Windows thiếu glyph chữ hai dấu (ầ, ế, ổ…) → bị vỡ dấu. Font tự host (font-src 'self'),
// trình duyệt chỉ tải subset cần dùng (unicode-range), font-display: swap → chữ hiện ngay.
import '@fontsource/gelasio/400.css';
import '@fontsource/gelasio/700.css';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
