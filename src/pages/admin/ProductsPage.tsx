import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Trash2, Wand2 } from 'lucide-react';
import type { Product, ProductInput } from '@/types/domain';
import { CATEGORIES } from '@/config/catalog';
import { productRepo } from '@/services/product.repo';
import { sortProducts } from '@/services/mappers';
import { useAdminMenu } from '@/stores/adminMenu.store';
import { confirmDialog } from '@/stores/confirm.store';
import { toast } from '@/stores/toast.store';
import { toAppError } from '@/lib/errors';
import { formatPrice } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { EmptyState, Skeleton, Badge } from '@/components/ui/Feedback';
import { ProductImage } from '@/components/shop/ProductImage';
import { ProductForm } from '@/components/admin/ProductForm';
import { AdminHeader } from './AdminLayout';

export default function ProductsPage() {
  const products = useAdminMenu((s) => s.products);
  const status = useAdminMenu((s) => s.status);
  const loadError = useAdminMenu((s) => s.error);
  const load = useAdminMenu((s) => s.load);
  const setProducts = useAdminMenu((s) => s.setProducts);
  const [editing, setEditing] = useState<Product | null | 'new'>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = useMemo(() => sortProducts(products), [products]);

  const save = async (input: ProductInput) => {
    try {
      if (editing && editing !== 'new') {
        await productRepo.update(editing.id, input);
        const id = editing.id;
        setProducts((list) => list.map((p) => (p.id === id ? { ...p, ...input, updatedAt: new Date() } : p)));
        toast.success('Đã lưu món');
      } else {
        const id = await productRepo.create(input);
        setProducts((list) => [...list, { ...input, id, updatedAt: new Date() }]);
        toast.success('Đã thêm món mới');
      }
      setEditing(null);
    } catch (e) {
      toast.error(toAppError(e).message);
    }
  };

  /**
   * Bật/tắt nhanh ngay trên danh sách — cập nhật lạc quan, lỗi thì trả lại như cũ.
   * Luôn gửi kèm `hidden` để món tạo trước khi có field này (rules bắt buộc) cũng lưu được.
   */
  const patch = async (p: Product, change: Partial<Pick<Product, 'available' | 'hidden'>>, ok?: string) => {
    setBusyId(p.id);
    setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, ...change } : x)));
    try {
      await productRepo.update(p.id, { hidden: p.hidden, ...change });
      if (ok) toast.success(ok);
    } catch (e) {
      setProducts((list) => list.map((x) => (x.id === p.id ? p : x)));
      toast.error(toAppError(e).message);
    } finally {
      setBusyId(null);
    }
  };
  const toggleAvailable = (p: Product) => patch(p, { available: !p.available });
  const toggleHidden = (p: Product) =>
    patch(p, { hidden: !p.hidden }, p.hidden ? `Đã hiện “${p.name}” trên menu` : `Đã ẩn “${p.name}”, khách không thấy nữa`);

  const remove = async (p: Product) => {
    const ok = await confirmDialog({
      title: `Xoá “${p.name}”?`,
      message:
        'Xoá là xoá hẳn, không khôi phục được (đơn cũ vẫn giữ tên + giá món). Nếu chỉ tạm hết, bấm "Tạm hết"; nếu muốn cất đi rồi bán lại sau, bấm "Ẩn" thay vì xoá.',
      confirmLabel: 'Xoá món',
      danger: true,
    });
    if (!ok) return;
    setBusyId(p.id);
    try {
      await productRepo.remove(p.id);
      setProducts((list) => list.filter((x) => x.id !== p.id));
      toast.success('Đã xoá món');
    } catch (e) {
      toast.error(toAppError(e).message);
    } finally {
      setBusyId(null);
    }
  };

  const seed = async () => {
    setSeeding(true);
    try {
      await productRepo.seedSample();
      await load();
      toast.success('Đã tạo menu mẫu, bạn sửa lại tên và giá cho đúng tiệm nhé.');
    } catch (e) {
      toast.error(toAppError(e).message);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <>
      <AdminHeader
        title="Món ăn"
        description={`${products.length} món · ${products.filter((p) => p.available && !p.hidden).length} đang bán · ${products.filter((p) => p.hidden).length} đang ẩn`}
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus className="h-5 w-5" strokeWidth={3} /> Thêm món
          </Button>
        }
      />

      {status !== 'ready' && products.length === 0 ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : status === 'error' && products.length === 0 ? (
        <EmptyState tone="error" title="Chưa tải được danh sách món" description={loadError?.message} action={<Button onClick={() => void load()}>Thử lại</Button>} />
      ) : products.length === 0 ? (
        <EmptyState
          title="Menu đang trống"
          description="Thêm món đầu tiên, hoặc tạo nhanh 12 món mẫu rồi sửa lại cho đúng tiệm."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={() => setEditing('new')}>
                <Plus className="h-5 w-5" /> Thêm món
              </Button>
              <Button variant="secondary" onClick={() => void seed()} loading={seeding}>
                <Wand2 className="h-5 w-5" /> Tạo menu mẫu
              </Button>
            </div>
          }
        />
      ) : (
        <ul className="space-y-3">
          {sorted.map((p) => (
            <li key={p.id} className={`sticker flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap sm:gap-4 ${p.hidden ? 'bg-cream opacity-75' : ''}`}>
              <ProductImage product={p} className={`h-16 w-16 shrink-0 rounded-xl border border-edge sm:h-20 sm:w-20 ${p.hidden ? 'grayscale' : ''}`} />
              <div className="min-w-0 flex-1">
                <p className="font-bold leading-snug">{p.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="price">{formatPrice(p.price)}</span>
                  <Badge className={CATEGORIES[p.category].bg}>{CATEGORIES[p.category].label}</Badge>
                  {p.featured && <Badge className="bg-berry">Hot</Badge>}
                  {p.hidden && (
                    <Badge className="bg-ink text-cream">
                      <EyeOff className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                      Đang ẩn
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                <button
                  type="button"
                  role="switch"
                  aria-checked={p.available}
                  aria-label={`${p.name}: ${p.available ? 'đang bán' : 'tạm hết'}`}
                  disabled={busyId === p.id}
                  onClick={() => void toggleAvailable(p)}
                  className={`min-h-[2.75rem] rounded-xl border border-edge px-3 font-bold transition-colors disabled:opacity-60 ${p.available ? 'bg-mint' : 'bg-white text-ink-soft'}`}
                >
                  {p.available ? 'Đang bán' : 'Tạm hết'}
                </button>
                <button
                  type="button"
                  disabled={busyId === p.id}
                  onClick={() => void toggleHidden(p)}
                  aria-pressed={p.hidden}
                  aria-label={p.hidden ? `Hiện ${p.name} lên menu` : `Ẩn ${p.name} khỏi menu`}
                  className="inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-xl border border-edge bg-white px-3 font-bold transition-colors hover:bg-lemon-soft disabled:opacity-60"
                >
                  {p.hidden ? <Eye className="h-4 w-4" aria-hidden /> : <EyeOff className="h-4 w-4" aria-hidden />}
                  {p.hidden ? 'Hiện' : 'Ẩn'}
                </button>
                <Button variant="secondary" size="icon" onClick={() => setEditing(p)} aria-label={`Sửa ${p.name}`}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="danger" size="icon" onClick={() => void remove(p)} disabled={busyId === p.id} aria-label={`Xoá ${p.name}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ProductForm open={editing !== null} product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSave={save} />
    </>
  );
}
