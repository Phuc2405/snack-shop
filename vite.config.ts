/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

/**
 * `vite preview` gửi CÙNG bộ header bảo mật như Firebase Hosting (đọc từ firebase.json),
 * để CSP chặn nhầm thứ gì thì thấy ngay trên máy thay vì sau khi deploy.
 * Chỉ ở preview: cho phép thêm kết nối tới emulator trên 127.0.0.1.
 */
function hostingHeaders(): Plugin {
  const cfg = JSON.parse(readFileSync(new URL('./firebase.json', import.meta.url), 'utf8'));
  const global = (cfg.hosting.headers as { source: string; headers: { key: string; value: string }[] }[])
    .find((h) => h.source === '**')!.headers;
  return {
    name: 'firebase-hosting-headers',
    configurePreviewServer(server) {
      server.middlewares.use((_req, res, next) => {
        for (const { key, value } of global) {
          if (key === 'Strict-Transport-Security') continue; // localhost là http
          const v =
            key === 'Content-Security-Policy'
              ? value
                  .replace("connect-src 'self'", "connect-src 'self' http://127.0.0.1:8080 http://127.0.0.1:9099 ws://127.0.0.1:8080")
                  .replace('; upgrade-insecure-requests', '')
              : value;
          res.setHeader(key, v);
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), hostingHeaders()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    // Cảnh báo sớm nếu một chunk phình to (latency trên 3G/4G)
    chunkSizeWarningLimit: 250,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
