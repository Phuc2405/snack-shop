import type { Category } from '@/types/domain';
import { cn } from '@/lib/cn';

/**
 * Hình minh hoạ SVG phong cách sticker (viền mực 2.5px, màu khối, không gradient).
 * Dùng khi món chưa có ảnh chụp, và cho hero. Vẽ tay bằng path đơn giản → vài trăm byte, không request.
 */

const INK = '#2B2118';
const S = { stroke: INK, strokeWidth: 2.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

// Bảng màu biến thể: mỗi món một màu riêng (chọn theo tên) để các món cùng loại dễ phân biệt
const DRINK = ['#F4C99B', '#FFB4C8', '#B8E68A', '#FF9A7A', '#FFE07A', '#C9B6FF'];
const CAKE = [
  ['#FFE2A8', '#FFC2D4'],
  ['#F3D2A2', '#8B5A3C'],
  ['#FFF1C9', '#B8E68A'],
  ['#FFE2A8', '#FFE07A'],
];
const SNACK = ['#FF7A1A', '#FF5C8A', '#7CC8FF', '#5FD3A0'];
const COMBO = ['#5FD3A0', '#7CC8FF', '#FFD43B', '#FF9A7A'];
const pick = <T,>(list: T[], v: number) => list[v % list.length]!;

function Drink({ v }: { v: number }) {
  return (
    <g>
      {/* ống hút */}
      <path d="M58 14 L52 40" {...S} strokeWidth={6} stroke={INK} />
      <path d="M58 14 L52 40" stroke="#FF5C8A" strokeWidth={2.5} strokeLinecap="round" />
      {/* nắp vòm */}
      <path d="M26 40 Q50 20 74 40 Z" fill="#FFFFFF" {...S} />
      <rect x="22" y="38" width="56" height="8" rx="4" fill="#FFFFFF" {...S} />
      {/* thân ly */}
      <path d="M27 46 L32 88 Q33 92 37 92 L63 92 Q67 92 68 88 L73 46 Z" fill={pick(DRINK, v)} {...S} />
      {/* trà sữa phân lớp */}
      <path d="M29 58 Q50 54 71 58" fill="none" {...S} strokeWidth={2} />
      {/* trân châu */}
      {[
        [38, 82],
        [46, 85],
        [54, 82],
        [62, 85],
        [42, 76],
        [58, 77],
        [50, 78],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="3.4" fill={INK} />
      ))}
      {/* mặt cười */}
      <circle cx="42" cy="66" r="2" fill={INK} />
      <circle cx="58" cy="66" r="2" fill={INK} />
      <path d="M46 70 Q50 73 54 70" fill="none" {...S} strokeWidth={2} />
      <circle cx="37" cy="69" r="2.6" fill="#FF5C8A" opacity=".55" />
      <circle cx="63" cy="69" r="2.6" fill="#FF5C8A" opacity=".55" />
    </g>
  );
}

function Cake({ v }: { v: number }) {
  const [sponge, cream] = pick(CAKE, v);
  return (
    <g>
      {/* đĩa */}
      <ellipse cx="50" cy="86" rx="36" ry="7" fill="#FFFFFF" {...S} />
      {/* lát bánh */}
      <path d="M18 78 L18 56 L82 44 L82 66 Z" fill={sponge} {...S} />
      <path d="M18 56 L50 30 L82 44 Z" fill={cream} {...S} />
      <path d="M18 67 L82 55" fill="none" stroke="#FF5C8A" strokeWidth={4} />
      <path d="M18 67 L82 55" fill="none" {...S} strokeWidth={1.5} />
      {/* kem chảy */}
      <path d="M30 47 Q32 54 35 50 Q38 58 42 49 Q45 54 48 46" fill={cream} {...S} strokeWidth={2} />
      {/* dâu */}
      <path d="M50 30 Q44 18 52 16 Q60 16 56 28 Z" fill="#FF5C8A" {...S} />
      <path d="M50 17 L54 12 M53 17 L58 13" {...S} stroke="#166B45" strokeWidth={2.5} />
      <circle cx="52" cy="22" r=".9" fill="#FFF3C4" />
      <circle cx="54" cy="25" r=".9" fill="#FFF3C4" />
    </g>
  );
}

function Snack({ v }: { v: number }) {
  return (
    <g>
      {/* que khoai */}
      {[
        [30, 22, -12],
        [40, 16, -5],
        [50, 14, 2],
        [60, 17, 8],
        [69, 23, 14],
        [45, 20, -2],
        [56, 21, 5],
      ].map(([x, y, r]) => (
        <rect key={`${x}`} x={x! - 4} y={y} width="8" height="40" rx="2" fill="#FFD43B" {...S} transform={`rotate(${r} ${x} ${y! + 40})`} />
      ))}
      {/* hộp */}
      <path d="M24 46 L76 46 L70 90 Q69 93 66 93 L34 93 Q31 93 30 90 Z" fill={pick(SNACK, v)} {...S} />
      <path d="M24 46 Q50 58 76 46" fill={pick(SNACK, v)} {...S} />
      {/* mặt cười */}
      <circle cx="42" cy="70" r="2.2" fill={INK} />
      <circle cx="58" cy="70" r="2.2" fill={INK} />
      <path d="M45 76 Q50 80 55 76" fill="none" {...S} strokeWidth={2} />
      <path d="M36 84 L64 84" {...S} stroke="#FFF3C4" strokeWidth={3} />
    </g>
  );
}

function Combo({ v }: { v: number }) {
  return (
    <g>
      {/* hộp quà */}
      <rect x="18" y="44" width="64" height="46" rx="6" fill={pick(COMBO, v)} {...S} />
      <rect x="14" y="34" width="72" height="14" rx="5" fill="#DAF6E8" {...S} />
      <rect x="44" y="34" width="12" height="56" fill="#FF5C8A" {...S} />
      {/* nơ */}
      <path d="M50 34 Q36 16 30 26 Q26 34 50 34 Z" fill="#FF5C8A" {...S} />
      <path d="M50 34 Q64 16 70 26 Q74 34 50 34 Z" fill="#FF5C8A" {...S} />
      <circle cx="50" cy="33" r="4.5" fill="#FFD43B" {...S} />
      {/* sao lấp lánh */}
      <path d="M26 62 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#FFF3C4" {...S} strokeWidth={1.5} />
      <path d="M70 66 l1.5 3.5 3.5 1.5 -3.5 1.5 -1.5 3.5 -1.5 -3.5 -3.5 -1.5 3.5 -1.5z" fill="#FFF3C4" {...S} strokeWidth={1.5} />
    </g>
  );
}

const ART: Record<Category, (p: { v: number }) => React.JSX.Element> = { drink: Drink, cake: Cake, snack: Snack, combo: Combo };

/** Băm chuỗi → số nhỏ ổn định (cùng tên món luôn ra cùng màu). */
export function variantOf(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

export function FoodArt({
  category,
  className,
  title,
  seed = '',
}: {
  category: Category;
  className?: string;
  title?: string;
  /** Tên món — để chọn biến thể màu */
  seed?: string;
}) {
  const Art = ART[category];
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn('h-full w-full', className)}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <Art v={variantOf(seed)} />
    </svg>
  );
}

/** Ngôi sao lấp lánh trang trí */
export function Sparkle({ className, fill = '#FFD43B' }: { className?: string; fill?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 1 L14.6 9.4 L23 12 L14.6 14.6 L12 23 L9.4 14.6 L1 12 L9.4 9.4 Z" fill={fill} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/** Đường lượn sóng chia khối (màu theo `currentColor`). */
export function Wave({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1200 40" preserveAspectRatio="none" className={cn('block h-6 w-full sm:h-8', className)} aria-hidden>
      <path d="M0 20 Q50 0 100 20 T200 20 T300 20 T400 20 T500 20 T600 20 T700 20 T800 20 T900 20 T1000 20 T1100 20 T1200 20 V40 H0 Z" fill="currentColor" />
      <path d="M0 20 Q50 0 100 20 T200 20 T300 20 T400 20 T500 20 T600 20 T700 20 T800 20 T900 20 T1000 20 T1100 20 T1200 20" fill="none" stroke={INK} strokeWidth="3" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
