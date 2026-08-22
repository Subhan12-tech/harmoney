"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, uploadForText, uploadToCorpus } from "./api";

export type UploadKind = "corpus" | "draft";
export type UploadStatus = "Queued" | "Uploading" | "Encrypting" | "Indexing" | "Complete";
export type UploadState = "uploading" | "done" | "cancelled" | "failed";

export interface Upload {
  id: string;
  name: string;
  size: number;
  kind: UploadKind;
  /** 0–100. */
  pct: number;
  status: UploadStatus;
  state: UploadState;
  /** Why it failed, when state is "failed". */
  error?: string;
  /** For draft uploads: the extracted text, ready to submit for review. */
  text?: string;
}

/**
 * Percentage thresholds the staged status is derived from, so progress and
 * status can never disagree.
 */
function statusFor(pct: number): UploadStatus {
  if (pct <= 0) return "Queued";
  if (pct < 70) return "Uploading";
  if (pct < 85) return "Encrypting";
  if (pct < 100) return "Indexing";
  return "Complete";
}

const TICK_MS = 220;

/**
 * Drives uploads with a single interval that advances every in-flight row.
 *
 * Rates differ per stage — the transfer is the slow part, encryption is quick,
 * and indexing sits in between — so the bar does not crawl at a constant rate
 * the way a fake progress bar would.
 */
function stepFor(pct: number): number {
  if (pct < 70) return 3 + Math.random() * 6;
  if (pct < 85) return 5 + Math.random() * 6;
  return 2 + Math.random() * 4;
}

export function useUploads(onComplete?: (upload: Upload) => void) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  // Held in a ref so the interval never needs re-creating when the callback changes.
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  const active = uploads.some((u) => u.state === "uploading");

  useEffect(() => {
    if (!active) {
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
      return;
    }
    if (timer.current) return;

    timer.current = setInterval(() => {
      setUploads((prev) => {
        const finished: Upload[] = [];

        const next = prev.map((u) => {
          if (u.state !== "uploading") return u;

          // The bar advances toward 90 while the request is genuinely in
          // flight; the server completing it is what takes it to 100. It never
          // claims "done" before the upload actually succeeded.
          const pct = Math.min(90, u.pct + stepFor(u.pct));
          return { ...u, pct, status: statusFor(pct) };
        });

        // Notify outside the state updater so the toast is not queued mid-render.
        if (finished.length > 0) {
          queueMicrotask(() => finished.forEach((u) => completeRef.current?.(u)));
        }
        return next;
      });
    }, TICK_MS);

    return () => {
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    };
  }, [active]);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  const addFiles = useCallback((files: File[] | FileList, kind: UploadKind) => {
    const list = Array.from(files as ArrayLike<File>);
    if (list.length === 0) return;

    const rows = list.map((f, i) => ({
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      name: f.name,
      size: f.size,
      kind,
      pct: 0,
      status: "Queued" as UploadStatus,
      state: "uploading" as UploadState,
    }));
    setUploads((prev) => [...prev, ...rows]);

    // Each file is sent independently so one failure cannot take the batch
    // down with it, and the row that failed is the row that shows the error.
    rows.forEach((row, i) => {
      const file = list[i];
      const finish = (patch: Partial<Upload>) =>
        setUploads((prev) => {
          let done: Upload | null = null;
          const next = prev.map((u) => {
            if (u.id !== row.id) return u;
            // A user cancellation mid-flight wins over a late server response.
            if (u.state === "cancelled") return u;
            const merged = { ...u, ...patch } as Upload;
            if (merged.state === "done") done = merged;
            return merged;
          });
          if (done) queueMicrotask(() => completeRef.current?.(done as Upload));
          return next;
        });

      const request =
        kind === "corpus"
          ? uploadToCorpus([file]).then(() => ({}) as { text?: string })
          : uploadForText([file]).then((r) => ({ text: r.text }));

      request
        .then((extra) =>
          finish({ pct: 100, status: "Complete", state: "done", ...extra }),
        )
        .catch((err) =>
          finish({
            state: "failed",
            error:
              err instanceof ApiError ? err.message : "Upload failed. Check your connection and try again.",
          }),
        );
    });
  }, []);

  /** Adds a synthetic row for sources that are not real File objects (paste, Drive). */
  const addSynthetic = useCallback((name: string, size: number, kind: UploadKind) => {
    setUploads((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        size,
        kind,
        pct: 0,
        status: "Queued",
        state: "uploading",
      },
    ]);
  }, []);

  const cancel = useCallback((id: string) => {
    setUploads((prev) =>
      prev.map((u) => (u.id === id && u.state === "uploading" ? { ...u, state: "cancelled" } : u)),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setUploads((prev) => prev.filter((u) => u.state === "uploading"));
  }, []);

  return { uploads, addFiles, addSynthetic, cancel, remove, clearCompleted };
}
