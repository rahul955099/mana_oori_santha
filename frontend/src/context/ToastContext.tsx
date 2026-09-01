import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { ToastMessage } from "@/types";
import { CheckCircle2, Info, XCircle, X } from "lucide-react";

interface ToastContextValue {
  showToast: (message: string, type?: ToastMessage["type"]) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastMessage["type"] = "success") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 sm:bottom-6 sm:right-6">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm transition-all ${
              toast.type === "success"
                ? "border-primary-200 bg-primary-50 text-primary-800"
                : toast.type === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-accent-200 bg-accent-50 text-accent-800"
            }`}
          >
            {toast.type === "success" && <CheckCircle2 size={18} className="shrink-0" />}
            {toast.type === "error" && <XCircle size={18} className="shrink-0" />}
            {toast.type === "info" && <Info size={18} className="shrink-0" />}
            <span className="text-sm font-medium">{toast.message}</span>
            <button onClick={() => dismiss(toast.id)} className="ml-2 opacity-60 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
