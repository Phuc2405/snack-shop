import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, BellRing } from 'lucide-react';
import type { Order, OrderStatus } from '@/types/domain';
import { useLiveOrders } from '@/hooks/useLiveOrders';
import { useShopStore } from '@/stores/shop.store';
import { confirmDialog } from '@/stores/confirm.store';
import { toast } from '@/stores/toast.store';
import { setOrderStatus } from '@/services/orders.live';
import { auditOrder, type PriceIssue } from '@/domain/pricing';
import { ACTIVE_STATUSES, nextForwardStatus, statusLabel } from '@/domain/orderStatus';
import { formatPrice } from '@/lib/format';
import { toAppError } from '@/lib/errors';
import { Button } from '@/components/ui/Button';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { OrderCard } from '@/components/admin/OrderCard';
import { OrderDetail } from '@/components/admin/OrderDetail';
import { ShopOpenSwitch } from '@/components/admin/ShopOpenSwitch';
import { AdminHeader } from './AdminLayout';

type Tab = 'active' | OrderStatus;
const TABS: Tab[] = ['active', 'new', 'confirmed', 'preparing', 'delivering', 'done', 'cancelled'];
const TAB_LABEL = (t: Tab) => (t === 'active' ? 'Cần xử lý' : t === 'done' ? 'Xong hôm nay' : t === 'cancelled' ? 'Huỷ hôm nay' : statusLabel(t));

export default function DashboardPage() {
  const { orders, error, newCount, soundOn, enableSound } = useLiveOrders();
  const products = useShopStore((s) => s.products);
  const loadShop = useShopStore((s) => s.load);
  const [tab, setTab] = useState<Tab>('active');
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void loadShop({ silent: true }); // cần menu mới nhất để kiểm tra giá trong đơn
  }, [loadShop]);

  const issues = useMemo(() => {
    const m = new Map<string, PriceIssue[]>();
    if (!products.length) return m;
    for (const o of orders ?? []) m.set(o.id, auditOrder(o, products));
    return m;
  }, [orders, products]);

  const stats = useMemo(() => {
    const list = orders ?? [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const doneToday = list.filter((o) => o.status === 'done' && (o.createdAt?.getTime() ?? 0) >= today.getTime());
    return {
      active: list.filter((o) => ACTIVE_STATUSES.includes(o.status)).length,
      doneToday: doneToday.length,
      revenueToday: doneToday.reduce((s, o) => s + o.total, 0),
    };
  }, [orders]);

  const visible = useMemo(() => {
    const list = orders ?? [];
    const filtered = tab === 'active' ? list.filter((o) => ACTIVE_STATUSES.includes(o.status)) : list.filter((o) => o.status === tab);
    // Cần xử lý: đơn cũ nhất lên trước (ai đặt trước làm trước)
    return tab === 'active' || ACTIVE_STATUSES.includes(tab as OrderStatus) ? [...filtered].reverse() : filtered;
  }, [orders, tab]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(TABS.map((t) => [t, 0])) as Record<Tab, number>;
    for (const o of orders ?? []) {
      c[o.status]++;
      if (ACTIVE_STATUSES.includes(o.status)) c.active++;
    }
    return c;
  }, [orders]);

  const change = useCallback(async (o: Order, to: OrderStatus, note?: string) => {
    if (to === 'cancelled') {
      const ok = await confirmDialog({
        title: `Huỷ đơn ${o.code}?`,
        message: 'Khách sẽ thấy đơn bị tiệm huỷ. Nên gọi báo khách trước.',
        confirmLabel: 'Huỷ đơn',
        danger: true,
      });
      if (!ok) return;
    }
    setBusyId(o.id);
    try {
      await setOrderStatus(o, to, note);
      toast.success(`${o.code}: ${statusLabel(to, o.fulfillment)}`);
      if (to === 'done' || to === 'cancelled') setOpenId(null);
    } catch (e) {
      toast.error(toAppError(e).message);
    } finally {
      setBusyId(null);
    }
  }, []);

  const advance = useCallback(
    (o: Order) => {
      const next = nextForwardStatus(o.status);
      if (next) void change(o, next);
    },
    [change],
  );
  const open = useCallback((o: Order) => setOpenId(o.id), []);
  const opened = orders?.find((o) => o.id === openId) ?? null;

  return (
    <>
      <AdminHeader
        title="Đơn hàng"
        description="Cập nhật tức thì, không cần tải lại trang."
        actions={
          <>
            <ShopOpenSwitch />
            <Button variant={soundOn ? 'success' : 'secondary'} size="sm" onClick={enableSound} aria-pressed={soundOn}>
              {soundOn ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              {soundOn ? 'Đang bật âm báo' : 'Bật âm báo đơn mới'}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Đơn mới', value: newCount, cls: 'bg-tangerine' },
          { label: 'Cần xử lý', value: stats.active, cls: 'bg-lemon' },
          { label: 'Xong hôm nay', value: stats.doneToday, cls: 'bg-mint' },
          { label: 'Doanh thu hôm nay', value: formatPrice(stats.revenueToday), cls: 'bg-sky-soft' },
        ].map((s) => (
          <div key={s.label} className={`sticker p-4 ${s.cls}`}>
            <p className="text-[0.9rem] font-bold">{s.label}</p>
            <p className="mt-1 text-2xl font-bold tabular sm:text-3xl">{orders ? s.value : '…'}</p>
          </div>
        ))}
      </div>

      <div className="scrollbar-none -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:px-0" role="group" aria-label="Lọc đơn">
        {TABS.map((t) => (
          <button key={t} type="button" className="chip" aria-pressed={tab === t} onClick={() => setTab(t)}>
            {TAB_LABEL(t)} <span className="font-normal tabular text-ink-soft">{counts[t]}</span>
          </button>
        ))}
      </div>

      <div className="mt-4">
        {error ? (
          <EmptyState tone="error" title="Mất kết nối đơn hàng" description={error.message} action={<Button onClick={() => location.reload()}>Tải lại trang</Button>} />
        ) : !orders ? (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState title={tab === 'active' ? 'Chưa có đơn cần xử lý' : 'Không có đơn nào'} description={tab === 'active' ? 'Đơn mới sẽ hiện ở đây ngay khi khách đặt.' : undefined} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {visible.map((o) => (
              <OrderCard key={o.id} order={o} issues={issues.get(o.id) ?? []} busy={busyId === o.id} onAdvance={advance} onOpen={open} />
            ))}
          </div>
        )}
      </div>

      <OrderDetail
        order={opened}
        issues={opened ? (issues.get(opened.id) ?? []) : []}
        busy={busyId === openId}
        onClose={() => setOpenId(null)}
        onChange={(o, to, note) => void change(o, to, note)}
      />
    </>
  );
}
