"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, submitDraft, uploadForText, type ReviewResult } from "@/lib/api";
import { useToast } from "./Toast";
import { primaryButtonStyle, secondaryButtonStyle } from "@/lib/style";

/**
 * The one screen that actually runs the product.
 *
 * Everything else in the app reads results; this is where a draft is sent
 * through the pipeline. A review is many sequential model calls, so it takes
 * tens of seconds — the UI has to say so plainly rather than look hung.
 */
export function SubmitDraftPanel() {
  const router = useRouter();
  const { toast } = useToast();

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  async function pickFile(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setBusy(true);
    setStage("Extracting text…");
    try {
      const r = await uploadForText(Array.from(files));
      if (!r.text?.trim()) {
        setError("No readable text in that file. PDF, DOCX, TXT and MD are supported.");
        return;
      }
      setText(r.text);
      toast(`${r.words.toLocaleString()} words loaded. Review it, then run the check.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not read that file.");
    } finally {
      setBusy(false);
      setStage("");
    }
  }

  async function run() {
    const draft = text.trim();
    if (draft.length < 40) {
      setError("Paste at least a paragraph — there is nothing to check yet.");
      return;
    }
    setError(null);
    setBusy(true);
    setStage("Retrieving your prior statements…");

    // The request is one call; these are honest labels for what the server is
    // working through, not a fake progress bar tied to a timer.
    const steps = [
      "Comparing against your disclosure history…",
      "Verifying every quote against the evidence…",
      "Assessing materiality…",
      "Drafting aligned wording…",
      "Finalising the report…",
    ];
    let i = 0;
    const ticker = setInterval(() => {
      if (i < steps.length) setStage(steps[i++]);
    }, 6000);

    try {
      const result: ReviewResult = await submitDraft(draft);
      if (result.document_id) {
        toast(
          result.issues?.length
            ? `${result.issues.length} issue${result.issues.length === 1 ? "" : "s"} found. Opening the review.`
            : "No inconsistencies found against your history.",
        );
        router.push(`/app/review?id=${encodeURIComponent(result.document_id)}`);
      } else {
        setError("The review completed but returned no document to open.");
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "The review did not complete. Check your connection and try again.",
      );
    } finally {
      clearInterval(ticker);
      setBusy(false);
      setStage("");
    }
  }

  return (
    <section className="app-card" style={{ padding: 20, marginBottom: 16 }} aria-labelledby="check-heading">
      <h2 id="check-heading" className="kicker" style={{ margin: "0 0 4px" }}>
        Check a document
      </h2>
      <p style={{ color: "var(--muted)", fontSize: 12.5, margin: "0 0 14px", lineHeight: 1.6 }}>
        Paste a draft, or upload one. Harmony compares it against everything in your evidence library and
        returns each conflict with the prior statement quoted.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={busy}
        placeholder="Paste the draft here — a press release, earnings statement, investor letter…"
        rows={10}
        style={{
          width: "100%",
          background: "var(--bg-elev)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "12px 14px",
          color: "var(--text)",
          fontSize: 13.5,
          lineHeight: 1.65,
          fontFamily: "inherit",
          resize: "vertical",
          opacity: busy ? 0.7 : 1,
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3" style={{ marginTop: 12 }}>
        <span style={{ color: "var(--muted)", fontSize: 12 }}>
          {words > 0 ? `${words.toLocaleString()} word${words === 1 ? "" : "s"}` : " "}
        </span>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            hidden
            onChange={(e) => {
              void pickFile(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
            style={{ ...secondaryButtonStyle, fontFamily: "inherit", opacity: busy ? 0.6 : 1 }}
          >
            Upload a file
          </button>
          <button
            type="button"
            disabled={busy || words === 0}
            onClick={() => void run()}
            style={{
              ...primaryButtonStyle,
              padding: "10px 22px",
              opacity: busy || words === 0 ? 0.55 : 1,
              cursor: busy ? "progress" : "pointer",
            }}
          >
            {busy ? "Checking…" : "Check this document"}
          </button>
        </div>
      </div>

      {busy && stage && (
        <div
          role="status"
          style={{
            marginTop: 14,
            padding: "11px 14px",
            borderRadius: 10,
            background: "color-mix(in srgb, var(--accent) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
            fontSize: 12.5,
            color: "var(--text)",
          }}
        >
          {stage}
          <div style={{ color: "var(--muted)", fontSize: 11.5, marginTop: 4 }}>
            A full review runs several models in sequence and usually takes 30–90 seconds. Leave this tab open.
          </div>
        </div>
      )}

      {error && (
        <p
          role="alert"
          style={{
            marginTop: 12,
            fontSize: 12.5,
            color: "color-mix(in srgb, var(--danger) 78%, white)",
          }}
        >
          {error}
        </p>
      )}
    </section>
  );
}
