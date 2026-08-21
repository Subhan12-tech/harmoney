"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Kicker, PageHead } from "@/components/ui/kit";
import { API_URL, getToken } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

export default function ReviewPage() {
  const router = useRouter();
  const showToast = useToast();
  const [draft, setDraft] = useState("");
  const [words, setWords] = useState(0);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [currentLabel, setCurrentLabel] = useState("");
  const [tokenText, setTokenText] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setUploadMsg(`uploading ${files.length} file(s)…`);
    const fd = new FormData();
    Array.from(files).forEach((f) => {
      const n = f.name.toLowerCase();
      if (n.endsWith(".pdf") || n.endsWith(".txt") || n.endsWith(".docx")) fd.append("files", f);
    });
    try {
      const res = await fetch(`${API_URL}/api/upload`, { method: "POST", headers: { Authorization: "Bearer " + getToken() }, body: fd });
      const d = await res.json();
      if (!res.ok) throw d.detail || d.error || "upload failed";
      setDraft(d.text || "");
      setWords(d.words || 0);
      setUploadMsg(`loaded ${d.count} file(s)` + (d.skipped?.length ? ` · skipped: ${d.skipped.join(", ")}` : ""));
    } catch (e) {
      setUploadMsg(String(e));
    }
  }

  async function runReview() {
    const text = draft.trim();
    if (!text) return;
    setRunning(true);
    setSteps([]);
    setCurrentLabel("Getting started");
    setTokenText("");

    try {
      const resp = await fetch(`${API_URL}/api/review_stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
        body: JSON.stringify({ draft: text }),
      });
      if (!resp.ok || !resp.body) throw resp.status === 401 ? "Session expired — please sign in again." : `Request failed (${resp.status}).`;

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let finalResult: any = null;
      let label = "";
      const localSteps: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const raw = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const line = raw.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          let evt: any;
          try {
            evt = JSON.parse(line.slice(5).trim());
          } catch {
            continue;
          }
          if (evt.type === "step") {
            if (label) {
              localSteps.push(label);
              setSteps([...localSteps]);
            }
            label = evt.label;
            setCurrentLabel(label);
          } else if (evt.type === "token") {
            setTokenText((prev) => prev + evt.text);
          } else if (evt.type === "done") {
            finalResult = evt.result;
          } else if (evt.type === "error") {
            throw evt.message;
          }
        }
      }
      if (!finalResult) throw "The connection ended before the check finished. Please try again.";

      showToast("Done — here's what we found.");
      router.push(`/documents/${finalResult.document_id}`);
      return; // keep "running" true through the redirect so the streaming view doesn't flash away
    } catch (e) {
      showToast(String(e), true);
      setRunning(false);
    }
  }

  if (running) {
    return (
      <Card>
        <Kicker>Checking your document…</Kicker>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: tokenText ? 20 : 4 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ fontSize: 15 }}>
              {s}
            </div>
          ))}
          {currentLabel && <div style={{ fontSize: 15, color: "#6ea8ff" }}>{currentLabel}…</div>}
        </div>
        {tokenText && (
          <>
            <div style={{ height: 1, background: "#141414", margin: "16px 0" }} />
            <Kicker>Report (writing now)</Kicker>
            <div style={{ whiteSpace: "pre-wrap", fontSize: 14.5, lineHeight: 1.65, maxHeight: 360, overflow: "auto", color: "#ccc" }}>{tokenText}</div>
          </>
        )}
      </Card>
    );
  }

  return (
    <div>
      <PageHead eyebrow="New check" title="Check a Document" subtitle="Paste or upload the new draft below — we'll compare it to your Past Documents and point out anything that doesn't match." />
      <Card>
        <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
          <Kicker>Step 1 — Add your draft</Kicker>
          <div style={{ color: "#666", fontSize: 13 }}>{words} words</div>
        </div>
        <textarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setWords(e.target.value.trim().split(/\s+/).filter(Boolean).length);
          }}
          rows={14}
          placeholder="Paste the document text here…"
          style={{ width: "100%", background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 9, padding: "13px 15px", color: "#e5e5e5", fontSize: 14.5, lineHeight: 1.6, resize: "vertical", fontFamily: "var(--font-inter)" }}
        />
        <div className="flex items-center gap-3" style={{ marginTop: 14, flexWrap: "wrap" }}>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            Upload a file instead
          </Button>
          <Button variant="secondary" onClick={() => folderRef.current?.click()}>
            Upload a folder
          </Button>
          <span style={{ color: "#8a8a8a", fontSize: 13 }}>{uploadMsg}</span>
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.txt,.docx" multiple hidden onChange={(e) => uploadFiles(e.target.files)} />
        <input
          ref={folderRef}
          type="file"
          // @ts-ignore — non-standard attributes for folder selection
          webkitdirectory=""
          directory=""
          multiple
          hidden
          onChange={(e) => uploadFiles(e.target.files)}
        />
        <div style={{ height: 1, background: "#141414", margin: "22px 0" }} />
        <Kicker>Step 2 — Check it</Kicker>
        <Button variant="primary" onClick={runReview} disabled={!draft.trim()}>
          Check this document
        </Button>
      </Card>
    </div>
  );
}
