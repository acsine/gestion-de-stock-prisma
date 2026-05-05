// src/stores/useUIStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Toast {
  id: string;
  title: string;
  message?: string;
  type: "success" | "error" | "warning" | "info";
}

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;

  theme: "light" | "dark";
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      toasts: [],
      addToast: (toast) => {
        const id = Date.now().toString();
        set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
        setTimeout(() => get().removeToast(id), 5000);
      },
      removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      theme: "light",
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),
    }),
    { name: "ui-store", partialize: (s) => ({ sidebarOpen: s.sidebarOpen, theme: s.theme }) }
  )
);
