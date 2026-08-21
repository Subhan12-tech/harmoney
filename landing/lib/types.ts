export type ReviewIssue = {
  quote: string;
  span: [number, number];
  severity: "high" | "medium" | "low";
  reason: string;
  evidence_doc: string;
  evidence_date: string;
  evidence_source: string;
  evidence_quote: string;
  confidence: number;
  suggestion: string;
};

export type EvidenceItem = {
  content: string;
  company: string;
  date: string;
  source: string;
  doc_type: string;
};
