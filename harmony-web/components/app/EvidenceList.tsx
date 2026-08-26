"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, apiGet, deleteEvidence } from "@/lib/api";
import { useRole } from "@/context/RoleContext";
import { useToast } from "./Toast";
import { StatTile } from "./StatTile";
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

/** doc_type -> a human label + one-line meaning. This is the vocabulary that
 *  made the old page unreadable when it leaked through raw ("history"?). */
const KIND: Record<string, { label: string; note: string; token: string }> = {
  history: { label: "Imported", note: "A past document you uploaded", token: "var(--accent-2)" },
  approved: { label: "Approved draft", note: "A draft your team approved", token: "var(--warn)" },
  draft: { label: "Draft", note: "An unpublished draft under review", token: "var(--faint)" },
};

function kindOf(t: string) {
  return KIND[t] ?? { label: t || "Document", note: "", token: "var(--accent-2)" };
}

/**
 * The evidence library, made legible.
 *
 * It leads with plain numbers (how many documents, how many passages), says in
 * one line what the library IS and how a review uses it, then lists what is
 * actually in it with a readable type on every row and a search box. The old
 * page led with an abstract node graph and raw internal labels; this leads with
 * the thing a customer actually asks - "what are you checking my drafts
 * against, and can I see it?"
 */
export function EvidenceList() {
  const { orgId, canManageTeam } = useRole();
  const { toast } = useToast();

  const [rows, setRows] = useState<EvidenceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");

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

  const kinds = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.doc_type] = (c[r.doc_type] ?? 0) + 1;
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.doc_type !== filter) return false;
      if (!q) return true;
      return (r.source_file || "").toLowerCase().includes(q) || (r.company || "").toLowerCase().includes(q);
    });
  }, [rows, query, filter]);

  async function remove(row: EvidenceRow) {
    const label = row.source_file || row.company || "this entry";
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

  const filterTabs: { key: string; label: string }[] = [
    { key: "all", label: `All (${rows.length})` },
    ...Object.keys(kinds).map((k) => ({ key: k, label: `${kindOf(k).label} (${kinds[k]})` })),
  ];

  return (
    <div>
      {/* what this is */}
      <section className="app-card" style={{ padding: "16px 20px", marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: "0 0 6px" }}>
          What is the evidence library?
        </h2>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: 0, maxWidth: 720, lineHeight: 1.55 }}>
          It&apos;s everything Harmony compares your drafts against. When you submit a draft for review,
          each claim in it is checked against these documents — if the draft contradicts something here,
          Harmony flags it and quotes the exact line. Add past filings and releases so the very first
          review has something to check against.
        </p>
      </section>

      {/* numbers */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4" style={{ marginBottom: 16 }}>
        <StatTile label="Documents" value={rows.length} hint="in the library" />
        <StatTile label="Passages" value={total} hint="searchable snippets" />
        <StatTile label="Imported" value={kinds.history ?? 0} hint="uploaded by you" accent={KIND.history.token} />
        <StatTile
          label="From drafts"
          value={(kinds.approved ?? 0) + (kinds.draft ?? 0)}
          hint="approved + in review"
          accent={KIND.approved.token}
        />
      </div>

      {/* the list */}
      <section className="app-card scroll-x" style={{ padding: "6px 20px 12px" }}>
        <div className="flex items-center justify-between gap-3" style={{ padding: "14px 0 10px", flexWrap: "wrap" }}>
          <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
            {filterTabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setFilter(t.key)}
                className="pill"
                style={{
                  fontSize: 12,
                  padding: "4px 11px",
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: filter === t.key ? "var(--surface-2)" : "transparent",
                  color: filter === t.key ? "var(--text)" : "var(--muted)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <input
            type="search"
            placeholder="Search documents…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              fontSize: 13,
              padding: "6px 11px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--bg-elev)",
              color: "var(--text)",
              minWidth: 180,
              fontFamily: "inherit",
            }}
          />
        </div>

        <table className="app-table">
          <thead>
            <tr>
              <th scope="col">Document</th>
              <th scope="col">Type</th>
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
                <td colSpan={6} style={{ color: "var(--muted)" }}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--muted)" }}>
                  Nothing here yet. Add past documents from the Documents page (step 1), and they&apos;ll
                  appear here as evidence.
                </td>
              </tr>
            )}
            {!loading && rows.length > 0 && visible.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--muted)" }}>
                  No documents match your search.
                </td>
              </tr>
            )}
            {visible.map((row) => {
              const k = kindOf(row.doc_type);
              return (
                <tr key={row.id}>
                  <td style={{ color: "var(--text)" }}>{row.source_file || "Pasted text"}</td>
                  <td>
                    <span
                      className="flex items-center gap-2"
                      style={{ fontSize: 12.5, color: "var(--muted)", whiteSpace: "nowrap" }}
                      title={k.note}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: k.token, flex: "none" }} aria-hidden />
                      {k.label}
                    </span>
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
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
