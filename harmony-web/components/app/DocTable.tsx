import Link from "next/link";
import type { HarmonyDocument } from "@/lib/data";
import { neutralChipStyle, severityChipStyle } from "@/lib/style";

/**
 * The documents table. `compact` drops Status/Updated for the dashboard's
 * narrower "Pending approvals" column; both variants share one row renderer.
 */
export function DocTable({ documents, compact = false }: { documents: HarmonyDocument[]; compact?: boolean }) {
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
              <Link
                href={`/app/review?id=${encodeURIComponent(d.id)}`}
                style={{ fontSize: 12, color: "var(--accent)", whiteSpace: "nowrap" }}
              >
                Open <span aria-hidden="true">→</span>
                <span className="sr-only">{d.name}</span>
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
