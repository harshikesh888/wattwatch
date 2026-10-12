import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  text: string;
}

interface ToastContextValue {
  push: (type: ToastType, text: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((type: ToastType, text: string) => {
    const id = nextId++;
    setToasts((prev) => [...prev.slice(-2), { id, type, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-enter flex items-center justify-between gap-3 rounded-xl border p-3.5 text-xs font-semibold shadow-lg ${
              t.type === 'success'
                ? 'border-emerald-800 bg-emerald-950 text-emerald-100'
                : t.type === 'error'
                  ? 'border-rose-800 bg-rose-950 text-rose-100'
                  : 'border-slate-700 bg-slate-900 text-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              {t.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : t.type === 'error' ? (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              ) : (
                <Info className="h-4 w-4 shrink-0 text-sky-400" />
              )}
              <span>{t.text}</span>
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="rounded p-0.5 text-slate-400 hover:text-white"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
