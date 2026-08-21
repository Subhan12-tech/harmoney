"use client";

import { Card, Kicker } from "@/components/ui/kit";
import { renderReportHtml } from "@/lib/markdown";
import { useDocumentReview } from "@/lib/document-review-context";

export default function DocumentReportPage() {
  const { report } = useDocumentReview();

  return (
    <Card>
      <Kicker>Full report</Kicker>
      <div dangerouslySetInnerHTML={{ __html: renderReportHtml(report) }} />
    </Card>
  );
}
