import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, ReceiptText, UserRound, UserRoundPen } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { useAccountStore, selectActiveProfile } from '@/stores/account.store';
import { useUiStore } from '@/stores/ui.store';
import { toast } from '@/stores/toast.store';

/** Nút tài khoản trên header (khi đã đăng nhập): xem thông tin, đơn của tôi, đăng xuất. */
export function AccountMenu() {
  const profile = useAccountStore(selectActiveProfile);
  const logout = useAccountStore((s) => s.logout);
  const openProfiles = useUiStore((s) => s.openProfiles);
  const [open, setOpen] = useState(false);
  if (!profile) return null;
  const firstName = profile.name.trim().split(/\s+/).pop() ?? profile.name;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[2.75rem] max-w-[10rem] items-center gap-2 rounded-full px-3 font-bold transition-colors hover:bg-white sm:px-4"
        aria-label={`Tài khoản của ${profile.name}`}
      >
        <UserRound className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
        <span className="hidden truncate md:inline">{firstName}</span>
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Tài khoản" size="sm" tone="lemon">
        <div className="space-y-4">
          <div className="rounded-2xl border border-edge bg-cream p-4">
            <p className="text-[0.9rem] text-ink-soft">Đang đặt món với thông tin</p>
            <p className="mt-1 font-bold">{profile.name}</p>
            <p className="tabular text-ink-soft">{profile.phone}</p>
            <p className="text-ink-soft">{profile.address}</p>
          </div>
          <div className="grid gap-2.5">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                setOpen(false);
                openProfiles();
              }}
            >
              <UserRoundPen className="h-5 w-5" aria-hidden /> Đổi / tạo thông tin người đặt
            </Button>
            <Link
              to="/orders"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-xl border border-edge bg-white px-5 font-bold hover:bg-lemon-soft"
            >
              <ReceiptText className="h-5 w-5" aria-hidden /> Đơn của tôi
            </Link>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => {
                setOpen(false);
                logout();
                toast.info('Đã đăng xuất. Giỏ hàng của bạn được lưu lại cho lần đăng nhập sau.');
              }}
            >
              <LogOut className="h-5 w-5" aria-hidden /> Đăng xuất
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
