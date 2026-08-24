"use client";

import { useState } from "react";
import Link from "next/link";
import type { HarmonyDocument } from "@/lib/data";
import { neutralChipStyle, severityChipStyle } from "@/lib/style";
import { ApiError, deleteDocument } from "@/lib/api";
import { useRole } from "@/context/RoleContext";
import { useToast } from "./Toast";

/**
 * The documents table. `compact` drops Status/Updated for the dashboard's
 * narrower "Pending approvals" column; both variants share one row renderer.
 */
export function DocTable({
  documents,
  compact = false,
  onDeleted,
}: {
  documents: HarmonyDocument[];
  compact?: boolean;
  /** Called after a successful delete so the caller can refresh its list. */
  onDeleted?: (id: string) => void;
}) {
  const { canManageTeam } = useRole();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [gone, setGone] = useState<string[]>([]);

  async function remove(d: HarmonyDocument) {
    // Irreversible, so it asks - and names what it is about to destroy rather
    // than asking "are you sure?" about nothing in particular.
    if (!window.confirm(
      `Delete "${d.name}" and every review of it?

This cannot be undone. ` +
      `Evidence this document contributed to the library is NOT removed - that is a separate delete.`
    )) return;

    setBusy(d.id);
    try {
      const r = await deleteDocument(d.id);
      setGone((g) => [...g, d.id]);
      onDeleted?.(d.id);
      toast(`${r.document} deleted${r.reviews_removed ? ` with ${r.reviews_removed} review(s)` : ""}.`);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Could not delete that document.");
    } finally {
      setBusy(null);
    }
  }

  documents = documents.filter((d) => !gone.includes(d.id));

  if (documents.length === 0) {
    return (
      <p style={{ color: "var(--muted)", fontSize: 13.5, padding: "18px 8px", margin: 0 }}>
        No documents match these filters.
      </p>
    );
  }

  return (
    <table className="app-table">
      <thead>
        <tr>
          <th scope="col">Document</th>
          <th scope="col">Type</th>
          {!compact && <th scope="col">Status</th>}
          {compact && <th scope="col">Risk</th>}
          <th scope="col">Reviewer</th>
          {!compact && <th scope="col">Risk</th>}
          {!compact && <th scope="col">Updated</th>}
          <th scope="col">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {documents.map((d) => (
          <tr key={d.id}>
            <td style={{ color: "var(--text)" }}>{d.name}</td>
            <td style={{ color: "var(--muted)" }}>{d.type}</td>
            {!compact && (
              <td>
                <span style={neutralChipStyle}>{d.status}</span>
              </td>
            )}
            {compact && (
              <td>
                <span style={severityChipStyle(d.risk)}>{d.risk}</span>
              </td>
            )}
            <td style={{ color: "var(--muted)" }}>{d.reviewer}</td>
            {!compact && (
              <td>
                <span style={severityChipStyle(d.risk)}>{d.risk}</span>
              </td>
            )}
            {!compact && <td style={{ color: "var(--muted)" }}>{d.updated}</td>}
            <td>
              <div className="flex items-center justify-end" style={{ gap: 14 }}>
                <Link
                  href={`/app/review?id=${encodeURIComponent(d.id)}`}
                  style={{ fontSize: 12, color: "var(--accent)", whiteSpace: "nowrap" }}
                >
                  Open <span aria-hidden="true">→</span>
                  <span className="sr-only">{d.name}</span>
                </Link>
                {!compact && canManageTeam && (
                  <button
                    type="button"
                    disabled={busy === d.id}
                    onClick={() => void remove(d)}
                    style={{
                      fontSize: 12,
                      color: "color-mix(in srgb, var(--danger) 82%, var(--text))",
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      whiteSpace: "nowrap",
                      opacity: busy === d.id ? 0.5 : 1,
                    }}
                  >
                    {busy === d.id ? "Deleting…" : "Delete"}
                    <span className="sr-only"> {d.name}</span>
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
