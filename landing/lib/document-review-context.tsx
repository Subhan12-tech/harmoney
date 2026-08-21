"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api";
import type { EvidenceItem, ReviewIssue } from "./types";

type DocState = {
  loading: boolean;
  error: string;
  doc: any | null;
  hasReview: boolean;
  reviewId: string | null;
  reviewStatus: string | null; // pending / approved / rejected
  criticVerdict: string;
  averageRating: number;
  report: string;
  issues: ReviewIssue[];
  evidence: EvidenceItem[];
  refetch: () => void;
  updateIssues: (issues: ReviewIssue[]) => void;
  updateContent: (content: string) => void;
  decide: (decision: "approve" | "reject") => Promise<{ status: string; final_version?: string }>;
};

const Ctx = createContext<DocState | null>(null);

export function DocumentReviewProvider({ id, children }: { id: string; children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [doc, setDoc] = useState<any | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);
  const [criticVerdict, setCriticVerdict] = useState("");
  const [averageRating, setAverageRating] = useState(0);
  const [report, setReport] = useState("");
  const [issues, setIssues] = useState<ReviewIssue[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api(`/api/documents/${id}`)
      .then((d: any) => {
        setDoc(d.document);
        const rev = d.reviews && d.reviews[0]; // newest-first
        if (rev) {
          setReviewId(rev.id);
          setReviewStatus(rev.status);
          setCriticVerdict(rev.critic_verdict);
          setAverageRating(rev.average_rating);
          setReport(rev.report);
          setIssues(rev.issues || []);
          setEvidence(rev.evidence || []);
        } else {
          setReviewId(null);
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  }, [id]);

  useEffect(load, [load]);

  const decide = useCallback(
    async (decision: "approve" | "reject") => {
      const d: any = await api("/api/decision", "POST", { review_id: reviewId, decision });
      if (d.status === "approved") {
        setReviewStatus("approved");
        setDoc((prev: any) => (prev ? { ...prev, status: "Published" } : prev));
      } else {
        setReviewStatus("rejected");
        setDoc((prev: any) => (prev ? { ...prev, status: "Changes Requested" } : prev));
      }
      return d;
    },
    [reviewId]
  );

  return (
    <Ctx.Provider
      value={{
        loading,
        error,
        doc,
        hasReview: !!reviewId,
        reviewId,
        reviewStatus,
        criticVerdict,
        averageRating,
        report,
        issues,
        evidence,
        refetch: load,
        updateIssues: setIssues,
        updateContent: (content) => setDoc((prev: any) => (prev ? { ...prev, content } : prev)),
        decide,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useDocumentReview(): DocState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDocumentReview must be used within DocumentReviewProvider");
  return ctx;
}
