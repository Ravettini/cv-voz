import { create } from "zustand";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "error" | "success";
}

interface ToastState {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, "id">) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: crypto.randomUUID() }],
    })),
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export function toast(toast: Omit<ToastItem, "id">): void {
  useToastStore.getState().push(toast);
}
