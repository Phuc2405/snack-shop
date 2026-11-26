import { useEffect, useState } from 'react';
import { Check, MapPin, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { useUiStore } from '@/stores/ui.store';
import { useAccountStore } from '@/stores/account.store';
import { toast } from '@/stores/toast.store';
import { MAX_PROFILES, type Profile } from '@/services/account.repo';
import { cn } from '@/lib/cn';
import { ProfileForm } from './ProfileForm';

/** Sổ thông tin người đặt: chọn, sửa, tạo mới (vd đặt hộ người nhà, giao về công ty). */
export function ProfilesDialog() {
  const open = useUiStore((s) => s.profilesOpen);
  const close = useUiStore((s) => s.closeProfiles);
  const profiles = useAccountStore((s) => s.profiles);
  const activeId = useAccountStore((s) => s.activeId);
  const { selectProfile, saveProfile, removeProfile } = useAccountStore.getState();
  // null = đang xem danh sách · 'new' = tạo mới · Profile = đang sửa
  const [editing, setEditing] = useState<Profile | 'new' | null>(null);

  useEffect(() => {
    if (open) setEditing(null);
  }, [open]);

  const title = editing === 'new' ? 'Thông tin mới' : editing ? 'Sửa thông tin' : 'Thông tin người đặt';

  return (
    <Dialog open={open} onClose={close} title={title} size="sm" tone="lemon">
      {editing ? (
        <ProfileForm
          key={editing === 'new' ? 'new' : editing.id}
          initial={editing === 'new' ? undefined : editing}
          submitLabel={editing === 'new' ? 'Lưu và dùng thông tin này' : 'Lưu thay đổi'}
          onCancel={() => setEditing(null)}
          onSubmit={(v) => {
            saveProfile(v, editing === 'new' ? undefined : editing.id);
            toast.success('Đã lưu thông tin người đặt');
            close();
          }}
        />
      ) : (
        <div className="space-y-3">
          <ul className="space-y-2.5" role="radiogroup" aria-label="Chọn thông tin người đặt">
            {profiles.map((p) => {
              const active = p.id === activeId;
              return (
                <li key={p.id} className={cn('rounded-2xl border p-3.5 transition-colors', active ? 'border-ink bg-lemon-soft' : 'border-edge bg-white')}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      selectProfile(p.id);
                      close();
                    }}
                    className="flex w-full items-start gap-3 text-left"
                  >
                    <span
                      className={cn('mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2', active ? 'border-ink bg-ink text-cream' : 'border-edge-strong')}
                      aria-hidden
                    >
                      {active && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{p.name}</span>
                      <span className="flex items-center gap-1.5 text-ink-soft">
                        <Phone className="h-4 w-4 shrink-0" aria-hidden /> <span className="tabular">{p.phone}</span>
                      </span>
                      <span className="flex items-start gap-1.5 text-ink-soft">
                        <MapPin className="mt-1 h-4 w-4 shrink-0" aria-hidden /> {p.address}
                      </span>
                    </span>
                  </button>
                  <div className="mt-2 flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(p)}
                      className="inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-full px-3 font-bold hover:bg-white"
                    >
                      <Pencil className="h-4 w-4" aria-hidden /> Sửa
                    </button>
                    {profiles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeProfile(p.id)}
                        className="inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-full px-3 text-ink-soft hover:bg-danger-soft hover:text-danger"
                        aria-label={`Xoá thông tin ${p.name}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden /> Xoá
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {profiles.length < MAX_PROFILES ? (
            <Button variant="secondary" size="lg" className="w-full" onClick={() => setEditing('new')}>
              <Plus className="h-5 w-5" aria-hidden /> Tạo thông tin mới
            </Button>
          ) : (
            <p className="text-[0.9rem] text-ink-faint">Tối đa {MAX_PROFILES} thông tin. Xoá bớt để tạo mới.</p>
          )}
        </div>
      )}
    </Dialog>
  );
}
