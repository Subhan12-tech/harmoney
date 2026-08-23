"use client";

import { useRef, useState, type ReactNode } from "react";
import type { UploadKind } from "@/lib/useUploads";
import { mix } from "@/lib/style";

/**
 * One of the two upload cards. The corpus card is tinted with `--accent-2`
 * (evidence/reference blue) and the draft card with `--accent` (the action
 * colour), matching how the two accents are used everywhere else in the app.
 *
 * The whole card is a drop target, not just the button row — dropping a folder
 * anywhere on it is the fastest path in, and the dashed border says so.
 */
export function UploadZone({
  kind,
  title,
  badge,
  description,
  meta,
  dropHint,
  actions,
  onDropFiles,
}: {
  kind: UploadKind;
  title: string;
  /** Small inline label beside the title, e.g. "Send for AI review". */
  badge?: string;
  description: string;
  meta: string[];
  dropHint?: string;
  actions: ReactNode;
  onDropFiles: (files: FileList) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const depth = useRef(0);

  const isDraft = kind === "draft";
  const token = isDraft ? "var(--accent)" : "var(--accent-2)";

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        depth.current += 1;
        setDragOver(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        e.preventDefault();
        // Nested children fire dragleave too; count depth so the highlight
        // only clears when the pointer truly leaves the card.
        depth.current -= 1;
        if (depth.current <= 0) {
          depth.current = 0;
          setDragOver(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setDragOver(false);
        if (e.dataTransfer.files?.length) onDropFiles(e.dataTransfer.files);
      }}
      style={{
        background: dragOver
          ? mix(token, 12, "var(--bg-elev)")
          : isDraft
            ? "var(--surface)"
            : "var(--surface)",
        border: `1.5px dashed ${dragOver ? mix(token, 70) : mix(token, isDraft ? 45 : 40, "var(--border)")}`,
        borderRadius: 14,
        padding: 20,
        transition: "background 140ms ease, border-color 140ms ease",
      }}
    >
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden="true"
          className="flex flex-none items-center justify-center"
          style={{ width: 42, height: 42, borderRadius: 10, background: mix(token, isDraft ? 22 : 18), color: token }}
        >
          {isDraft ? <DraftGlyph /> : <FolderGlyph />}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="font-heading" style={{ fontWeight: 700, fontSize: 15, margin: "0 0 3px" }}>
            {title}
            {badge && (
              <span
                className="font-sans"
                style={{ fontWeight: 400, fontSize: 12, color: "var(--muted)", marginLeft: 6 }}
              >
                {badge}
              </span>
            )}
          </h3>

          <p style={{ color: "var(--muted)", fontSize: 12.5, lineHeight: 1.5, margin: "0 0 12px" }}>
            {description}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {actions}
            {dropHint && (
              <span style={{ alignSelf: "center", color: "var(--muted)", fontSize: 12 }}>{dropHint}</span>
            )}
          </div>

          <div
            className="flex flex-wrap items-center gap-2"
            style={{ marginTop: 12, fontSize: 11.5, color: "var(--muted)" }}
          >
            {meta.map((m, i) => (
              <span key={m} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden="true">·</span>}
                <span>{m}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FolderGlyph() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <polyline points="9 14 12 11 15 14" />
    </svg>
  );
}

function DraftGlyph() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="14 3 14 9 20 9" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <polyline points="9 15 12 12 15 15" />
    </svg>
  );
}
