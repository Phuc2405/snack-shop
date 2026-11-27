import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, LogOut, MapPinned, ReceiptText, UserRound } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { useAccountStore, selectDefaultAddress } from '@/stores/account.store';
import { useUiStore } from '@/stores/ui.store';
import { toast } from '@/stores/toast.store';
import { toAppError } from '@/lib/errors';

const linkCls =
  'inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-xl border border-edge bg-white px-5 font-bold hover:bg-lemon-soft';

/** Nút tài khoản trên header (khi đã đăng nhập): sổ địa chỉ, đơn của tôi, quản lý (nhân viên), đăng xuất. */
export function AccountMenu() {
  const account = useAccountStore((s) => s.account);
  const address = useAccountStore(selectDefaultAddress);
  const signOut = useAccountStore((s) => s.signOut);
  const openProfiles = useUiStore((s) => s.openProfiles);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!account) return null;
  const shortName = address?.name.trim().split(/\s+/).pop() || account.email.split('@')[0];

  const logout = async () => {
    setBusy(true);
    try {
      await signOut();
      setOpen(false);
      toast.info('Đã đăng xuất. Giỏ hàng được lưu lại cho lần đăng nhập sau.');
    } catch (e) {
      toast.error(toAppError(e).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[2.75rem] max-w-[10rem] items-center gap-2 rounded-full px-3 font-bold transition-colors hover:bg-white sm:px-4"
        aria-label={`Tài khoản ${account.email}`}
      >
        <UserRound className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
        <span className="hidden truncate md:inline">{shortName}</span>
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Tài khoản" size="sm" tone="lemon" busy={busy}>
        <div className="space-y-4">
          <div className="rounded-2xl border border-edge bg-cream p-4">
            <p className="text-[0.9rem] text-ink-soft">Đăng nhập bằng</p>
            <p className="mt-1 break-all font-bold">{account.email}</p>
            {account.isStaff && <p className="mt-1 text-[0.9rem] font-bold text-tangerine-deep">Quản lý tiệm</p>}
            {address && (
              <p className="mt-2 text-ink-soft">
                Giao tới: {address.name} · <span className="tabular">{address.phone}</span>
                <br />
                {address.address}
              </p>
            )}
          </div>
          <div className="grid gap-2.5">
            {account.isStaff && (
              <Link viewTransition to="/admin" onClick={() => setOpen(false)} className={`${linkCls} bg-tangerine hover:bg-tangerine`}>
                <LayoutDashboard className="h-5 w-5" aria-hidden /> Vào trang quản lý
              </Link>
            )}
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                setOpen(false);
                openProfiles();
              }}
            >
              <MapPinned className="h-5 w-5" aria-hidden /> Sổ địa chỉ
            </Button>
            <Link viewTransition to="/orders" onClick={() => setOpen(false)} className={linkCls}>
              <ReceiptText className="h-5 w-5" aria-hidden /> Đơn của tôi
            </Link>
            <Button variant="ghost" size="lg" onClick={() => void logout()} loading={busy}>
              <LogOut className="h-5 w-5" aria-hidden /> Đăng xuất
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
