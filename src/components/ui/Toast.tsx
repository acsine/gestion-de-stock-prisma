"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

const CONFIG = {
  success: {
    icon: CheckCircle2,
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    iconColor: "text-emerald-500",
    titleColor: "text-emerald-800",
    bar: "bg-emerald-400",
    label: "Succès",
  },
  error: {
    icon: XCircle,
    bg: "bg-rose-50",
    border: "border-rose-200",
    iconColor: "text-rose-500",
    titleColor: "text-rose-800",
    bar: "bg-rose-400",
    label: "Erreur",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-50",
    border: "border-amber-200",
    iconColor: "text-amber-500",
    titleColor: "text-amber-800",
    bar: "bg-amber-400",
    label: "Attention",
  },
  info: {
    icon: Info,
    bg: "bg-blue-50",
    border: "border-blue-200",
    iconColor: "text-blue-500",
    titleColor: "text-blue-800",
    bar: "bg-blue-400",
    label: "Information",
  },
};

export function Toast({ message, type = "success", duration = 4000, onClose }: ToastProps) {
  const cfg = CONFIG[type];
  const Icon = cfg.icon;

  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`relative flex items-start gap-3 w-full max-w-sm rounded-2xl border shadow-xl shadow-slate-200/60 px-4 py-3.5 overflow-hidden ${cfg.bg} ${cfg.border}`}
    >
      {/* Progress bar */}
      <motion.div
        className={`absolute bottom-0 left-0 h-0.5 ${cfg.bar}`}
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: duration / 1000, ease: "linear" }}
      />

      {/* Icon */}
      <div className={`flex-shrink-0 mt-0.5 ${cfg.iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-black uppercase tracking-wider mb-0.5 ${cfg.titleColor}`}>
          {cfg.label}
        </p>
        <p className="text-sm font-semibold text-slate-700 leading-snug">{message}</p>
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        className="flex-shrink-0 text-slate-400 hover:text-slate-700 transition-colors mt-0.5"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

// ─── Toast Container (fixed top-right) ─────────────────────────────────────
interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="sync">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast message={t.message} type={t.type} onClose={() => onClose(t.id)} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── useToast hook ──────────────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = (message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const close = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, show, close };
}
