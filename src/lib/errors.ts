/** Lỗi đã dịch sang tiếng Việt, an toàn để hiện cho người dùng (không lộ chi tiết kỹ thuật). */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

const MESSAGES: Record<string, string> = {
  NOT_CONFIGURED: 'Cửa hàng chưa kết nối cơ sở dữ liệu.',
  // Firestore
  'permission-denied': 'Bạn không có quyền thực hiện thao tác này.',
  unavailable: 'Mất kết nối mạng. Vui lòng thử lại.',
  'deadline-exceeded': 'Mạng chậm quá, vui lòng thử lại.',
  'resource-exhausted': 'Hệ thống đang bận, vui lòng thử lại sau ít phút.',
  'not-found': 'Không tìm thấy dữ liệu.',
  'failed-precondition': 'Cơ sở dữ liệu chưa sẵn sàng (thiếu index). Báo cho chủ tiệm.',
  // Auth
  'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.',
  'auth/invalid-email': 'Email không hợp lệ.',
  'auth/user-disabled': 'Tài khoản đã bị khoá.',
  'auth/too-many-requests': 'Bạn thử quá nhiều lần. Vui lòng đợi vài phút.',
  'auth/network-request-failed': 'Mất kết nối mạng. Vui lòng thử lại.',
  'auth/operation-not-allowed': 'Chưa bật phương thức đăng nhập này trong Firebase.',
  'auth/admin-restricted-operation': 'Chưa bật đăng nhập ẩn danh (Anonymous) trong Firebase.',
};

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  const code = (err as { code?: string } | undefined)?.code;
  if (code && MESSAGES[code]) return new AppError(code, MESSAGES[code], err);
  if (err instanceof TypeError && /fetch|network/i.test(err.message)) {
    return new AppError('network', MESSAGES.unavailable!, err);
  }
  if (import.meta.env.DEV) console.error('[unexpected error]', err);
  return new AppError('unknown', 'Đã có lỗi xảy ra. Vui lòng thử lại.', err);
}
