/**
 * Design tokens — OPTION 2 "tự nhiên": ảnh chụp thật là nhân vật chính, khung xung quanh lùi lại:
 * nền kem ấm, viền mảnh màu "edge", bóng đổ mềm như ánh sáng ban ngày, cam làm điểm nhấn.
 * Mọi màu dùng cho CHỮ đã kiểm tra tương phản WCAG AA (≥ 4.5:1) trên nền cream/white.
 * Chữ trên nền màu (tangerine, lemon, mint…) luôn là `ink`.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: '#FAF6F0', deep: '#F1E9DE' },
        // Viền mảnh, ấm (thay cho viền mực 2px của option 1)
        edge: { DEFAULT: '#E6DCCF', strong: '#CDBFAD' },
        ink: { DEFAULT: '#2B2118', soft: '#5C4A3D', faint: '#76624F' },
        tangerine: { DEFAULT: '#F2782D', soft: '#FCEADD', deep: '#B9430F' },
        lemon: { DEFAULT: '#F4E3BC', soft: '#FBF4E6' },
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
        // Tên giữ nguyên để không phải sửa component; giá trị = bóng mềm như ánh sáng tự nhiên
        sticker: '0 1px 2px rgba(43,33,24,.06), 0 6px 18px -8px rgba(43,33,24,.18)',
        'sticker-lg': '0 2px 4px rgba(43,33,24,.06), 0 16px 32px -12px rgba(43,33,24,.28)',
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
        // Hiệu ứng ĐÓNG (Dialog giữ lại ~180ms để chạy xong rồi mới close())
        'pop-out': { '0%': { opacity: '1', transform: 'none' }, '100%': { opacity: '0', transform: 'scale(.96) translateY(6px)' } },
        'slide-down': { '0%': { transform: 'none' }, '100%': { transform: 'translateY(100%)' } },
        'slide-right': { '0%': { transform: 'none' }, '100%': { transform: 'translateX(100%)' } },
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'none' } },
        wiggle: { '0%,100%': { transform: 'rotate(-4deg)' }, '50%': { transform: 'rotate(4deg)' } },
        // Nghiêng trái ↔ phải (hình đồ ăn ở trạng thái trống / chờ)
        tilt: {
          '0%,100%': { transform: 'rotate(-10deg)' },
          '50%': { transform: 'rotate(10deg) translateY(-4px)' },
        },
        bump: { '0%,100%': { transform: 'scale(1)' }, '40%': { transform: 'scale(1.25)' } },
      },
      animation: {
        'pop-in': 'pop-in .22s cubic-bezier(.2,.8,.3,1.2) both',
        'slide-up': 'slide-up .25s cubic-bezier(.2,.8,.3,1) both',
        'slide-left': 'slide-left .25s cubic-bezier(.2,.8,.3,1) both',
        fade: 'fade .2s ease-out both',
        'pop-out': 'pop-out .18s ease-in both',
        'slide-down': 'slide-down .2s ease-in both',
        'slide-right': 'slide-right .2s ease-in both',
        'fade-up': 'fade-up .28s cubic-bezier(.2,.8,.3,1) both',
        tilt: 'tilt 1.8s ease-in-out infinite',
        wiggle: 'wiggle 2.4s ease-in-out infinite',
        bump: 'bump .35s ease-out',
      },
    },
  },
  plugins: [],
};
