"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, Kicker, SeverityChip, Textarea } from "@/components/ui/kit";
import { useDocumentReview } from "@/lib/document-review-context";
import { useToast } from "@/components/ui/toast";

export default function IssueDetailPage() {
  const { id, idx } = useParams<{ id: string; idx: string }>();
  const router = useRouter();
  const showToast = useToast();
  const { doc, issues, updateIssues, updateContent } = useDocumentReview();
  const i = parseInt(idx, 10);
  const issue = issues[i];
  const [suggestion, setSuggestion] = useState(issue?.suggestion || "");
  const [applied, setApplied] = useState(false);

  if (!issue || !doc) {
    return (
      <Card>
        <p style={{ color: "#8a8a8a", margin: 0 }}>
          Issue not found. <Link href={`/documents/${id}/issues`} style={{ color: "#6ea8ff" }}>Back to issues</Link>
        </p>
      </Card>
    );
  }

  function applyFix() {
    if (doc.content.includes(issue.quote)) {
      updateContent(doc.content.replace(issue.quote, suggestion));
      setApplied(true);
      showToast("Applied — visible on the Draft tab now. Approve & publish to finalize.");
    } else {
      showToast("Couldn't locate the original sentence in the draft — copy the suggestion manually.", true);
    }
  }

  function dismiss() {
    updateIssues(issues.filter((_, idx2) => idx2 !== i));
    showToast("Dismissed.");
    router.push(`/documents/${id}/issues`);
  }

  return (
    <div>
      <Link href={`/documents/${id}/issues`} style={{ color: "#6ea8ff", fontSize: 13 }}>
        ← Back to issues
      </Link>

      <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 16 }}>
        <Card>
          <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
            <Kicker>Why this was flagged</Kicker>
            <SeverityChip severity={issue.severity} />
          </div>
          <div style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 8, padding: "12px 14px", fontSize: 14.5, color: "#d4d4d4", marginBottom: 14 }}>
            &ldquo;{issue.quote}&rdquo;
          </div>
          <p style={{ margin: 0 }}>{issue.reason}</p>

          <div style={{ height: 1, background: "#141414", margin: "18px 0" }} />

          <Kicker>Where this comes from</Kicker>
          <div style={{ fontSize: 14.5, fontWeight: 600 }}>{issue.evidence_doc}</div>
          <div style={{ color: "#666", fontSize: 12.5, marginBottom: 8 }}>
            {issue.evidence_date} · {issue.evidence_source}
          </div>
          <div style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 8, padding: "12px 14px", fontStyle: "italic", color: "#6ea8ff" }}>
            &ldquo;{issue.evidence_quote}&rdquo;
          </div>
          <div style={{ color: "#666", fontSize: 12.5, marginTop: 10 }}>How sure the AI is: {issue.confidence}%</div>
        </Card>

        <Card>
          <Kicker>Suggested fix</Kicker>
          <p style={{ color: "#8a8a8a", fontSize: 13.5, margin: "0 0 12px" }}>
            Edit it if you want, then apply it to the draft. A person still needs to approve the document before it&rsquo;s used.
          </p>
          <Textarea rows={5} value={suggestion} onChange={(e) => setSuggestion(e.target.value)} />
          <div className="flex gap-2" style={{ marginTop: 14 }}>
            <Button variant="primary" onClick={applyFix}>
              {applied ? "Re-apply" : "Use this fix"}
            </Button>
            <Button variant="ghost" onClick={dismiss}>
              Ignore this one
            </Button>
          </div>
          {applied && (
            <p style={{ color: "#6ea8ff", fontSize: 13, marginTop: 10 }}>
              Applied locally — <Link href={`/documents/${id}/draft`} style={{ color: "#6ea8ff" }}>view it on the Draft page →</Link>
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
