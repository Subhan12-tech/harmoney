"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

interface ToastValue {
  /** Shows a bottom-right toast that dismisses itself after ~3.5s. */
  toast: (message: string) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(next);
    timer.current = setTimeout(() => setMessage(null), 3500);
  }, []);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Announced politely so a screen reader hears the confirmation too. */}
      <div aria-live="polite" aria-atomic="true">
        {message && (
          <div
            className="app-pop fixed z-50"
            style={{
              bottom: 24,
              right: 24,
              background: "var(--bg-elev)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "14px 18px",
              maxWidth: 320,
              fontSize: 13.5,
              color: "var(--text)",
              boxShadow: "0 20px 60px rgba(0,0,0,.5)",
            }}
          >
            {message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside a ToastProvider");
  return ctx;
}
