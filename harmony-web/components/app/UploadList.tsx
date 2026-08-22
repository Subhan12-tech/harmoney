"use client";

import Link from "next/link";
import type { Upload } from "@/lib/useUploads";
import { formatBytes, mix } from "@/lib/style";
import { FileIcon, FolderIcon } from "./icons";

/**
 * The live uploads panel. Only rendered while there is something to show —
 * an empty panel would be noise on a page whose main job is the table below it.
 */
export function UploadList({
  uploads,
  onCancel,
  onRemove,
  onClearCompleted,
}: {
  uploads: Upload[];
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
  onClearCompleted: () => void;
}) {
  if (uploads.length === 0) return null;

  const activeCount = uploads.filter((u) => u.state === "uploading").length;
  const hasFinished = uploads.some((u) => u.state !== "uploading");

  return (
    <section className="app-card" style={{ padding: 20, marginBottom: 16 }} aria-labelledby="uploads-heading">
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <h2 id="uploads-heading" className="kicker" style={{ margin: 0 }}>
          {activeCount > 0 ? `Uploading (${activeCount})` : `Uploads (${uploads.length})`}
        </h2>
        {hasFinished && (
          <button
            type="button"
            onClick={onClearCompleted}
            style={{
              fontSize: 12,
              color: "var(--accent)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Clear completed
          </button>
        )}
      </div>

      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {uploads.map((u) => (
          <UploadRow key={u.id} upload={u} onCancel={onCancel} onRemove={onRemove} />
        ))}
      </ul>
    </section>
  );
}

function UploadRow({
  upload: u,
  onCancel,
  onRemove,
}: {
  upload: Upload;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const token = u.kind === "corpus" ? "var(--accent-2)" : "var(--accent)";
  const cancelled = u.state === "cancelled";
  const done = u.state === "done";

  const statusColor = cancelled ? "var(--muted)" : done ? "var(--accent)" : "var(--muted)";
  const statusLabel = cancelled ? "Cancelled" : u.status;

  return (
    <li
      className="flex items-center gap-3"
      style={{ padding: "11px 0", borderBottom: "1px solid var(--border)" }}
    >
      <span
        aria-hidden="true"
        className="flex flex-none items-center justify-center"
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: mix(token, 14),
          color: cancelled ? "var(--muted)" : token,
        }}
      >
        {u.kind === "corpus" ? <FolderIcon size={15} /> : <FileIcon size={15} />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span
            className="truncate"
            style={{ fontSize: 13.5, color: cancelled ? "var(--muted)" : "var(--text)" }}
          >
            {u.name}
          </span>
          <span style={{ flex: "none", fontSize: 11.5, color: statusColor }}>{statusLabel}</span>
        </div>

        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
          {u.kind === "corpus" ? "Corpus" : "Draft"} · {formatBytes(u.size)}
        </div>

        <div
          role="progressbar"
          aria-valuenow={Math.round(u.pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${u.name} upload progress`}
          style={{
            marginTop: 8,
            background: "var(--bg-elev)",
            height: 6,
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: 6,
              width: `${u.pct}%`,
              borderRadius: 3,
              background: cancelled ? "rgba(238,241,244,.2)" : token,
              transition: "width 220ms linear",
            }}
          />
        </div>
      </div>

      <div className="flex flex-none items-center gap-2.5">
        {u.state === "uploading" && (
          <button
            type="button"
            onClick={() => onCancel(u.id)}
            style={{
              fontSize: 12,
              color: "var(--muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
        )}
        {done && (
          <Link href="/app/documents" style={{ fontSize: 12, color: "var(--accent)" }}>
            Open
          </Link>
        )}
        {u.state !== "uploading" && (
          <button
            type="button"
            onClick={() => onRemove(u.id)}
            style={{
              fontSize: 12,
              color: "var(--muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Remove
          </button>
        )}
      </div>
    </li>
  );
}
