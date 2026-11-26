/**
 * Design tokens — phong cách "sticker kẹo ngọt":
 * nền kem, khối màu pastel tươi, viền mực đậm 2px, bóng đổ cứng (không blur).
 * Mọi màu dùng cho CHỮ đã kiểm tra tương phản WCAG AA (≥ 4.5:1) trên nền cream/white.
 * Chữ trên nền màu (tangerine, lemon, mint…) luôn là `ink`.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: '#FFF8EC', deep: '#FFEFD6' },
        ink: { DEFAULT: '#2B2118', soft: '#5C4A3D', faint: '#76624F' },
        tangerine: { DEFAULT: '#FF7A1A', soft: '#FFE2CC', deep: '#C2410C' },
        lemon: { DEFAULT: '#FFD43B', soft: '#FFF3C4' },
        mint: { DEFAULT: '#5FD3A0', soft: '#DAF6E8', deep: '#166B45' },
        berry: { DEFAULT: '#FF5C8A', soft: '#FFE0EA', deep: '#B4235A' },
        sky: { DEFAULT: '#7CC8FF', soft: '#E0F1FF', deep: '#1D5F94' },
        danger: { DEFAULT: '#C62828', soft: '#FDE3E3' },
      },
      fontFamily: {
        // Phong cách Georgia toàn trang. Gelasio (bản sao mở của Georgia, đủ tiếng Việt) đứng trước,
        // vì Georgia gốc vỡ dấu chữ hai dấu (ầ, ế…). Georgia chỉ là dự phòng khi font chưa tải xong.
        sans: ['Gelasio', 'Georgia', '"Noto Serif"', '"Times New Roman"', 'serif'],
        serif: ['Gelasio', 'Georgia', '"Noto Serif"', '"Times New Roman"', 'serif'],
      },
      borderRadius: {
        DEFAULT: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        sticker: '3px 3px 0 0 #2B2118',
        'sticker-lg': '5px 5px 0 0 #2B2118',
        soft: '0 10px 30px -12px rgba(43,33,24,.25)',
      },
      maxWidth: { shell: '72rem' },
      keyframes: {
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(.94) translateY(8px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        'slide-up': { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'none' } },
        'slide-left': { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'none' } },
        fade: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        wiggle: { '0%,100%': { transform: 'rotate(-4deg)' }, '50%': { transform: 'rotate(4deg)' } },
        bump: { '0%,100%': { transform: 'scale(1)' }, '40%': { transform: 'scale(1.25)' } },
      },
      animation: {
        'pop-in': 'pop-in .22s cubic-bezier(.2,.8,.3,1.2) both',
        'slide-up': 'slide-up .25s cubic-bezier(.2,.8,.3,1) both',
        'slide-left': 'slide-left .25s cubic-bezier(.2,.8,.3,1) both',
        fade: 'fade .2s ease-out both',
        wiggle: 'wiggle 2.4s ease-in-out infinite',
        bump: 'bump .35s ease-out',
      },
    },
  },
  plugins: [],
};
