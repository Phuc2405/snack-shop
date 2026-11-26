import { Clock, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useShopStore } from '@/stores/shop.store';
import { DEMO } from '@/lib/demo';

export function Footer() {
  const s = useShopStore((st) => st.settings);
  return (
    <footer className="mt-16 border-t border-edge bg-cream-deep pb-28 text-ink sm:pb-10">
      <div className="shell grid gap-8 pt-8 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-xl font-bold">{s.name}</p>
          <p className="mt-1 text-ink-soft">{s.tagline}</p>
        </div>
        <ul className="space-y-2">
          {s.address && (
            <li className="flex gap-2">
              <MapPin className="mt-1 h-5 w-5 shrink-0" aria-hidden /> {s.address}
            </li>
          )}
          {s.hotline && (
            <li className="flex gap-2">
              <Phone className="mt-1 h-5 w-5 shrink-0" aria-hidden />
              <a
                href={`tel:${s.hotline.replace(/\s/g, '')}`}
                className="-my-2.5 inline-flex min-h-[2.75rem] items-center font-bold underline decoration-2 underline-offset-4"
              >
                {s.hotline}
              </a>
            </li>
          )}
          {s.openHours && (
            <li className="flex gap-2">
              <Clock className="mt-1 h-5 w-5 shrink-0" aria-hidden /> {s.openHours}
            </li>
          )}
        </ul>
        <div className="space-y-1 text-ink-soft lg:text-right">
          {!DEMO && (
            <Link to="/admin" className="inline-flex min-h-[2.75rem] items-center underline decoration-dotted underline-offset-4 hover:text-ink">
              Dành cho nhân viên
            </Link>
          )}
          <p className="text-[0.85rem]">
            Ảnh minh hoạ:{' '}
            <a href="https://unsplash.com/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              Unsplash
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
