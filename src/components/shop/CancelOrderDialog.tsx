import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { SelectField, TextAreaField } from '@/components/ui/FormField';
import { CANCEL_NOTE_MAX, validateCancel, type CancelReason } from '@/domain/cancelReasons';
import { cleanText } from '@/lib/sanitize';

/**
 * Hộp huỷ đơn (dùng chung khách + nhân viên): BẮT BUỘC chọn lý do (mặc định "-- Chọn lý do --"),
 * ghi chú không bắt buộc (trừ "Lý do khác"). Gửi xong mới đóng; lỗi mạng thì giữ hộp để bấm lại.
 */
export function CancelOrderDialog({
  open,
  title,
  description,
  reasons,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  reasons: CancelReason[];
  onClose: () => void;
  onConfirm: (reason: string, note: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReason('');
    setNote('');
    setError(null);
  }, [open]);

  const submit = async () => {
    const clean = cleanText(note);
    const err = validateCancel(reason, clean, reasons);
    setError(err);
    if (err) return;
    setBusy(true);
    try {
      await onConfirm(reason, clean);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={busy}
      size="sm"
      tone="berry"
      title={title}
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Quay lại
          </Button>
          <Button variant="danger" onClick={() => void submit()} loading={busy}>
            Huỷ đơn
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {description && <p className="text-ink-soft">{description}</p>}
        <SelectField
          label="Lý do huỷ"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setError(null);
          }}
          error={error && !reason ? error : undefined}
          required
        >
          <option value="" disabled>
            -- Chọn lý do --
          </option>
          {reasons.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </SelectField>
        <TextAreaField
          label={reason === 'other' ? 'Ghi chú (bắt buộc với "Lý do khác")' : 'Ghi chú (không bắt buộc)'}
          rows={3}
          maxLength={CANCEL_NOTE_MAX}
          placeholder="VD: đặt lại đơn khác, đổi giờ nhận…"
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setError(null);
          }}
          error={error && reason ? error : undefined}
          hint={`${note.length}/${CANCEL_NOTE_MAX}`}
        />
      </div>
    </Dialog>
  );
}
