import { Dialog } from './Dialog';
import { Button } from './Button';
import { useConfirmStore } from '@/stores/confirm.store';

/** Render hộp thoại cho `confirmDialog(...)`. Gắn một lần ở gốc app. */
export function ConfirmHost() {
  const request = useConfirmStore((s) => s.request);
  const settle = useConfirmStore((s) => s.settle);
  return (
    <Dialog
      open={!!request}
      onClose={() => settle(false)}
      title={request?.title ?? ''}
      size="sm"
      tone={request?.danger ? 'berry' : 'lemon'}
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={() => settle(false)}>
            Quay lại
          </Button>
          <Button variant={request?.danger ? 'danger' : 'primary'} onClick={() => settle(true)} autoFocus>
            {request?.confirmLabel ?? 'Đồng ý'}
          </Button>
        </div>
      }
    >
      {request?.message && <p className="text-ink-soft">{request.message}</p>}
    </Dialog>
  );
}
