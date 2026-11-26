import { useMemo, useState } from 'react';
import { listOrdersBetween } from '@/services/orders.live';
import { useAsync } from '@/hooks/useAsync';
import { formatPrice } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { AdminHeader } from './AdminLayout';

type Range = 'today' | '7d' | 'month';
const RANGES: { key: Range; label: string }[] = [
  { key: 'today', label: 'Hôm nay' },
  { key: '7d', label: '7 ngày' },
  { key: 'month', label: 'Tháng này' },
];

function rangeDates(r: Range): [Date, Date] {
  const end = new Date();
  end.setHours(24, 0, 0, 0);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (r === '7d') start.setDate(start.getDate() - 6);
  if (r === 'month') start.setDate(1);
  return [start, end];
}

export default function ReportPage() {
  const [range, setRange] = useState<Range>('today');
  const { data, loading, error, reload } = useAsync(() => listOrdersBetween(...rangeDates(range)), [range]);

  const report = useMemo(() => {
    const orders = data ?? [];
    const done = orders.filter((o) => o.status === 'done');
    const items = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const o of done) {
      for (const it of o.items) {
        const cur = items.get(it.productId) ?? { name: it.name, qty: 0, revenue: 0 };
        cur.qty += it.qty;
        cur.revenue += it.qty * it.price;
        items.set(it.productId, cur);
      }
    }
    const revenue = done.reduce((s, o) => s + o.total, 0);
    return {
      total: orders.length,
      done: done.length,
      cancelled: orders.filter((o) => o.status === 'cancelled').length,
      revenue,
      avg: done.length ? Math.round(revenue / done.length) : 0,
      top: [...items.values()].sort((a, b) => b.qty - a.qty).slice(0, 10),
    };
  }, [data]);

  const maxQty = report.top[0]?.qty ?? 1;

  return (
    <>
      <AdminHeader title="Báo cáo" description="Chỉ tính đơn đã hoàn tất." />
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Khoảng thời gian">
        {RANGES.map((r) => (
          <button key={r.key} type="button" className="chip" aria-pressed={range === r.key} onClick={() => setRange(r.key)}>
            {r.label}
          </button>
        ))}
      </div>

      {error ? (
        <EmptyState tone="error" title="Chưa tải được báo cáo" description={error.message} action={<Button onClick={reload}>Thử lại</Button>} />
      ) : loading && !data ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'Doanh thu', value: formatPrice(report.revenue), cls: 'bg-mint' },
              { label: 'Đơn hoàn tất', value: report.done, cls: 'bg-lemon' },
              { label: 'Giá trị TB / đơn', value: formatPrice(report.avg), cls: 'bg-sky-soft' },
              { label: 'Đơn huỷ', value: `${report.cancelled}/${report.total}`, cls: 'bg-berry-soft' },
            ].map((s) => (
              <div key={s.label} className={`sticker p-4 ${s.cls}`}>
                <p className="text-[0.9rem] font-bold">{s.label}</p>
                <p className="mt-1 text-2xl font-bold tabular">{s.value}</p>
              </div>
            ))}
          </div>

          <section className="sticker mt-6 p-5 sm:p-6">
            <h2 className="text-xl">Món bán chạy</h2>
            {report.top.length === 0 ? (
              <p className="mt-3 text-ink-soft">Chưa có đơn hoàn tất trong khoảng này.</p>
            ) : (
              <ol className="mt-4 space-y-3">
                {report.top.map((t, i) => (
                  <li key={t.name} className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-3">
                    <span className="font-bold tabular text-ink-faint">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate font-bold">{t.name}</p>
                      <div className="mt-1 h-3 overflow-hidden rounded-full border border-edge bg-white">
                        <div className="h-full bg-tangerine" style={{ width: `${(t.qty / maxQty) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-right tabular">
                      <span className="font-bold">{t.qty}</span> phần
                      <span className="block text-[0.85rem] text-ink-soft">{formatPrice(t.revenue)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </>
  );
}
