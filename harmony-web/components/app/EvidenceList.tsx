"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, apiGet, deleteEvidence } from "@/lib/api";
import { useRole } from "@/context/RoleContext";
import { useToast } from "./Toast";
import { relativeTime } from "@/lib/mappers";

interface EvidenceRow {
  id: string;
  company: string;
  source_file: string;
  doc_type: string;
  chunk_count: number;
  added_by_name?: string;
  created_at: string;
}

/**
 * The evidence library as a list, alongside the graph.
 *
 * The graph shows how the corpus relates; this shows what is actually in it and
 * lets an admin take something out. A graph node is a poor place to hang a
 * destructive action - there is nowhere obvious to put it, and the thing being
 * deleted should be named in full before it goes.
 */
export function EvidenceList() {
  const { orgId, canManageTeam } = useRole();
  const { toast } = useToast();

  const [rows, setRows] = useState<EvidenceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiGet<{ history: EvidenceRow[]; total_chunks: number }>("/api/history");
      setRows(r.history ?? []);
      setTotal(r.total_chunks ?? 0);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Could not load the evidence library.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load, orgId]);

  async function remove(row: EvidenceRow) {
    const label = row.source_file || row.company || "this entry";
    // Deleting evidence changes what every FUTURE review is checked against.
    // That consequence is the thing worth stating, not the row itself.
    if (
      !window.confirm(
        `Remove "${label}" from the evidence library?\n\n` +
          `Its ${row.chunk_count} passage(s) will be deleted from the search index, so future ` +
          `drafts will no longer be checked against it. Reviews already completed keep their findings.\n\n` +
          `This cannot be undone.`,
      )
    )
      return;

    setBusy(row.id);
    try {
      const r = await deleteEvidence(row.id);
      toast(`${r.document} removed — ${r.passages_removed} passage(s) deleted.`);
      await load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Could not remove that entry.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="app-card scroll-x" style={{ padding: "6px 20px 4px", marginTop: 16 }}>
      <div className="flex items-center justify-between gap-3" style={{ padding: "14px 0 6px" }}>
        <h2 className="kicker" style={{ margin: 0 }}>
          What is in the library
        </h2>
        <span style={{ color: "var(--faint)", fontSize: 12 }}>
          {rows.length} document{rows.length === 1 ? "" : "s"} · {total} passage{total === 1 ? "" : "s"}
        </span>
      </div>

      <table className="app-table">
        <thead>
          <tr>
            <th scope="col">Document</th>
            <th scope="col">Company</th>
            <th scope="col">Passages</th>
            <th scope="col">Added</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={5} style={{ color: "var(--muted)" }}>
                Loading…
              </td>
            </tr>
          )}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={5} style={{ color: "var(--muted)" }}>
                Nothing here yet. Add past documents from the Documents page, step 1.
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={row.id}>
              <td style={{ color: "var(--text)" }}>
                {row.source_file || "Pasted text"}
                {row.doc_type === "approved" && (
                  <span style={{ color: "var(--faint)", fontSize: 11, marginLeft: 8 }}>
                    from an approved draft
                  </span>
                )}
                {row.doc_type === "draft" && (
                  <span style={{ color: "var(--faint)", fontSize: 11, marginLeft: 8 }}>
                    unpublished draft
                  </span>
                )}
              </td>
              <td>{row.company}</td>
              <td>{row.chunk_count}</td>
              <td>{relativeTime(row.created_at)}</td>
              <td style={{ textAlign: "right" }}>
                {canManageTeam && (
                  <button
                    type="button"
                    disabled={busy === row.id}
                    onClick={() => void remove(row)}
                    style={{
                      fontSize: 12,
                      color: "color-mix(in srgb, var(--danger) 82%, var(--text))",
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      whiteSpace: "nowrap",
                      opacity: busy === row.id ? 0.5 : 1,
                    }}
                  >
                    {busy === row.id ? "Removing…" : "Remove"}
                    <span className="sr-only"> {row.source_file || row.company}</span>
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
