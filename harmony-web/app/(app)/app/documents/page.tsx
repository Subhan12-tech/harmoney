"use client";

import { useMemo, useRef, useState } from "react";
import { useRole } from "@/context/RoleContext";
import { useAsyncData } from "@/lib/useAsyncData";
import { useUploads, type UploadKind } from "@/lib/useUploads";
import { getDocuments, type DocStatus, type DocType, type Severity } from "@/lib/data";
import { DocTable } from "@/components/app/DocTable";
import { UploadZone } from "@/components/app/UploadZone";
import { SubmitDraftPanel } from "@/components/app/SubmitDraftPanel";
import { UploadList } from "@/components/app/UploadList";
import { useToast } from "@/components/app/Toast";
import { ClipboardIcon, DriveIcon, FolderIcon, UploadIcon } from "@/components/app/icons";
import { accent2ButtonStyle, primaryButtonStyle, secondaryButtonStyle } from "@/lib/style";

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

export default function DocumentsPage() {
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
  const draftInput = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () =>
      documents.filter(
        (d) =>
          (type === "All types" || d.type === type) &&
          (status === "All statuses" || d.status === status) &&
          (risk === "All risk levels" || d.risk === risk),
      ),
    [documents, type, status, risk],
  );

  function handlePicked(files: FileList | null, kind: UploadKind) {
    if (files?.length) addFiles(files, kind);
  }

  async function pasteText() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast("Clipboard is empty — copy your draft first.");
        return;
      }
      // Hand it to the review panel rather than faking an upload row.
      const box = document.querySelector<HTMLTextAreaElement>("#check-heading ~ textarea, section textarea");
      if (box) {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
        setter?.call(box, text);
        box.dispatchEvent(new Event("input", { bubbles: true }));
        box.scrollIntoView({ behavior: "smooth", block: "center" });
        toast("Draft pasted. Press “Check this document” to run it.");
      } else {
        toast("Paste it into the Check a document box above.");
      }
    } catch {
      // Clipboard read is permission-gated and fails outright in some browsers.
      toast("Clipboard access was blocked. Use “Upload draft” instead.");
    }
  }

  return (
    <>
      {/* The one control that actually runs the pipeline. */}
      <SubmitDraftPanel />

      {/* ---- Upload cards ---- */}
      <section aria-label="Add documents">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2" style={{ marginBottom: 16 }}>
          <UploadZone
            kind="corpus"
            title="Historical corpus"
            description="Upload an entire folder of prior filings, transcripts, and letters. Harmony indexes them as evidence for future reviews."
            dropHint="or drop a folder here"
            meta={["PDF · DOCX · TXT · MD · HTML", "Up to 5 GB", "Encrypted at rest"]}
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

          <UploadZone
            kind="draft"
            title="Current drafts"
            badge="Send for AI review"
            description="Drop the release you are preparing now. Harmony compares it to your corpus and returns cited issues in under 2 minutes."
            meta={["Assign reviewer", "Set deadline", "Notify on complete"]}
            onDropFiles={(files) => addFiles(files, "draft")}
            actions={
              <>
                <button
                  type="button"
                  style={pillButton({
                    ...primaryButtonStyle,
                    padding: "8px 14px",
                    fontSize: 13,
                    boxShadow: "0 6px 18px color-mix(in srgb, var(--accent) 25%, transparent)",
                  })}
                  onClick={() => draftInput.current?.click()}
                >
                  <UploadIcon size={14} strokeWidth={1.8} />
                  Upload draft
                </button>
                <button type="button" style={pillButton(compactSecondary)} onClick={pasteText}>
                  <ClipboardIcon size={14} strokeWidth={1.8} />
                  Paste text
                </button>

              </>
            }
          />
        </div>
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
        accept=".pdf,.docx,.txt,.md,.html"
        onChange={(e) => {
          handlePicked(e.target.files, "corpus");
          e.target.value = "";
        }}
      />
      <input
        ref={draftInput}
        type="file"
        multiple
        hidden
        aria-hidden="true"
        tabIndex={-1}
        accept=".pdf,.docx,.txt,.md,.html"
        onChange={(e) => {
          handlePicked(e.target.files, "draft");
          e.target.value = "";
        }}
      />

      <UploadList uploads={uploads} onCancel={cancel} onRemove={remove} onClearCompleted={clearCompleted} />

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
          onClick={() => draftInput.current?.click()}
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
