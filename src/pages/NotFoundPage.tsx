import { Link, useRouteError } from 'react-router-dom';
import { FoodArt } from '@/components/art/FoodArt';

export function NotFoundPage() {
  return (
    <div className="shell flex flex-col items-center py-16 text-center">
      <div className="h-32 w-32 animate-wiggle">
        <FoodArt category="drink" />
      </div>
      <h1 className="mt-4 text-4xl">Ơ, lạc đường rồi!</h1>
      <p className="mt-2 text-lg text-ink-soft">Trang này không có trong menu.</p>
      <Link viewTransition to="/" className="mt-6 inline-flex min-h-[3rem] items-center rounded-xl border border-edge bg-tangerine px-6 font-bold shadow-sticker">
        Về trang chủ
      </Link>
    </div>
  );
}

/** Lỗi bất ngờ khi render — không lộ stack trace cho khách (chỉ log ở chế độ dev). */
export function RouteError() {
  const err = useRouteError();
  if (import.meta.env.DEV) console.error(err);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <h1 className="text-3xl">Có lỗi xảy ra</h1>
      <p className="mt-2 text-ink-soft">Bạn thử tải lại trang nhé.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-6 inline-flex min-h-[3rem] items-center rounded-xl border border-edge bg-tangerine px-6 font-bold shadow-sticker"
      >
        Tải lại trang
      </button>
    </div>
  );
}
