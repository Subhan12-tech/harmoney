"use client";

import { useState } from "react";
import { PRICING_FAQ } from "@/lib/data";

export function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div style={{ border: "1px solid #141414", borderRadius: 12, background: "#050505" }}>
      {PRICING_FAQ.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} style={{ borderTop: i === 0 ? "none" : "1px solid #141414" }}>
            <h3 style={{ margin: 0 }}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${i}`}
                id={`faq-trigger-${i}`}
                className="flex w-full items-center justify-between text-left transition-colors hover:text-white"
                style={{
                  padding: "20px 24px",
                  background: "transparent",
                  border: "none",
                  color: "#e5e5e5",
                  fontSize: 15,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <span>{item.q}</span>
                <span
                  aria-hidden="true"
                  className="flex-none transition-transform"
                  style={{
                    color: "#666",
                    fontSize: 18,
                    lineHeight: 1,
                    transform: isOpen ? "rotate(45deg)" : "none",
                  }}
                >
                  +
                </span>
              </button>
            </h3>
            {isOpen && (
              <div
                id={`faq-panel-${i}`}
                role="region"
                aria-labelledby={`faq-trigger-${i}`}
                style={{ padding: "0 24px 22px", color: "#8a8a8a", fontSize: 14, lineHeight: 1.6, maxWidth: 720 }}
              >
                {item.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
