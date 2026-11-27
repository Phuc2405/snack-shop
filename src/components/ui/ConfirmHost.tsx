import { Dialog } from './Dialog';
import { Button } from './Button';
import { useConfirmStore } from '@/stores/confirm.store';
import { useLastValue } from '@/hooks/useLastValue';

/** Render hộp thoại cho `confirmDialog(...)`. Gắn một lần ở gốc app. */
export function ConfirmHost() {
  const live = useConfirmStore((s) => s.request);
  const request = useLastValue(live); // giữ chữ trong lúc hộp chạy hiệu ứng đóng
  const settle = useConfirmStore((s) => s.settle);
  return (
    <Dialog
      open={!!live}
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
