import { useEffect, useState } from 'react';
import { Check, MapPin, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { useUiStore } from '@/stores/ui.store';
import { useAccountStore } from '@/stores/account.store';
import { toast } from '@/stores/toast.store';
import { MAX_ADDRESSES } from '@/services/mappers';
import { toAppError } from '@/lib/errors';
import type { Address } from '@/types/domain';
import { cn } from '@/lib/cn';
import { ProfileForm } from './ProfileForm';

/**
 * Sổ địa chỉ nhận hàng của tài khoản (tên người nhận – SĐT – địa chỉ), lưu trên Firestore users/{uid}
 * nên đăng nhập máy khác vẫn còn. Chọn một địa chỉ = đặt làm mặc định cho lần đặt món sau.
 */
export function ProfilesDialog() {
  const open = useUiStore((s) => s.profilesOpen);
  const close = useUiStore((s) => s.closeProfiles);
  const addresses = useAccountStore((s) => s.addresses);
  const defaultId = useAccountStore((s) => s.defaultAddressId);
  const { saveAddress, removeAddress, setDefaultAddress } = useAccountStore.getState();
  // null = đang xem danh sách · 'new' = thêm mới · Address = đang sửa
  const [editing, setEditing] = useState<Address | 'new' | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Chỉ chạy khi vừa mở hộp: sổ trống thì vào thẳng form thêm địa chỉ
    if (open) setEditing(useAccountStore.getState().addresses.length ? null : 'new');
  }, [open]);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    try {
      await fn();
      if (ok) toast.success(ok);
      return true;
    } catch (e) {
      toast.error(toAppError(e).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const title = editing === 'new' ? 'Thêm địa chỉ' : editing ? 'Sửa địa chỉ' : 'Sổ địa chỉ';

  return (
    <Dialog open={open} onClose={close} title={title} size="sm" tone="lemon" busy={busy}>
      {editing ? (
        <ProfileForm
          key={editing === 'new' ? 'new' : editing.id}
          initial={editing === 'new' ? undefined : editing}
          submitLabel={editing === 'new' ? 'Lưu địa chỉ' : 'Lưu thay đổi'}
          onCancel={addresses.length ? () => setEditing(null) : close}
          onSubmit={async (v) => {
            if (await run(() => saveAddress(v, editing === 'new' ? undefined : editing.id), 'Đã lưu địa chỉ')) setEditing(null);
          }}
        />
      ) : (
        <div className="space-y-3">
          <ul className="space-y-2.5" role="radiogroup" aria-label="Chọn địa chỉ mặc định">
            {addresses.map((a) => {
              const active = a.id === defaultId;
              return (
                <li key={a.id} className={cn('rounded-2xl border p-3.5 transition-colors', active ? 'border-ink bg-lemon-soft' : 'border-edge bg-white')}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={busy}
                    onClick={() => void run(() => setDefaultAddress(a.id)).then((ok) => ok && close())}
                    className="flex w-full items-start gap-3 text-left"
                  >
                    <span
                      className={cn('mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2', active ? 'border-ink bg-ink text-cream' : 'border-edge-strong')}
                      aria-hidden
                    >
                      {active && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{a.name}</span>
                      <span className="flex items-center gap-1.5 text-ink-soft">
                        <Phone className="h-4 w-4 shrink-0" aria-hidden /> <span className="tabular">{a.phone}</span>
                      </span>
                      <span className="flex items-start gap-1.5 text-ink-soft">
                        <MapPin className="mt-1 h-4 w-4 shrink-0" aria-hidden /> {a.address}
                      </span>
                    </span>
                  </button>
                  <div className="mt-2 flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(a)}
                      className="inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-full px-3 font-bold hover:bg-white"
                    >
                      <Pencil className="h-4 w-4" aria-hidden /> Sửa
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void run(() => removeAddress(a.id), 'Đã xoá địa chỉ')}
                      className="inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-full px-3 text-ink-soft hover:bg-danger-soft hover:text-danger"
                      aria-label={`Xoá địa chỉ của ${a.name}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden /> Xoá
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          {addresses.length < MAX_ADDRESSES ? (
            <Button variant="secondary" size="lg" className="w-full" onClick={() => setEditing('new')}>
              <Plus className="h-5 w-5" aria-hidden /> Thêm địa chỉ mới
            </Button>
          ) : (
            <p className="text-[0.9rem] text-ink-faint">Tối đa {MAX_ADDRESSES} địa chỉ. Xoá bớt để thêm mới.</p>
          )}
        </div>
      )}
    </Dialog>
  );
}
