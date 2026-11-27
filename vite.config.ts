/// <reference types="vitest/config" />
import { defineConfig, loadEnv, runnerImport, type Plugin } from 'vite';
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

/**
 * robots.txt + sitemap.xml sinh lúc build (cần tên miền tuyệt đối → biến SITE_URL trong .env / .env.demo,
 * KHÔNG có tiền tố VITE_ nên không lọt vào bundle). Thiếu SITE_URL: vẫn có robots.txt, chỉ bỏ dòng Sitemap.
 * Chỉ trang menu được index; trang quản lý / đặt món / đơn hàng / link email: Disallow.
 */
function seoFiles(siteUrl: string): Plugin {
  const site = siteUrl.replace(/\/+$/, '');
  return {
    name: 'seo-files',
    apply: 'build',
    generateBundle() {
      const robots = [
        'User-agent: *',
        'Allow: /$',
        'Disallow: /admin',
        'Disallow: /checkout',
        'Disallow: /orders',
        'Disallow: /auth',
        ...(site ? ['', `Sitemap: ${site}/sitemap.xml`] : []),
        '',
      ].join('\n');
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots });
      if (site) {
        const sitemap = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          `  <url><loc>${site}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
          '</urlset>',
          '',
        ].join('\n');
        this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap });
      }
    },
  };
}

/**
 * Gợi ý tải sớm trong <head> (latency trên điện thoại / 4G):
 *  - preload ảnh banner (ảnh LCP): bình thường ảnh chỉ bắt đầu tải SAU khi ~170KB JS tải + chạy xong mới vẽ Hero;
 *    preload cho trình duyệt tải song song ngay khi đọc HTML. Dùng chung heroImage() với Hero.tsx → cùng URL,
 *    không tải 2 lần.
 *  - preconnect images.unsplash.com (ảnh) và firestore.googleapis.com (menu) → bỏ thời gian DNS + TLS.
 *    Bản demo / emulator không gọi Firestore thật → không preconnect.
 */
function headHints(mode: string): Plugin {
  const env = loadEnv(mode, process.cwd(), '');
  const realFirestore = env.VITE_DEMO_MODE?.trim() !== 'true' && env.VITE_USE_EMULATORS !== 'true';
  let cached: Awaited<ReturnType<typeof build>> | null = null;
  async function build() {
    const cfg = {
      configFile: false as const,
      logLevel: 'silent' as const,
      resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    };
    const [{ module: img }, { module: cat }] = await Promise.all([
      runnerImport<typeof import('./src/lib/image')>('/src/lib/image.ts', cfg),
      runnerImport<typeof import('./src/config/catalog')>('/src/config/catalog.ts', cfg),
    ]);
    return img.heroImage(cat.HERO_PHOTO);
  }
  return {
    name: 'head-hints',
    async transformIndexHtml() {
      cached ??= await build();
      const hero = cached;
      return [
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://images.unsplash.com' }, injectTo: 'head-prepend' },
        ...(realFirestore
          ? [{ tag: 'link', attrs: { rel: 'preconnect', href: 'https://firestore.googleapis.com', crossorigin: '' }, injectTo: 'head-prepend' as const }]
          : []),
        {
          tag: 'link',
          attrs: {
            rel: 'preload',
            as: 'image',
            href: hero.src,
            ...(hero.srcSet ? { imagesrcset: hero.srcSet, imagesizes: hero.sizes } : {}),
            // Thuộc tính phải khớp <img> của Hero (không crossorigin / referrerPolicy riêng), lệch = tải ảnh 2 lần
            fetchpriority: 'high',
          },
          injectTo: 'head',
        },
      ];
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), hostingHeaders(), seoFiles(loadEnv(mode, process.cwd(), 'SITE_').SITE_URL ?? ''), headHints(mode)],
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
}));
