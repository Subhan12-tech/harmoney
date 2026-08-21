"use client";

import { sevColor, sevTextColor } from "@/lib/format";

export function Card({
  children,
  className = "",
  style,
  glow,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  glow?: boolean;
}) {
  return (
    <div
      className={className}
      style={{
        background: glow ? "radial-gradient(400px 200px at 0% 0%, rgba(110,168,255,.09), transparent 60%), #050505" : "#050505",
        border: "1px solid #141414",
        borderRadius: 14,
        padding: 22,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Small mono-caps card label, matching the landing page's "EVIDENCE.CITATION" / "APPROVAL.QUEUE" pattern.
export function Kicker({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      className="font-mono"
      style={{ fontSize: 11.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666", marginBottom: 14, ...style }}
    >
      {children}
    </div>
  );
}

type BtnVariant = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  children,
  variant = "secondary",
  size = "md",
  onClick,
  type = "button",
  disabled,
  style,
  title,
}: {
  children: React.ReactNode;
  variant?: BtnVariant;
  size?: "md" | "sm";
  onClick?: (e: React.MouseEvent) => void;
  type?: "button" | "submit";
  disabled?: boolean;
  style?: React.CSSProperties;
  title?: string;
}) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 9,
    fontFamily: "var(--font-inter)",
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    border: "none",
    padding: size === "sm" ? "8px 14px" : "12px 20px",
    fontSize: size === "sm" ? 13 : 14.5,
    opacity: disabled ? 0.5 : 1,
    whiteSpace: "nowrap",
  };
  const variants: Record<BtnVariant, React.CSSProperties> = {
    primary: { background: "#fff", color: "#000" },
    secondary: { background: "#0a0a0a", border: "1px solid #1e1e1e", color: "#e5e5e5" },
    danger: { background: "transparent", border: "1px solid rgba(255,120,90,.4)", color: "#ffb7a5" },
    ghost: { background: "transparent", color: "#8a8a8a", padding: "6px 4px" },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{ ...base, ...variants[variant], ...style }}
      className="transition-opacity hover:opacity-85"
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { style, ...rest } = props;
  return (
    <input
      {...rest}
      style={{
        width: "100%",
        background: "#0a0a0a",
        border: "1px solid #1a1a1a",
        borderRadius: 9,
        padding: "11px 13px",
        color: "#e5e5e5",
        fontSize: 14.5,
        outline: "none",
        ...style,
      }}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { style, ...rest } = props;
  return (
    <textarea
      {...rest}
      style={{
        width: "100%",
        background: "#0a0a0a",
        border: "1px solid #1a1a1a",
        borderRadius: 9,
        padding: "11px 13px",
        color: "#e5e5e5",
        fontSize: 14.5,
        outline: "none",
        lineHeight: 1.6,
        resize: "vertical",
        fontFamily: "var(--font-inter)",
        ...style,
      }}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { style, children, ...rest } = props;
  return (
    <select
      {...rest}
      style={{
        width: "100%",
        background: "#0a0a0a",
        border: "1px solid #1a1a1a",
        borderRadius: 9,
        padding: "10px 13px",
        color: "#e5e5e5",
        fontSize: 13.5,
        outline: "none",
        ...style,
      }}
    >
      {children}
    </select>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block" style={{ fontSize: 13, color: "#8a8a8a", marginBottom: 7 }}>
      {children}
    </label>
  );
}

export function Chip({
  children,
  color,
  style,
}: {
  children: React.ReactNode;
  color?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className="inline-flex items-center rounded-full"
      style={{
        fontSize: 11.5,
        padding: "3px 10px",
        background: color ? `${color}22` : "#151515",
        color: color || "#ccc",
        border: color ? `1px solid ${color}55` : "1px solid #1e1e1e",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function SeverityChip({ severity }: { severity?: string | null }) {
  const c = sevColor(severity);
  const label = (severity || "low").replace(/^\w/, (m) => m.toUpperCase());
  return (
    <Chip color={c} style={{ color: sevTextColor(severity), fontWeight: 600 }}>
      {label}
    </Chip>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ color: "#666", fontSize: 14, padding: "22px 4px" }}>{children}</div>
  );
}

export function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,120,90,.4)",
        background: "rgba(255,120,90,.08)",
        borderRadius: 10,
        padding: "12px 14px",
        fontSize: 13.5,
        color: "#ffb7a5",
      }}
    >
      {children}
    </div>
  );
}

export function OkBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid rgba(126,220,143,.3)",
        background: "rgba(126,220,143,.06)",
        borderRadius: 10,
        padding: "12px 14px",
        fontSize: 13.5,
        color: "#cfeed6",
      }}
    >
      {children}
    </div>
  );
}

export function PageHead({ title, subtitle, eyebrow }: { title: string; subtitle: string; eyebrow?: string }) {
  return (
    <div style={{ marginBottom: 36 }}>
      {eyebrow && (
        <div
          className="font-mono"
          style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#666", marginBottom: 12 }}
        >
          {eyebrow}
        </div>
      )}
      <h1 className="font-serif" style={{ fontSize: 42, lineHeight: 1.05, margin: "0 0 10px", color: "#fff" }}>
        {title}
      </h1>
      <p style={{ fontSize: 16, color: "#8a8a8a", margin: 0, maxWidth: 680, lineHeight: 1.55 }}>{subtitle}</p>
    </div>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>{children}</table>
    </div>
  );
}

export function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "10px 10px",
        borderBottom: "1px solid #141414",
        color: "#666",
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

export function Td({ children, muted }: { children?: React.ReactNode; muted?: boolean }) {
  return (
    <td style={{ padding: "11px 10px", borderBottom: "1px solid #141414", color: muted ? "#8a8a8a" : "#e5e5e5", verticalAlign: "top" }}>
      {children}
    </td>
  );
}

export function LinkButton({ children, onClick, color }: { children: React.ReactNode; onClick?: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      style={{ background: "none", border: "none", color: color || "#6ea8ff", fontSize: 13, cursor: "pointer", padding: 0, fontFamily: "inherit" }}
    >
      {children}
    </button>
  );
}

export function SegTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="inline-flex" style={{ border: "1px solid #1a1a1a", borderRadius: 9, overflow: "hidden", marginBottom: 20 }}>
      {tabs.map((t) => (
        <div
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            padding: "9px 16px",
            fontSize: 13.5,
            cursor: "pointer",
            background: active === t.key ? "#fff" : "transparent",
            color: active === t.key ? "#000" : "#8a8a8a",
            fontWeight: active === t.key ? 600 : 400,
          }}
        >
          {t.label}
        </div>
      ))}
    </div>
  );
}

export function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(460px, 90vw)",
          background: "#0a0a0a",
          border: "1px solid #1a1a1a",
          borderRadius: 16,
          padding: 26,
          boxShadow: "0 30px 80px rgba(0,0,0,.6)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
