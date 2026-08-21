"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastState = { message: string; isError: boolean } | null;
const ToastContext = createContext<((msg: string, isError?: boolean) => void) | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, isError = false) => {
    setToast({ message, isError });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#0a0a0a",
            border: `1px solid ${toast.isError ? "rgba(255,120,90,.4)" : "#1a1a1a"}`,
            borderRadius: 12,
            padding: "14px 18px",
            zIndex: 100,
            maxWidth: 340,
            fontSize: 13.5,
            color: toast.isError ? "#ffb7a5" : "#e5e5e5",
            boxShadow: "0 20px 60px rgba(0,0,0,.5)",
          }}
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
