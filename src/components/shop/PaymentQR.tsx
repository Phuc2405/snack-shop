import { useMemo } from 'react';
import { encode } from 'uqr';
import { Copy } from 'lucide-react';
import { bankName, buildVietQR } from '@/domain/vietqr';
import { formatPrice } from '@/lib/format';
import { toast } from '@/stores/toast.store';
import { DEMO } from '@/lib/demo';

/** Vẽ ma trận QR bằng 1 path SVG (React tạo phần tử — không dùng innerHTML). */
function QrSvg({ text, label }: { text: string; label: string }) {
  const path = useMemo(() => {
    const { data } = encode(text, { ecc: 'M', border: 0 });
    let d = '';
    data.forEach((row, y) => row.forEach((on, x) => on && (d += `M${x} ${y}h1v1h-1z`)));
    return { d, size: data.length };
  }, [text]);
  return (
    <svg viewBox={`-2 -2 ${path.size + 4} ${path.size + 4}`} className="h-auto w-full" role="img" aria-label={label} shapeRendering="crispEdges">
      <rect x="-2" y="-2" width={path.size + 4} height={path.size + 4} fill="#fff" />
      <path d={path.d} fill="#2B2118" />
    </svg>
  );
}

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`Đã chép ${what}`);
  } catch {
    toast.error('Không chép được, bạn bôi đen để chép nhé.');
  }
}

/**
 * Khối chuyển khoản VietQR: quét bằng app ngân hàng bất kỳ → tự điền tài khoản, số tiền, nội dung = mã đơn.
 * Mã sinh ngay trên máy khách (lib/domain/vietqr.ts), không gửi dữ liệu đơn cho bên thứ ba.
 */
export function PaymentQR({
  bin,
  account,
  accountName,
  amount,
  code,
}: {
  bin: string;
  account: string;
  accountName: string;
  amount: number;
  code: string;
}) {
  const payload = useMemo(() => {
    try {
      return buildVietQR({ bin, account, amount, note: code });
    } catch {
      return null;
    }
  }, [bin, account, amount, code]);

  if (!payload) return null;
  const Row = ({ label, value, copyAs }: { label: string; value: string; copyAs?: string }) => (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="flex items-center gap-1 text-right font-bold">
        <span className="tabular">{value}</span>
        {copyAs && (
          <button
            type="button"
            onClick={() => void copy(copyAs, label.toLowerCase())}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-white"
            aria-label={`Chép ${label.toLowerCase()}`}
          >
            <Copy className="h-4 w-4" />
          </button>
        )}
      </dd>
    </div>
  );

  return (
    <section className="sticker mt-5 bg-sky-soft p-5 sm:p-6" aria-labelledby="pay-title">
      <h2 id="pay-title" className="text-xl">
        Chuyển khoản để hoàn tất
      </h2>
      <p className="mt-1 text-ink-soft">Mở app ngân hàng → Quét QR. Số tiền và nội dung đã điền sẵn.</p>
      <div className="mt-4 grid items-center gap-5 sm:grid-cols-[13rem_1fr]">
        <div className="relative mx-auto w-full max-w-[13rem] overflow-hidden rounded-2xl border-2 border-ink bg-white p-2">
          {/* Bản demo công khai: làm mờ hẳn mã QR (tài khoản giả) để không ai lỡ quét chuyển tiền thật */}
          <div className={DEMO ? 'blur-[6px]' : undefined} aria-hidden={DEMO || undefined}>
            <QrSvg text={payload} label={`Mã QR chuyển ${formatPrice(amount)} cho đơn ${code}`} />
          </div>
          {DEMO && (
            <p className="absolute inset-0 grid place-items-center bg-white/60 p-3 text-center font-bold leading-snug">
              Mã QR mẫu
              <br />
              Bản demo không nhận tiền
            </p>
          )}
        </div>
        <dl className="space-y-1">
          <Row label="Ngân hàng" value={bankName(bin)} />
          <Row label="Số tài khoản" value={account} copyAs={account} />
          {accountName && <Row label="Chủ tài khoản" value={accountName} />}
          <Row label="Số tiền" value={formatPrice(amount)} copyAs={String(amount)} />
          <Row label="Nội dung" value={code} copyAs={code} />
        </dl>
      </div>
      <p className="mt-3 text-[0.9rem] text-ink-soft">Tiệm xác nhận đã nhận tiền thì trang này sẽ hiện "Đã thanh toán".</p>
    </section>
  );
}
