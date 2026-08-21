"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Chip, ErrorBox } from "@/components/ui/kit";
import { DocumentReviewProvider, useDocumentReview } from "@/lib/document-review-context";

const STAGES = ["Draft", "AI Analysis", "Review", "Changes Requested", "Ready for Approval", "Approved", "Published"];
function stageIndex(status: string): number {
  return ({ Draft: 0, "In Review": 4, "Changes Requested": 3, Approved: 6, Published: 6 } as Record<string, number>)[status] ?? 0;
}

function Shell({ id, children }: { id: string; children: React.ReactNode }) {
  const { loading, error, doc, hasReview, issues, averageRating, criticVerdict } = useDocumentReview();
  const pathname = usePathname();

  if (loading) return <div style={{ color: "#8a8a8a" }}>Loading document…</div>;
  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!doc) return null;

  // Imported historical documents have no review — nothing to split into tabs, just show the overview page.
  if (!hasReview) return <>{children}</>;

  const idx = stageIndex(doc.status);
  const highs = issues.filter((i) => i.severity === "high").length;

  const tabs = [
    { href: `/documents/${id}`, label: "Overview" },
    { href: `/documents/${id}/draft`, label: "Draft" },
    { href: `/documents/${id}/issues`, label: `Issues (${issues.length})` },
    { href: `/documents/${id}/evidence`, label: "Evidence" },
    { href: `/documents/${id}/report`, label: "Report" },
  ];

  return (
    <div>
      <div className="flex items-center gap-3" style={{ marginBottom: 6 }}>
        <Link href="/documents" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 8, padding: "8px 14px", fontSize: 13 }}>
          ←
        </Link>
        <h2 className="font-serif" style={{ fontSize: 26 }}>
          {doc.title}
        </h2>
        <Chip>{doc.doc_type}</Chip>
      </div>
      <p style={{ fontSize: 14.5, color: "#8a8a8a", margin: "0 0 20px" }}>
        {issues.length} thing(s) flagged{highs ? ` (${highs} high risk)` : ""} · Match score {averageRating}/10 ·{" "}
        {criticVerdict === "pass" ? "Fact-checked" : "Needs another look"}
      </p>

      <div className="flex items-center overflow-auto" style={{ marginBottom: 24 }}>
        {STAGES.map((label, i) => (
          <div key={label} className="flex items-center flex-none">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 20,
                fontSize: 12,
                whiteSpace: "nowrap",
                background: i === idx ? "#fff" : i < idx ? "rgba(110,168,255,.12)" : "#0a0a0a",
                color: i === idx ? "#000" : i < idx ? "#6ea8ff" : "#666",
                fontWeight: i === idx ? 600 : 400,
              }}
            >
              <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: i <= idx ? "currentColor" : "#333" }} />
              {label}
            </div>
            {i < STAGES.length - 1 && <div style={{ width: 20, height: 1, background: "#1a1a1a" }} />}
          </div>
        ))}
      </div>

      <div className="flex" style={{ borderBottom: "1px solid #141414", marginBottom: 26, gap: 26, overflowX: "auto" }}>
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              style={{
                padding: "10px 2px",
                fontSize: 14,
                fontWeight: 600,
                whiteSpace: "nowrap",
                color: active ? "#fff" : "#8a8a8a",
                borderBottom: active ? "2px solid #6ea8ff" : "2px solid transparent",
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}

export default function DocumentDetailLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  return (
    <DocumentReviewProvider id={params.id}>
      <Shell id={params.id}>{children}</Shell>
    </DocumentReviewProvider>
  );
}
