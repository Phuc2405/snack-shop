/**
 * Tạo chuỗi VietQR (chuẩn EMVCo QR của NAPAS) để khách quét bằng app ngân hàng bất kỳ:
 * tự điền số tài khoản, số tiền và nội dung chuyển khoản = mã đơn.
 * Sinh hoàn toàn trên trình duyệt — không gửi thông tin đơn cho dịch vụ bên ngoài.
 *
 * Cấu trúc (mỗi trường = ID 2 số + độ dài 2 số + giá trị):
 *   00 "01"                     phiên bản
 *   01 "12"                     QR động (có số tiền)
 *   38 {00 A000000727 | 01 {00 BIN ngân hàng | 01 số tài khoản} | 02 QRIBFTTA}   chuyển tới tài khoản
 *   53 "704" (VND) · 54 số tiền · 58 "VN" · 62 {08 nội dung}
 *   63 CRC16-CCITT (0xFFFF, đa thức 0x1021) của toàn bộ chuỗi + "6304"
 */

const tlv = (id: string, value: string) => `${id}${value.length.toString().padStart(2, '0')}${value}`;

export function crc16ccitt(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Nội dung chuyển khoản: chỉ chữ không dấu, số, khoảng trắng, gạch ngang (ngân hàng hay cắt ký tự khác). */
export const transferNote = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9 -]/g, '')
    .slice(0, 25);

export function buildVietQR({ bin, account, amount, note }: { bin: string; account: string; amount: number; note: string }): string {
  if (!/^\d{6}$/.test(bin)) throw new Error('BIN ngân hàng phải gồm 6 chữ số');
  if (!/^\d{4,19}$/.test(account)) throw new Error('Số tài khoản không hợp lệ');
  const merchant = tlv('00', 'A000000727') + tlv('01', tlv('00', bin) + tlv('01', account)) + tlv('02', 'QRIBFTTA');
  const body =
    tlv('00', '01') +
    tlv('01', amount > 0 ? '12' : '11') +
    tlv('38', merchant) +
    tlv('53', '704') +
    (amount > 0 ? tlv('54', String(Math.round(amount))) : '') +
    tlv('58', 'VN') +
    (note ? tlv('62', tlv('08', transferNote(note))) : '') +
    '6304';
  return body + crc16ccitt(body);
}

/** Ngân hàng phổ biến (mã BIN theo NAPAS). Thiếu ngân hàng nào thì thêm vào đây. */
export const BANKS: { bin: string; name: string }[] = [
  { bin: '970436', name: 'Vietcombank' },
  { bin: '970415', name: 'VietinBank' },
  { bin: '970418', name: 'BIDV' },
  { bin: '970405', name: 'Agribank' },
  { bin: '970407', name: 'Techcombank' },
  { bin: '970422', name: 'MB Bank' },
  { bin: '970416', name: 'ACB' },
  { bin: '970432', name: 'VPBank' },
  { bin: '970423', name: 'TPBank' },
  { bin: '970403', name: 'Sacombank' },
  { bin: '970441', name: 'VIB' },
  { bin: '970437', name: 'HDBank' },
  { bin: '970443', name: 'SHB' },
  { bin: '970448', name: 'OCB' },
  { bin: '970426', name: 'MSB' },
  { bin: '970440', name: 'SeABank' },
  { bin: '970431', name: 'Eximbank' },
  { bin: '970449', name: 'LPBank' },
];

export const bankName = (bin: string) => BANKS.find((b) => b.bin === bin)?.name ?? `Ngân hàng ${bin}`;
