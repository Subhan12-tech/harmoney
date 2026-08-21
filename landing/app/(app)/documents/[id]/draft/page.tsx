"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, Kicker } from "@/components/ui/kit";
import { useDocumentReview } from "@/lib/document-review-context";
import { HighlightedDraft } from "@/components/review/HighlightedDraft";

export default function DraftPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { doc, issues } = useDocumentReview();

  if (!doc) return null;

  return (
    <Card>
      <Kicker>The document, with flagged sentences highlighted</Kicker>
      <p style={{ color: "#8a8a8a", fontSize: 13.5, margin: "0 0 18px" }}>
        Click a highlighted sentence to see why it was flagged and what to do about it.
      </p>
      <HighlightedDraft content={doc.content} issues={issues} onSelect={(i) => router.push(`/documents/${id}/issues/${i}`)} />
    </Card>
  );
}
