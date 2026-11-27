import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'info';
/** Nút bấm trong thông báo, vd "Hoàn tác" sau khi bỏ món khỏi giỏ */
export interface ToastAction {
  label: string;
  onClick: () => void;
}
export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  action?: ToastAction;
}

interface ToastState {
  toasts: Toast[];
  push: (kind: ToastKind, message: string, action?: ToastAction) => void;
  dismiss: (id: number) => void;
}

let seq = 0;

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (kind, message, action) => {
    const id = ++seq;
    // Gộp thông báo trùng lặp liên tiếp, tối đa 4 cái trên màn hình
    if (get().toasts.some((t) => t.message === message)) return;
    set((s) => ({ toasts: [...s.toasts, { id, kind, message, action }].slice(-4) }));
    // Có nút (Hoàn tác) → để lâu hơn cho kịp bấm
    setTimeout(() => get().dismiss(id), kind === 'error' || action ? 6000 : 3500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Gọi được ở mọi nơi (kể cả ngoài React component). */
export const toast = {
  success: (m: string) => useToastStore.getState().push('success', m),
  error: (m: string) => useToastStore.getState().push('error', m),
  info: (m: string, action?: ToastAction) => useToastStore.getState().push('info', m, action),
};
