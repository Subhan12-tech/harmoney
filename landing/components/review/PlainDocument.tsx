import Link from "next/link";
import { Card, Chip, Kicker } from "@/components/ui/kit";

export function PlainDocument({ doc }: { doc: any }) {
  return (
    <div>
      <div className="flex items-center gap-3" style={{ marginBottom: 6 }}>
        <Link href="/documents" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 8, padding: "8px 14px", fontSize: 13 }}>
          ←
        </Link>
        <h2 className="font-serif" style={{ fontSize: 24 }}>
          {doc.title}
        </h2>
        <Chip>{doc.doc_type}</Chip>
        <Chip color="#8a8a8a">{doc.status}</Chip>
      </div>
      <p style={{ fontSize: 14.5, color: "#8a8a8a", margin: "0 0 20px" }}>
        Added by {doc.submitted_by} — imported as a past document, no AI check was run on it.
      </p>
      <Card>
        <Kicker>Document text</Kicker>
        <div style={{ fontSize: 14.5, lineHeight: 1.85, color: "#d4d4d4", whiteSpace: "pre-wrap" }}>{doc.content}</div>
      </Card>
    </div>
  );
}
