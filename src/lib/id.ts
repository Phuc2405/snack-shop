const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** Id 20 ký tự giống auto-id của Firestore, sinh bằng crypto (không cần tải SDK). */
export function autoId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  let id = '';
  for (const b of bytes) id += CHARS[b % CHARS.length];
  return id;
}
