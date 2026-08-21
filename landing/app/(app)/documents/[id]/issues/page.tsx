"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, EmptyState, SeverityChip } from "@/components/ui/kit";
import { useDocumentReview } from "@/lib/document-review-context";

export default function IssuesListPage() {
  const { id } = useParams<{ id: string }>();
  const { issues } = useDocumentReview();

  if (!issues.length) {
    return (
      <Card>
        <EmptyState>Nothing flagged — this document looks consistent with your past documents.</EmptyState>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {issues.map((issue, i) => (
        <Link key={i} href={`/documents/${id}/issues/${i}`}>
          <Card style={{ cursor: "pointer" }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
              <SeverityChip severity={issue.severity} />
              <span style={{ color: "#666", fontSize: 12 }}>{issue.confidence}% confident · view →</span>
            </div>
            <p style={{ margin: 0, fontSize: 14.5, color: "#d4d4d4" }}>&ldquo;{issue.quote}&rdquo;</p>
            <p style={{ margin: "8px 0 0", fontSize: 13.5, color: "#8a8a8a" }}>{issue.reason}</p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
