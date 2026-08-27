"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRole } from "@/context/RoleContext";
import { useAsyncData } from "@/lib/useAsyncData";
import { useUploads, type UploadKind } from "@/lib/useUploads";
import { getDocuments, type DocStatus, type DocType, type Severity } from "@/lib/data";
import { DocTable } from "@/components/app/DocTable";
import { UploadZone } from "@/components/app/UploadZone";
import { SubmitDraftPanel } from "@/components/app/SubmitDraftPanel";
import { UploadList } from "@/components/app/UploadList";
import { useToast } from "@/components/app/Toast";
import { FolderIcon } from "@/components/app/icons";
import { accent2ButtonStyle, primaryButtonStyle, secondaryButtonStyle } from "@/lib/style";
import { PageHeader } from "@/components/app/PageHeader";

const TYPES: (DocType | "All types")[] = [
  "All types",
  "Earnings Release",
  "Press Release",
  "Investor Letter",
  "Regulatory Filing",
  "Analyst Call",
  "Corporate Statement",
];
const STATUSES: (DocStatus | "All statuses")[] = [
  "All statuses",
  "Draft",
  "In Review",
  "Changes Requested",
  "Approved",
  "Published",
];
const RISKS: (Severity | "All risk levels")[] = ["All risk levels", "High", "Medium", "Low"];

/** The upload cards use a denser button than the page default. */
const compactSecondary: React.CSSProperties = {
  ...secondaryButtonStyle,
  padding: "8px 14px",
  fontSize: 13,
};

function pillButton(base: React.CSSProperties): React.CSSProperties {
  return { ...base, display: "inline-flex", alignItems: "center", gap: 6, fontFamily: base.fontFamily ?? "inherit" };
}

const selectStyle: React.CSSProperties = {
  // Fixed rather than intrinsic: a select sized to its longest option leaves
  // the chevron sitting on top of the label in the narrowest filter.
  width: 170,
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "9px 12px",
  color: "var(--text)",
  fontSize: 13,
};

function DocumentsPageInner() {
  const search = useSearchParams();
  const { orgId } = useRole();
  const { toast } = useToast();

  const documents = useAsyncData(() => getDocuments(orgId), [orgId], []);

  const [type, setType] = useState<string>("All types");
  const [status, setStatus] = useState<string>("All statuses");
  const [risk, setRisk] = useState<string>("All risk levels");

  const { uploads, addFiles, addSynthetic, cancel, remove, clearCompleted } = useUploads((u) =>
    toast(`${u.name} ${u.kind === "corpus" ? "indexed as evidence" : "ready for AI review"}.`),
  );

  // Hidden file inputs — one per source, so a folder pick and a file pick can
  // carry different `webkitdirectory` settings.
  const folderInput = useRef<HTMLInputElement>(null);
  const corpusFileInput = useRef<HTMLInputElement>(null);

  // ?q= comes from the header search, which navigates here from any page that
  // is not a review. Without honouring it the header would look like it did
  // nothing - the exact dead-end this search was fixed to remove.
  const query = (search.get("q") ?? "").trim().toLowerCase();

  const filtered = useMemo(
    () =>
      documents.filter(
        (d) =>
          (type === "All types" || d.type === type) &&
          (status === "All statuses" || d.status === status) &&
          (risk === "All risk levels" || d.risk === risk) &&
          (!query ||
            d.name.toLowerCase().includes(query) ||
            d.type.toLowerCase().includes(query) ||
            d.status.toLowerCase().includes(query)),
      ),
    [documents, type, status, risk, query],
  );

  function handlePicked(files: FileList | null, kind: UploadKind) {
    if (files?.length) addFiles(files, kind);
  }

  return (
    <>
      <UploadProgressBar uploads={uploads} />

      <PageHeader
        title="Documents"
        blurb="Two things happen here: you build the evidence library once, then check each new draft against it."
      />

      {/* Step 1 first, because a review against an empty corpus finds nothing.
          The order on the page is the order of the work. */}
      <section aria-label="Add past documents" style={{ marginBottom: 22 }}>
        <StepLabel
          n={1}
          title="Add your past documents"
          detail="Everything your company has already said - filings, transcripts, press releases, investor letters. Harmony checks new drafts against these. You only do this once, then add to it over time."
        />
        <div className="grid grid-cols-1 gap-4">
          <UploadZone
            kind="corpus"
            title="Evidence library"
            description="Old documents - things you have already published. These are never reviewed; they are what future drafts get checked against."
            dropHint="or drop a folder here"
            meta={["PDF · DOCX · TXT · MD · CSV · images", "Screenshots and photos are read too", "Encrypted at rest"]}
            onDropFiles={(files) => addFiles(files, "corpus")}
            actions={
              <>
                <button type="button" style={pillButton(accent2ButtonStyle)} onClick={() => folderInput.current?.click()}>
                  <FolderIcon size={14} strokeWidth={1.8} />
                  Select folder
                </button>
                <button
                  type="button"
                  style={pillButton(compactSecondary)}
                  onClick={() => corpusFileInput.current?.click()}
                >
                  Add files
                </button>
              </>
            }
          />

        </div>

        {/* Directly under the zone that feeds it. It used to render after both
            steps, so an upload started at the top of the page reported its
            progress off-screen and looked like nothing had happened. */}
        <UploadList uploads={uploads} onCancel={cancel} onRemove={remove} onClearCompleted={clearCompleted} />
      </section>

      {/* Step 2: the draft being prepared now. */}
      <section aria-label="Check a new draft" style={{ marginBottom: 22 }}>
        <StepLabel
          n={2}
          title="Check a draft you are about to publish"
          detail="Paste or upload the document you are preparing. Harmony compares it against everything from step 1 and returns each conflict with the prior statement quoted."
        />
        <SubmitDraftPanel />
      </section>

      {/* Hidden pickers. `webkitdirectory` is set via a ref-free attribute cast
          because React does not type the non-standard folder-picking props. */}
      <input
        ref={folderInput}
        type="file"
        multiple
        hidden
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          handlePicked(e.target.files, "corpus");
          e.target.value = "";
        }}
        {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
      />
      <input
        ref={corpusFileInput}
        type="file"
        multiple
        hidden
        aria-hidden="true"
        tabIndex={-1}
        accept=".pdf,.docx,.txt,.md,.csv,.html,.png,.jpg,.jpeg,.webp"
        onChange={(e) => {
          handlePicked(e.target.files, "corpus");
          e.target.value = "";
        }}
      />

      {/* ---- Filters ---- */}
      <div className="flex flex-wrap gap-2.5" style={{ marginBottom: 16 }}>
        <label className="sr-only" htmlFor="filter-type">
          Filter by type
        </label>
        <select
          id="filter-type"
          className="h-select"
          style={selectStyle}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>

        <label className="sr-only" htmlFor="filter-status">
          Filter by status
        </label>
        <select
          id="filter-status"
          className="h-select"
          style={selectStyle}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        <label className="sr-only" htmlFor="filter-risk">
          Filter by risk level
        </label>
        <select
          id="filter-risk"
          className="h-select"
          style={selectStyle}
          value={risk}
          onChange={(e) => setRisk(e.target.value)}
        >
          {RISKS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>

        <button
          type="button"
          style={{ ...primaryButtonStyle, marginLeft: "auto" }}
          onClick={() =>
            document
              .getElementById("check-heading")
              ?.scrollIntoView({ behavior: "smooth", block: "center" })
          }
        >
          New review
        </button>
      </div>

      {/* ---- Table ---- */}
      <div className="app-card scroll-x" style={{ padding: "6px 20px 4px" }}>
        <DocTable documents={filtered} />
      </div>
    </>
  );
}

/** A numbered step heading. The page is a two-step process and should read like one. */
function StepLabel({ n, title, detail }: { n: number; title: string; detail: string }) {
  return (
    <div className="flex" style={{ gap: 12, marginBottom: 12 }}>
      <span
        aria-hidden
        style={{
          flex: "none",
          width: 22,
          height: 22,
          borderRadius: "50%",
          border: "1px solid var(--border-strong)",
          color: "var(--muted)",
          fontSize: 11.5,
          fontWeight: 550,
          display: "grid",
          placeItems: "center",
          marginTop: 1,
        }}
      >
        {n}
      </span>
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 550, letterSpacing: "-0.014em", margin: 0 }}>{title}</h2>
        <p style={{ color: "var(--muted)", fontSize: 12.5, lineHeight: 1.6, margin: "3px 0 0", maxWidth: 640 }}>
          {detail}
        </p>
      </div>
    </div>
  );
}

/**
 * A thin bar pinned to the top of the viewport while anything is uploading.
 *
 * The per-file list gives detail; this exists so the fact that work is
 * happening is visible from anywhere on the page, including mid-scroll.
 */
function UploadProgressBar({ uploads }: { uploads: { pct: number; state: string }[] }) {
  const active = uploads.filter((u) => u.state === "uploading");
  if (active.length === 0) return null;
  const pct = Math.round(active.reduce((sum, u) => sum + u.pct, 0) / active.length);

  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Uploading ${active.length} file${active.length === 1 ? "" : "s"}`}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: "transparent",
        zIndex: 60,
      }}
    >
      <div
        style={{
          height: 2,
          width: `${Math.max(4, pct)}%`,
          background: "var(--accent)",
          transition: "width 200ms linear",
        }}
      />
    </div>
  );
}

/** `useSearchParams` requires a Suspense boundary to prerender statically. */
export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="app-card" style={{ padding: 24, minHeight: 200 }} />}>
      <DocumentsPageInner />
    </Suspense>
  );
}
