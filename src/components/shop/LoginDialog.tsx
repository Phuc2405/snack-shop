import { Dialog } from '@/components/ui/Dialog';
import { useUiStore } from '@/stores/ui.store';
import { useAccountStore, type LoginResult } from '@/stores/account.store';
import { toast } from '@/stores/toast.store';
import { useShopStore } from '@/stores/shop.store';
import { useCartStore } from '@/stores/cart.store';
import { MAX_LINES } from '@/domain/cart';
import type { ProfileValues } from '@/schemas/checkout.schema';
import { ProfileForm } from './ProfileForm';

function mergeMessage(name: string, r: LoginResult): string {
  const hi = r.returning ? `Chào mừng ${name} quay lại!` : `Chào ${name}!`;
  const parts: string[] = [];
  if (r.added) parts.push(`thêm ${r.added} món mới`);
  if (r.merged) parts.push(`${r.merged} món trùng giữ số lượng lớn hơn`);
  return parts.length ? `${hi} Đã gộp giỏ: ${parts.join(', ')}.` : hi;
}

/** Đăng nhập bằng tên – SĐT – địa chỉ. SĐT là định danh: nhập lại cùng SĐT → về đúng tài khoản + giỏ cũ. */
export function LoginDialog() {
  const open = useUiStore((s) => s.loginOpen);
  const reason = useUiStore((s) => s.loginReason);
  const close = useUiStore((s) => s.closeLogin);
  const login = useAccountStore((s) => s.login);

  const submit = (v: ProfileValues) => {
    const then = useUiStore.getState().afterLogin;
    const r = login(v);
    // Giỏ đã lưu từ lần trước có thể lệch menu hiện tại (giá đổi, món hết) → đối chiếu ngay, báo nếu có thay đổi
    const menu = useShopStore.getState().products;
    if (menu.length && useCartStore.getState().reconcile(menu).length) {
      toast.info('Một vài món trong giỏ đã đổi giá hoặc tạm hết, giỏ đã được cập nhật.');
    }
    toast.success(mergeMessage(v.name, r));
    if (r.dropped) toast.info(`Giỏ tối đa ${MAX_LINES} món khác nhau, ${r.dropped} món chưa gộp được.`);
    close();
    then?.();
  };

  return (
    <Dialog open={open} onClose={close} title="Đăng nhập" size="sm" tone="lemon">
      {open && (
        <div className="space-y-4">
          <p className="text-ink-soft">
            {reason || 'Đăng nhập để lưu giỏ hàng, xem lại đơn đã đặt và không phải nhập lại thông tin mỗi lần.'}
          </p>
          <ProfileForm submitLabel="Đăng nhập" onSubmit={submit} />
          <p className="text-[0.85rem] text-ink-faint">
            Bản xem thử: tài khoản chỉ lưu trên máy này. Giỏ đang chọn sẽ được gộp vào giỏ của tài khoản.
          </p>
        </div>
      )}
    </Dialog>
  );
}
