"use client";

import { useRef, useState } from "react";
import { Button, Card, EmptyState, Input, Kicker, Label, PageHead, SegTabs, Table, Td, Th, Textarea } from "@/components/ui/kit";
import { api, API_URL, getToken } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { useToast } from "@/components/ui/toast";

export default function EvidencePage() {
  const [tab, setTab] = useState("upload");
  const showToast = useToast();

  const [company, setCompany] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [pasteMsg, setPasteMsg] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [searchOut, setSearchOut] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [summary, setSummary] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const d: any = await api("/api/history");
      setHistory(d.history);
      setSummary(`${d.history.length} document(s) · ${d.total_chunks} chunk(s) total`);
    } catch (e) {
      setSummary(String(e));
    } finally {
      setLoadingHistory(false);
    }
  }

  function goBrowse() {
    setTab("browse");
    loadHistory();
  }

  async function doSearch() {
    setSearchOut("Searching…");
    try {
      const d: any = await api("/api/search?q=" + encodeURIComponent(query));
      setSearchOut(d.related || "Nothing found.");
    } catch (e) {
      setSearchOut(String(e));
    }
  }

  async function addHistory() {
    const text = pasteText.trim();
    if (!text) return;
    setPasteMsg("saving…");
    try {
      await api("/api/ingest_text", "POST", { text, company: company.trim() || undefined });
      setPasteText("");
      showToast("Added! Here it is in your document list.");
      goBrowse();
    } catch (e) {
      setPasteMsg(String(e));
    }
  }

  async function uploadFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setUploadMsg(`uploading ${files.length} file(s)…`);
    const fd = new FormData();
    Array.from(files).forEach((f) => {
      const n = f.name.toLowerCase();
      if (n.endsWith(".pdf") || n.endsWith(".txt") || n.endsWith(".docx")) fd.append("files", f);
    });
    fd.append("company", company.trim() || "Unknown");
    try {
      const res = await fetch(`${API_URL}/api/upload_history`, { method: "POST", headers: { Authorization: "Bearer " + getToken() }, body: fd });
      const d = await res.json();
      if (!res.ok) throw d.detail || d.error || "upload failed";
      showToast(`Added ${d.count} document(s)!` + (d.skipped?.length ? ` Skipped (unsupported type): ${d.skipped.join(", ")}` : ""));
      goBrowse();
    } catch (e) {
      setUploadMsg(String(e));
    }
  }

  return (
    <div>
      <PageHead eyebrow="Evidence library" title="Past Documents" subtitle="Upload the documents we should compare new drafts against." />
      <SegTabs
        tabs={[
          { key: "upload", label: "Upload" },
          { key: "browse", label: "My Documents" },
        ]}
        active={tab}
        onChange={(k) => (k === "browse" ? goBrowse() : setTab(k))}
      />

      {tab === "upload" ? (
        <Card style={{ maxWidth: 640 }}>
          <Kicker>Step 1 — Who is it from?</Kicker>
          <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name (optional)" style={{ marginBottom: 20 }} />

          <Kicker>Step 2 — Add the document</Kicker>
          <div className="flex gap-3" style={{ flexWrap: "wrap" }}>
            <Button variant="primary" onClick={() => fileRef.current?.click()}>
              Upload a file
            </Button>
            <Button variant="secondary" onClick={() => folderRef.current?.click()}>
              Upload a whole folder
            </Button>
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.txt,.docx" multiple hidden onChange={(e) => uploadFiles(e.target.files)} />
          <input
            ref={folderRef}
            type="file"
            // @ts-ignore
            webkitdirectory=""
            directory=""
            multiple
            hidden
            onChange={(e) => uploadFiles(e.target.files)}
          />
          <div style={{ color: "#8a8a8a", fontSize: 13, marginTop: 12 }}>{uploadMsg}</div>
          <p style={{ color: "#8a8a8a", fontSize: 13.5, marginTop: 6 }}>Works with PDF, TXT and Word (.docx) files.</p>

          <div style={{ height: 1, background: "#141414", margin: "24px 0" }} />

          <Kicker>Or just paste text instead</Kicker>
          <Textarea rows={4} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder="Paste a past statement here…" />
          <div className="flex items-center gap-3" style={{ marginTop: 12 }}>
            <Button variant="secondary" onClick={addHistory}>
              Add this
            </Button>
            <span style={{ color: "#8a8a8a", fontSize: 13 }}>{pasteMsg}</span>
          </div>
        </Card>
      ) : (
        <>
          <Card style={{ marginBottom: 18 }}>
            <Kicker>Search your documents</Kicker>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()} placeholder="Type a topic, like “revenue guidance”" />
            <div style={{ marginTop: 12 }}>
              <Button size="sm" variant="primary" onClick={doSearch}>
                Search
              </Button>
            </div>
            {searchOut && <pre style={{ whiteSpace: "pre-wrap", fontSize: 14.5, marginTop: 14, color: "#ccc", fontFamily: "var(--font-inter)" }}>{searchOut}</pre>}
          </Card>

          <Card>
            <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
              <Kicker>Everything you&rsquo;ve uploaded</Kicker>
              <span style={{ color: "#8a8a8a", fontSize: 13 }}>{summary}</span>
            </div>
            <p style={{ color: "#8a8a8a", margin: "0 0 16px" }}>Every new document gets compared against all of this.</p>
            {loadingHistory ? (
              <div style={{ color: "#8a8a8a" }}>Loading…</div>
            ) : history.length ? (
              <Table>
                <thead>
                  <tr>
                    <Th>Company</Th>
                    <Th>Source</Th>
                    <Th>Type</Th>
                    <Th>Chunks</Th>
                    <Th>Added by</Th>
                    <Th>Added</Th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={i}>
                      <Td>{h.company}</Td>
                      <Td muted>{h.source_file || "Pasted text"}</Td>
                      <Td>
                        <span style={{ border: "1px solid #1a1a1a", borderRadius: 6, padding: "3px 9px", fontSize: 11 }}>{h.doc_type}</span>
                      </Td>
                      <Td muted>{h.chunk_count}</Td>
                      <Td muted>{h.added_by_name}</Td>
                      <Td muted>{timeAgo(h.created_at)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <EmptyState>Nothing uploaded yet — switch to the Upload tab to add your first document.</EmptyState>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
