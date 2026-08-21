"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * A click-to-open popover anchored to its trigger.
 *
 * The prototype had no dismissal behaviour at all; this adds the two things a
 * real popover needs — outside-click and Escape — plus focus return to the
 * trigger so keyboard users are not stranded.
 */
export function Popover({
  open,
  onClose,
  trigger,
  children,
  width = 300,
  label,
}: {
  open: boolean;
  onClose: () => void;
  /** Receives the props that must land on the trigger element. */
  trigger: (props: { "aria-expanded": boolean; "aria-haspopup": "dialog" }) => ReactNode;
  children: ReactNode;
  width?: number;
  label: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        // Send focus back to the trigger rather than dropping it on <body>.
        rootRef.current?.querySelector<HTMLElement>("button, [tabindex]")?.focus();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <div ref={rootRef} className="relative">
      {trigger({ "aria-expanded": open, "aria-haspopup": "dialog" })}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={label}
          className="app-pop absolute right-0 z-30 overflow-hidden"
          style={{
            top: 42,
            width,
            background: "var(--bg-elev)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            boxShadow: "0 20px 60px rgba(0,0,0,.5)",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
