"use client";

import { Card, Chip, EmptyState, Kicker } from "@/components/ui/kit";
import { useDocumentReview } from "@/lib/document-review-context";

export default function DocumentEvidencePage() {
  const { evidence } = useDocumentReview();

  return (
    <Card>
      <Kicker>Past documents we checked this against</Kicker>
      {evidence.length ? (
        evidence.map((ev, i) => (
          <div key={i} style={{ border: "1px solid #141414", borderRadius: 10, padding: 16, marginBottom: 10 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
              <strong style={{ fontSize: 14 }}>{ev.company}</strong>
              <Chip>{ev.doc_type}</Chip>
            </div>
            <div style={{ color: "#666", fontSize: 12.5, marginBottom: 8 }}>
              {ev.date} · {ev.source}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: "#ccc" }}>{ev.content}</div>
          </div>
        ))
      ) : (
        <EmptyState>Nothing in Past Documents matched this one yet.</EmptyState>
      )}
    </Card>
  );
}
