"use client";

import { createContext, useContext, useState, useCallback } from "react";
import Toast from "./Toast";

interface ToastContextType {
  showToast: (msg: string, type?: "success" | "error") => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<
    { id: string; msg: string; type: "success" | "error" }[]
  >([]);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, msg, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container */}
      <div className="fixed top-4 right-4 flex flex-col gap-2 z-9999">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.msg} type={t.type} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}