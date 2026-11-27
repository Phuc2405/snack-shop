import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, LogIn, ReceiptText } from 'lucide-react';
import { useAccountStore } from '@/stores/account.store';
import { useUiStore } from '@/stores/ui.store';
import { orderRepo } from '@/services/order.repo';
import { useAsync } from '@/hooks/useAsync';
import { statusLabel } from '@/domain/orderStatus';
import { Button } from '@/components/ui/Button';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { StatusPill } from '@/components/shop/StatusPill';
import { formatDateTime, formatPrice } from '@/lib/format';
import { DEMO } from '@/lib/demo';

export default function OrdersPage() {
  const account = useAccountStore((s) => s.account);
  const accountStatus = useAccountStore((s) => s.status);
  const openLogin = useUiStore((s) => s.openLogin);
  useEffect(() => void useAccountStore.getState().init(), []);
  // Đổi tài khoản → tải lại; chưa đăng nhập vẫn thấy đơn đã đặt trên máy này (phiên ẩn danh)
  const ready = DEMO || accountStatus === 'ready';
  const { data, loading, error, reload } = useAsync(() => orderRepo.listMine(), [account?.uid, ready], { pollMs: 30_000, enabled: ready });

  return (
    <div className="shell max-w-2xl py-6 sm:py-10">
      <h1 className="text-3xl sm:text-4xl">Đơn của tôi</h1>
      <p className="mt-1 text-ink-soft">
        {account ? `Đơn đặt bằng tài khoản ${account.email}.` : 'Đơn đã đặt trên trình duyệt này.'}
      </p>
      {!account && !DEMO && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-edge-strong bg-cream p-4">
          <LogIn className="h-6 w-6 shrink-0" aria-hidden />
          <p className="min-w-0 flex-1">Đăng nhập để xem đơn trên mọi máy và lưu sổ địa chỉ.</p>
          <Button variant="secondary" onClick={() => openLogin()}>
            Đăng nhập
          </Button>
        </div>
      )}
      <div className="mt-6">
        {loading && !data ? (
          <div className="space-y-3" role="status" aria-label="Đang tải">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : error && !data ? (
          <EmptyState tone="error" title="Chưa tải được đơn" description={error.message} action={<Button onClick={reload}>Thử lại</Button>} />
        ) : !data?.length ? (
          <EmptyState
            icon={<ReceiptText className="h-14 w-14 text-tangerine" strokeWidth={1.75} />}
            title="Bạn chưa có đơn nào"
            action={
              <Link viewTransition to="/" className="inline-flex min-h-[3rem] items-center rounded-xl border border-edge bg-tangerine px-6 font-bold shadow-sticker">
                Đặt món ngay
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {data.map((o) => (
              <li key={o.id}>
                <Link viewTransition to={`/orders/${o.id}`} className="sticker sticker-hover flex items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold tabular">{o.code}</span>
                      <StatusPill status={o.status} label={statusLabel(o.status, o.fulfillment)} />
                    </div>
                    <p className="mt-1 truncate text-ink-soft">{o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</p>
                    <p className="text-[0.9rem] text-ink-faint">{formatDateTime(o.createdAt)}</p>
                  </div>
                  <span className="price shrink-0">{formatPrice(o.total)}</span>
                  <ChevronRight className="h-5 w-5 shrink-0" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
