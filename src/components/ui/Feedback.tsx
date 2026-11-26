import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-ink/10', className)} aria-hidden />;
}

/** Khung chờ cho lưới thẻ món — giữ đúng kích thước thẻ thật để trang không "nhảy" (CLS). */
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4" role="status" aria-label="Đang tải menu">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="sticker overflow-hidden">
          <Skeleton className="aspect-square rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  tone = 'neutral',
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  tone?: 'neutral' | 'error';
}) {
  return (
    <div className={cn('flex flex-col items-center px-4 py-12 text-center', className)}>
      {icon && <div className="mb-4">{icon}</div>}
      <p className={cn('text-xl font-bold', tone === 'error' ? 'text-danger' : 'text-ink')}>{title}</p>
      {description && <p className="mt-2 max-w-md text-ink-soft">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function PageLoader({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status">
      <span className="flex items-center gap-3 text-lg text-ink-soft">
        <span className="h-4 w-4 animate-bounce rounded-full border-2 border-ink bg-tangerine" />
        {label}
      </span>
    </div>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border-2 border-ink px-2.5 py-0.5 text-[0.8rem] font-bold leading-5', className)}>
      {children}
    </span>
  );
}
