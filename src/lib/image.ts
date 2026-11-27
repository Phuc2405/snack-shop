/**
 * Link ảnh nhiều kích thước (module THUẦN, không React) — dùng cho thẻ món, banner, và cả vite.config.ts
 * (chèn <link rel="preload"> ảnh banner vào index.html lúc build, xem plugin heroPreload).
 */

/**
 * Ảnh trên CDN Unsplash (imgix) → srcset nhiều kích thước + định dạng tự động (AVIF/WebP):
 * điện thoại tải ảnh ~400px, máy tính ~800px, thay vì ảnh gốc vài MB. Ảnh khác giữ nguyên.
 */
export function responsiveSrc(url: string, widths = [320, 480, 640, 960], ratio = 'square' as 'square' | 'wide') {
  if (!url.startsWith('https://images.unsplash.com/')) return { src: url };
  const [base, query = ''] = url.split('?');
  // Giữ gợi ý cắt riêng của từng ảnh (vd ?crop=bottom); mặc định cắt giữa — món ăn thường nằm giữa khung
  const crop = new URLSearchParams(query).get('crop');
  const h = (w: number) => (ratio === 'square' ? w : Math.round((w * 9) / 16));
  const at = (w: number) => `${base}?w=${w}&h=${h(w)}&fit=crop${crop ? `&crop=${encodeURIComponent(crop)}` : ''}&auto=format&q=68`;
  return { src: at(widths[1] ?? 480), srcSet: widths.map((w) => `${at(w)} ${w}w`).join(', ') };
}

/** Ảnh banner đầu trang — Hero và thẻ preload trong index.html PHẢI dùng cùng một bộ (khác nhau = tải ảnh 2 lần) */
export const HERO_SIZES = '(min-width: 1152px) 1152px, 100vw';
export const heroImage = (url: string) => ({ ...responsiveSrc(url, [640, 960, 1280, 1680], 'wide'), sizes: HERO_SIZES });
