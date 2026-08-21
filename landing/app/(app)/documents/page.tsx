"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Card, EmptyState, ErrorBox, PageHead, Select, SeverityChip, Table, Td, Th } from "@/components/ui/kit";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";

export default function DocumentsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [risk, setRisk] = useState("");

  useEffect(() => {
    api("/api/documents")
      .then((d: any) => setDocs(d.documents))
      .catch((e) => setError(String(e)));
  }, []);

  const types = useMemo(() => Array.from(new Set(docs.map((d) => d.doc_type))), [docs]);
  const filtered = docs.filter(
    (d) => (!type || d.doc_type === type) && (!status || d.status === status) && (!risk || d.risk === risk)
  );

  if (error) return <ErrorBox>{error}</ErrorBox>;

  return (
    <div>
      <PageHead eyebrow="All documents" title="My Documents" subtitle="Every document you've submitted, and what happened to it." />

      <div className="flex items-center gap-3" style={{ marginBottom: 18, flexWrap: "wrap" }}>
        <Select value={type} onChange={(e) => setType(e.target.value)} style={{ maxWidth: 190 }}>
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 190 }}>
          <option value="">All statuses</option>
          <option>In Review</option>
          <option>Changes Requested</option>
          <option>Published</option>
        </Select>
        <Select value={risk} onChange={(e) => setRisk(e.target.value)} style={{ maxWidth: 190 }}>
          <option value="">All risk levels</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </Select>
        <Link href="/review" style={{ marginLeft: "auto" }}>
          <Button variant="primary">＋ Check a new document</Button>
        </Link>
      </div>

      <Card style={{ padding: "8px 24px 6px" }}>
        {filtered.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Document</Th>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th>Reviewer</Th>
                <Th>Risk</Th>
                <Th>Updated</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id}>
                  <Td>{d.title}</Td>
                  <Td muted>{d.doc_type}</Td>
                  <Td>
                    <span style={{ background: "#151515", borderRadius: 6, padding: "3px 9px", fontSize: 11 }}>{d.status}</span>
                  </Td>
                  <Td muted>{d.reviewer}</Td>
                  <Td>
                    <SeverityChip severity={d.risk} />
                  </Td>
                  <Td muted>{timeAgo(d.created_at)}</Td>
                  <Td>
                    <Link href={`/documents/${d.id}`} style={{ color: "#6ea8ff", fontSize: 13 }}>
                      Open →
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState>No documents match these filters.</EmptyState>
        )}
      </Card>
    </div>
  );
}
