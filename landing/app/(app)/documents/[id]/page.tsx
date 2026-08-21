"use client";

import { useState } from "react";
import { Button, Card, Kicker, Modal, OkBox } from "@/components/ui/kit";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { ROLE_RANK } from "@/lib/format";
import { useDocumentReview } from "@/lib/document-review-context";
import { PlainDocument } from "@/components/review/PlainDocument";

export default function DocumentOverviewPage() {
  const { doc, hasReview, reviewStatus, issues, averageRating, criticVerdict, decide } = useDocumentReview();
  const { me } = useAuth();
  const showToast = useToast();
  const [showApprove, setShowApprove] = useState(false);
  const [finalOut, setFinalOut] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!hasReview) return <PlainDocument doc={doc} />;

  const role = me?.role || "viewer";
  const canApprove = ROLE_RANK[role] >= ROLE_RANK.reviewer;
  const isViewer = role === "viewer";
  const isPending = doc.status === "In Review" && reviewStatus === "pending";
  const highs = issues.filter((i: any) => i.severity === "high").length;

  async function handleDecide(decision: "approve" | "reject") {
    setBusy(true);
    try {
      const d = await decide(decision);
      if (d.status === "approved") {
        setFinalOut("Approved — final aligned version:\n\n" + (d.final_version || ""));
        showToast("Document approved and published.");
      } else {
        setFinalOut("Rejected — nothing was saved. The draft has been returned as Changes Requested.");
        showToast("Review rejected.");
      }
    } catch (e) {
      showToast("This review session may have expired (server restarted). " + String(e), true);
    } finally {
      setBusy(false);
      setShowApprove(false);
    }
  }

  return (
    <div>
      <Card>
        <Kicker>Submitted by</Kicker>
        <p style={{ margin: "0 0 18px" }}>{doc.submitted_by}</p>
        <Kicker>At a glance</Kicker>
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          <div>
            <div className="font-serif" style={{ fontSize: 28 }}>
              {issues.length}
            </div>
            <div style={{ color: "#8a8a8a", fontSize: 13 }}>thing{issues.length === 1 ? "" : "s"} flagged{highs ? ` (${highs} high risk)` : ""}</div>
          </div>
          <div>
            <div className="font-serif" style={{ fontSize: 28 }}>
              {averageRating}/10
            </div>
            <div style={{ color: "#8a8a8a", fontSize: 13 }}>match score</div>
          </div>
          <div>
            <div className="font-serif" style={{ fontSize: 28 }}>
              {criticVerdict === "pass" ? "Yes" : "Check"}
            </div>
            <div style={{ color: "#8a8a8a", fontSize: 13 }}>fact-checked</div>
          </div>
        </div>
      </Card>

      <Card style={{ marginTop: 20 }}>
        <Kicker>What do you want to do?</Kicker>
        <p style={{ color: "#8a8a8a", maxWidth: 640, margin: "0 0 4px" }}>Checking is done. A person still has to approve this before it goes out.</p>

        {!isPending ? (
          <OkBox>This one&rsquo;s already been decided{reviewStatus ? ` (${reviewStatus})` : ""}.</OkBox>
        ) : canApprove ? (
          <div className="flex gap-3" style={{ marginTop: 12, flexWrap: "wrap" }}>
            <Button variant="primary" disabled={busy} onClick={() => setShowApprove(true)}>
              Approve &amp; publish
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => handleDecide("reject")}>
              Send back for changes
            </Button>
          </div>
        ) : isViewer ? (
          <div style={{ marginTop: 8 }}>
            <OkBox>You can view this, but only an Owner, Admin or Reviewer can approve it.</OkBox>
          </div>
        ) : (
          <div style={{ marginTop: 8 }}>
            <OkBox>You can use the suggested fixes, but approving needs a Reviewer, Admin or Owner.</OkBox>
          </div>
        )}

        {finalOut && (
          <div style={{ marginTop: 14, whiteSpace: "pre-wrap" }}>
            <OkBox>{finalOut}</OkBox>
          </div>
        )}
      </Card>

      {showApprove && (
        <Modal onClose={() => setShowApprove(false)}>
          <h3 className="font-serif" style={{ fontSize: 20, marginBottom: 14 }}>
            Confirm approval &amp; publish
          </h3>
          <p style={{ fontSize: 13.5, margin: "0 0 8px" }}>
            Reviewer: {me?.full_name || me?.email} · Document: {doc.title}
          </p>
          <p style={{ fontSize: 13.5, margin: "0 0 8px" }}>
            Unresolved issues: {issues.length} · High-risk: {highs} · Match score: {averageRating}/10
          </p>
          <p style={{ fontSize: 13.5, margin: "0 0 18px" }}>
            By approving this document, you confirm that you have reviewed the identified inconsistencies and supporting evidence, and take responsibility for its publication.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowApprove(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={busy} onClick={() => handleDecide("approve")}>
              Approve &amp; publish
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
