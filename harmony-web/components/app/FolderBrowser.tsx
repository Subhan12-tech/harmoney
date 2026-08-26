"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRole } from "@/context/RoleContext";
import { useToast } from "./Toast";
import { Modal } from "./Modal";
import { FolderIcon, FileIcon, PlusIcon, UploadIcon } from "./icons";
import { primaryButtonStyle, secondaryButtonStyle } from "@/lib/style";
import {
  ApiError,
  listFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  moveDocument,
  bulkDeleteDocuments,
  listDocumentsInFolder,
  listAllDocuments,
  uploadToFolder,
  type FolderNode,
  type FolderDoc,
  type DeleteStrategy,
} from "@/lib/api";

/**
 * The workspace file manager: a folder tree on the left, the selected folder's
 * documents on the right, with breadcrumbs above them.
 *
 * The user owns the structure - every folder here was named and placed by a
 * person. This component only ever does what it is told; the AI suggestion layer
 * (a later phase) proposes, it never reorganises on its own.
 */

const ROOT = "__root__"; // sentinel for "Workspace root" in selection/UI only

export function FolderBrowser() {
  const { orgId, isViewer, canManageTeam } = useRole();
  const { toast } = useToast();
  const canEdit = !isViewer;
  const canDelete = canManageTeam; // admin+ — matches the delete endpoint

  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [rootDocCount, setRootDocCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null); // null = root
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [docs, setDocs] = useState<FolderDoc[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set()); // selected doc ids
  const [deletingSel, setDeletingSel] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const lastPicked = useRef<number | null>(null); // anchor row for shift-range select

  // dialogs
  const [createUnder, setCreateUnder] = useState<string | null | undefined>(undefined); // undefined = closed
  const [renameTarget, setRenameTarget] = useState<FolderNode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FolderNode | null>(null);
  const [moveDoc, setMoveDoc] = useState<FolderDoc | null>(null);

  const byId = useMemo(() => Object.fromEntries(folders.map((f) => [f.id, f])), [folders]);
  const childrenOf = useMemo(() => {
    const m: Record<string, FolderNode[]> = {};
    for (const f of folders) {
      const k = f.parent_folder_id ?? ROOT;
      (m[k] ??= []).push(f);
    }
    return m;
  }, [folders]);

  const loadFolders = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listFolders();
      setFolders(r.folders);
      setRootDocCount(r.root_doc_count);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Could not load folders.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadDocs = useCallback(async () => {
    setDocsLoading(true);
    try {
      // The root row shows EVERY document in the workspace, not just unfiled
      // ones - so "All documents" is literally that, and selecting all here
      // reaches documents inside folders too. A specific folder shows only its own.
      const r = selected === null ? await listAllDocuments() : await listDocumentsInFolder(selected);
      setDocs(r.documents);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Could not load documents.");
    } finally {
      setDocsLoading(false);
    }
  }, [selected, toast]);

  useEffect(() => {
    void loadFolders();
  }, [loadFolders, orgId]);
  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);
  // A different folder is a different set of documents — drop any selection so
  // you can never delete a row you can no longer see.
  useEffect(() => {
    setPicked(new Set());
  }, [selected]);

  function togglePick(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setPicked((prev) => (prev.size === docs.length ? new Set() : new Set(docs.map((d) => d.id))));
  }
  // Row click acts like a file manager: plain click toggles, Shift+click selects
  // the range from the last-clicked row. Clicking the Move button or the
  // checkbox itself is handled separately (they stop propagation).
  function onRowSelect(e: React.MouseEvent, index: number, id: string) {
    if (!canDelete) return;
    if (e.shiftKey && lastPicked.current !== null) {
      const [a, b] = [lastPicked.current, index].sort((x, y) => x - y);
      setPicked((prev) => {
        const next = new Set(prev);
        for (let i = a; i <= b; i++) next.add(docs[i].id);
        return next;
      });
    } else {
      togglePick(id);
      lastPicked.current = index;
    }
  }

  // Keyboard: Ctrl/Cmd+A selects all in the open folder, Escape clears — the
  // conventions a file view is expected to honour. (Ctrl+S is the browser's own
  // Save shortcut and cannot be a select gesture, which is what prompted this.)
  useEffect(() => {
    if (!canDelete) return;
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const tag = (t?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || t?.isContentEditable) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        if (docs.length) {
          e.preventDefault();
          setPicked(new Set(docs.map((d) => d.id)));
        }
      } else if (e.key === "Escape" && picked.size) {
        setPicked(new Set());
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canDelete, docs, picked.size]);
  async function doBulkDelete() {
    const ids = docs.filter((d) => picked.has(d.id)).map((d) => d.id);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} document(s)? This also removes their reviews and cannot be undone.`))
      return;
    setDeletingSel(true);
    try {
      const r = await bulkDeleteDocuments(ids);
      setPicked(new Set());
      await loadFolders();
      await loadDocs();
      toast(`${r.deleted} document(s) deleted.`);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Could not delete the selected documents.");
    } finally {
      setDeletingSel(false);
    }
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Breadcrumb: root -> ... -> selected.
  const crumbs = useMemo(() => {
    const chain: FolderNode[] = [];
    let cur = selected;
    const seen = new Set<string>();
    while (cur && byId[cur] && !seen.has(cur)) {
      seen.add(cur);
      chain.push(byId[cur]);
      cur = byId[cur].parent_folder_id;
    }
    chain.reverse();
    return chain;
  }, [selected, byId]);

  const selectedName = selected ? byId[selected]?.name ?? "Folder" : "Workspace";

  /* ---- actions ---- */
  async function doCreate(name: string, parent: string | null) {
    try {
      await createFolder(name, parent);
      setCreateUnder(undefined);
      if (parent) setExpanded((p) => new Set(p).add(parent));
      await loadFolders();
      toast(`Folder "${name}" created.`);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Could not create the folder.");
    }
  }
  async function doRename(f: FolderNode, name: string) {
    try {
      await renameFolder(f.id, name);
      setRenameTarget(null);
      await loadFolders();
      toast("Folder renamed.");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Could not rename the folder.");
    }
  }
  async function doDelete(f: FolderNode, strategy: DeleteStrategy) {
    try {
      const r = await deleteFolder(f.id, strategy);
      setDeleteTarget(null);
      if (selected === f.id) setSelected(f.parent_folder_id);
      await loadFolders();
      await loadDocs();
      toast(
        `Folder deleted. ${r.documents_moved ? `${r.documents_moved} document(s) moved. ` : ""}${
          r.documents_deleted ? `${r.documents_deleted} document(s) deleted.` : ""
        }`.trim(),
      );
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Could not delete the folder.");
    }
  }
  async function doMoveDoc(doc: FolderDoc, folderId: string | null) {
    try {
      await moveDocument(doc.id, folderId);
      setMoveDoc(null);
      await loadFolders();
      await loadDocs();
      toast(`"${doc.title}" moved.`);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Could not move the document.");
    }
  }
  async function doUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      // Uploaded here, the files become EVIDENCE (indexed for future reviews)
      // AND are filed in the selected folder. Root uploads are evidence too,
      // just unfiled.
      const r = await uploadToFolder(Array.from(files), selected);
      await loadFolders();
      await loadDocs();
      const where = selected ? `"${selectedName}"` : "the workspace";
      if (r.added.length) {
        toast(`${r.added.length} file(s) added to ${where} and indexed as evidence.`);
      } else {
        toast(`Nothing added.${r.skipped.length ? ` ${r.skipped.length} skipped.` : ""}`);
      }
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* ---------- LEFT: folder tree ---------- */}
      <aside className="app-card" style={{ padding: 12, alignSelf: "start" }}>
        <div className="flex items-center justify-between" style={{ padding: "2px 4px 10px" }}>
          <span className="kicker" style={{ margin: 0 }}>
            Workspace
          </span>
          {canEdit && (
            <button
              type="button"
              onClick={() => setCreateUnder(null)}
              title="New folder at root"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                color: "var(--text)",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 7,
                padding: "4px 8px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <PlusIcon size={12} /> New
            </button>
          )}
        </div>

        {/* root row — shows the workspace total (every folder + unfiled) */}
        <TreeRow
          label="All documents"
          icon={<FolderIcon size={15} />}
          count={rootDocCount + folders.reduce((sum, f) => sum + f.doc_count, 0)}
          active={selected === null}
          depth={0}
          onClick={() => setSelected(null)}
        />

        {loading ? (
          <div style={{ color: "var(--muted)", fontSize: 12.5, padding: "8px 6px" }}>Loading…</div>
        ) : (
          <TreeLevel
            parent={ROOT}
            childrenOf={childrenOf}
            expanded={expanded}
            selected={selected}
            depth={0}
            onToggle={toggle}
            onSelect={setSelected}
            canEdit={canEdit}
            onNewSub={(id) => setCreateUnder(id)}
            onRename={(f) => setRenameTarget(f)}
            onDelete={(f) => setDeleteTarget(f)}
          />
        )}
        {!loading && folders.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: 12.5, padding: "8px 6px", lineHeight: 1.5 }}>
            No folders yet.{canEdit ? " Create one to start organising." : ""}
          </p>
        )}
      </aside>

      {/* ---------- RIGHT: breadcrumb + documents ---------- */}
      <section style={{ minWidth: 0 }}>
        {/* breadcrumbs */}
        <div className="flex items-center gap-1" style={{ marginBottom: 12, flexWrap: "wrap", fontSize: 13 }}>
          <Crumb label="Workspace" onClick={() => setSelected(null)} active={selected === null} />
          {crumbs.map((f) => (
            <span key={f.id} className="flex items-center gap-1">
              <span style={{ color: "var(--faint)" }}>/</span>
              <Crumb label={f.name} onClick={() => setSelected(f.id)} active={selected === f.id} />
            </span>
          ))}
        </div>

        {/* toolbar */}
        <div className="flex items-center justify-between gap-3" style={{ marginBottom: 12, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: 0 }}>
            {selectedName}
            <span style={{ color: "var(--faint)", fontWeight: 400, fontSize: 13, marginLeft: 8 }}>
              {docs.length} document{docs.length === 1 ? "" : "s"}
            </span>
          </h2>
          {canEdit && (
            <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
              <button
                type="button"
                style={{ ...primaryButtonStyle, display: "inline-flex", alignItems: "center", gap: 6, opacity: uploading ? 0.6 : 1 }}
                disabled={uploading}
                onClick={() => fileInput.current?.click()}
              >
                <UploadIcon size={14} />
                {uploading ? "Uploading…" : "Upload files"}
              </button>
              <button type="button" style={secondaryButtonStyle} disabled={uploading} onClick={() => folderInput.current?.click()}>
                Upload folder
              </button>
              <button type="button" style={secondaryButtonStyle} onClick={() => setCreateUnder(selected)}>
                + New {selected ? "subfolder" : "folder"}
              </button>
            </div>
          )}
        </div>

        {/* what an upload here does */}
        {canEdit && (
          <p style={{ color: "var(--faint)", fontSize: 12, margin: "0 0 12px", lineHeight: 1.5 }}>
            Files you upload here are indexed as <strong>evidence</strong> — every future draft is checked
            against them — and filed in {selected ? `"${selectedName}"` : "the workspace root"}.
          </p>
        )}

        {/* hidden pickers */}
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          accept=".pdf,.docx,.txt,.md,.csv,.html,.png,.jpg,.jpeg,.webp"
          onChange={(e) => {
            void doUpload(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={folderInput}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            void doUpload(e.target.files);
            e.target.value = "";
          }}
          {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
        />

        {/* bulk-action bar — appears only when documents are selected */}
        {canDelete && picked.size > 0 && (
          <div
            className="flex items-center justify-between gap-3 app-fade"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 9,
              padding: "8px 14px",
              marginBottom: 10,
              fontSize: 13,
            }}
          >
            <span style={{ color: "var(--text)" }}>
              {picked.size} selected
              <button
                type="button"
                onClick={() => setPicked(new Set())}
                style={{ marginLeft: 10, background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5 }}
              >
                Clear
              </button>
            </span>
            <button
              type="button"
              onClick={() => void doBulkDelete()}
              disabled={deletingSel}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#fff",
                background: "var(--danger)",
                border: "none",
                borderRadius: 8,
                padding: "7px 14px",
                cursor: deletingSel ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                opacity: deletingSel ? 0.6 : 1,
              }}
            >
              {deletingSel ? "Deleting…" : `Delete ${picked.size} selected`}
            </button>
          </div>
        )}

        {/* document list */}
        <div className="app-card scroll-x" style={{ padding: "6px 20px 4px" }}>
          <table className="app-table">
            <thead>
              <tr>
                {canDelete && (
                  <th scope="col" style={{ width: 34 }}>
                    <input
                      type="checkbox"
                      aria-label="Select all documents"
                      checked={docs.length > 0 && picked.size === docs.length}
                      ref={(el) => {
                        if (el) el.indeterminate = picked.size > 0 && picked.size < docs.length;
                      }}
                      onChange={toggleAll}
                      style={{ accentColor: "var(--accent)", cursor: "pointer" }}
                    />
                  </th>
                )}
                <th scope="col">Document</th>
                <th scope="col">Type</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {docsLoading && (
                <tr>
                  <td colSpan={canDelete ? 5 : 4} style={{ color: "var(--muted)" }}>
                    Loading…
                  </td>
                </tr>
              )}
              {!docsLoading && docs.length === 0 && (
                <tr>
                  <td colSpan={canDelete ? 5 : 4} style={{ color: "var(--muted)" }}>
                    {selected === null
                      ? "No unfiled documents. Everything is organised, or upload something new."
                      : "This folder is empty."}
                  </td>
                </tr>
              )}
              {docs.map((d, i) => (
                <tr
                  key={d.id}
                  onClick={(e) => onRowSelect(e, i, d.id)}
                  style={{
                    background: picked.has(d.id) ? "var(--surface)" : undefined,
                    cursor: canDelete ? "pointer" : undefined,
                    userSelect: canDelete ? "none" : undefined,
                  }}
                >
                  {canDelete && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${d.title}`}
                        checked={picked.has(d.id)}
                        onChange={() => {
                          togglePick(d.id);
                          lastPicked.current = i;
                        }}
                        style={{ accentColor: "var(--accent)", cursor: "pointer" }}
                      />
                    </td>
                  )}
                  <td style={{ color: "var(--text)" }}>
                    <span className="flex items-center gap-2">
                      <FileIcon size={14} />
                      {d.title}
                    </span>
                  </td>
                  <td style={{ color: "var(--muted)" }}>{d.doc_type}</td>
                  <td>
                    <StatusBadge status={d.status} />
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMoveDoc(d);
                        }}
                        style={{
                          fontSize: 12,
                          color: "var(--muted)",
                          background: "none",
                          border: "none",
                          padding: 0,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        Move
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- dialogs ---------- */}
      {createUnder !== undefined && (
        <NameDialog
          title={createUnder ? `New folder in "${byId[createUnder]?.name ?? "folder"}"` : "New folder at workspace root"}
          cta="Create folder"
          onClose={() => setCreateUnder(undefined)}
          onSubmit={(name) => doCreate(name, createUnder)}
        />
      )}
      {renameTarget && (
        <NameDialog
          title="Rename folder"
          cta="Rename"
          initial={renameTarget.name}
          onClose={() => setRenameTarget(null)}
          onSubmit={(name) => doRename(renameTarget, name)}
        />
      )}
      {deleteTarget && (
        <DeleteDialog folder={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={doDelete} />
      )}
      {moveDoc && (
        <MoveDialog
          doc={moveDoc}
          folders={folders}
          onClose={() => setMoveDoc(null)}
          onConfirm={(folderId) => doMoveDoc(moveDoc, folderId)}
        />
      )}
    </div>
  );
}

/* ============================================================
   Tree
   ============================================================ */

function TreeLevel({
  parent,
  childrenOf,
  expanded,
  selected,
  depth,
  onToggle,
  onSelect,
  canEdit,
  onNewSub,
  onRename,
  onDelete,
}: {
  parent: string;
  childrenOf: Record<string, FolderNode[]>;
  expanded: Set<string>;
  selected: string | null;
  depth: number;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  canEdit: boolean;
  onNewSub: (id: string) => void;
  onRename: (f: FolderNode) => void;
  onDelete: (f: FolderNode) => void;
}) {
  const kids = (childrenOf[parent] ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      {kids.map((f) => {
        const hasKids = (childrenOf[f.id]?.length ?? 0) > 0;
        const open = expanded.has(f.id);
        return (
          <div key={f.id}>
            <TreeRow
              label={f.name}
              icon={<FolderIcon size={15} />}
              count={f.doc_count}
              active={selected === f.id}
              depth={depth}
              hasKids={hasKids}
              open={open}
              onToggle={() => onToggle(f.id)}
              onClick={() => onSelect(f.id)}
              menu={
                canEdit ? (
                  <RowMenu
                    onNewSub={() => onNewSub(f.id)}
                    onRename={() => onRename(f)}
                    onDelete={() => onDelete(f)}
                  />
                ) : null
              }
            />
            {open && (
              <TreeLevel
                parent={f.id}
                childrenOf={childrenOf}
                expanded={expanded}
                selected={selected}
                depth={depth + 1}
                onToggle={onToggle}
                onSelect={onSelect}
                canEdit={canEdit}
                onNewSub={onNewSub}
                onRename={onRename}
                onDelete={onDelete}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

function TreeRow({
  label,
  icon,
  count,
  active,
  depth,
  hasKids,
  open,
  onToggle,
  onClick,
  menu,
}: {
  label: string;
  icon: React.ReactNode;
  count?: number;
  active: boolean;
  depth: number;
  hasKids?: boolean;
  open?: boolean;
  onToggle?: () => void;
  onClick: () => void;
  menu?: React.ReactNode;
}) {
  return (
    <div
      className="group flex items-center"
      style={{
        gap: 4,
        paddingLeft: 6 + depth * 14,
        paddingRight: 4,
        borderRadius: 7,
        background: active ? "var(--surface-2)" : "transparent",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={hasKids ? (open ? "Collapse" : "Expand") : undefined}
        style={{
          width: 16,
          height: 22,
          flex: "none",
          background: "none",
          border: "none",
          cursor: hasKids ? "pointer" : "default",
          color: "var(--faint)",
          fontSize: 10,
          transform: open ? "rotate(90deg)" : "none",
          transition: "transform 120ms",
          visibility: hasKids ? "visible" : "hidden",
        }}
      >
        ▶
      </button>
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-2"
        style={{
          flex: 1,
          minWidth: 0,
          background: "none",
          border: "none",
          padding: "5px 2px",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 13,
          color: active ? "var(--text)" : "var(--muted)",
          textAlign: "left",
        }}
      >
        <span style={{ flex: "none", color: "var(--faint)" }}>{icon}</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        {typeof count === "number" && count > 0 && (
          <span style={{ color: "var(--faint)", fontSize: 11, marginLeft: "auto", paddingLeft: 6 }}>{count}</span>
        )}
      </button>
      {menu}
    </div>
  );
}

function RowMenu({
  onNewSub,
  onRename,
  onDelete,
}: {
  onNewSub: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const item: React.CSSProperties = {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "7px 10px",
    fontSize: 12.5,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit",
    color: "var(--text)",
  };
  return (
    <div style={{ position: "relative", flex: "none" }} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Folder actions"
        className="opacity-0 group-hover:opacity-100"
        style={{
          width: 22,
          height: 22,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--muted)",
          fontSize: 15,
          lineHeight: 1,
        }}
      >
        ⋮
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 22,
            zIndex: 20,
            width: 148,
            background: "var(--bg-elev)",
            border: "1px solid var(--border-strong)",
            borderRadius: 8,
            padding: 4,
            boxShadow: "0 10px 28px rgba(0,0,0,0.32)",
          }}
        >
          <button type="button" style={item} onClick={() => { setOpen(false); onNewSub(); }}>
            New subfolder
          </button>
          <button type="button" style={item} onClick={() => { setOpen(false); onRename(); }}>
            Rename
          </button>
          <button
            type="button"
            style={{ ...item, color: "color-mix(in srgb, var(--danger) 82%, var(--text))" }}
            onClick={() => { setOpen(false); onDelete(); }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function Crumb({ label, onClick, active }: { label: string; onClick: () => void; active: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        padding: "2px 4px",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 13,
        color: active ? "var(--text)" : "var(--muted)",
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "Published" || status === "Approved"
      ? "var(--accent-2)"
      : status === "Draft"
        ? "var(--faint)"
        : "var(--warn)";
  return (
    <span
      style={{
        fontSize: 11.5,
        color: "var(--muted)",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: tone }} aria-hidden />
      {status}
    </span>
  );
}

/* ============================================================
   Dialogs
   ============================================================ */

function NameDialog({
  title,
  cta,
  initial = "",
  onClose,
  onSubmit,
}: {
  title: string;
  cta: string;
  initial?: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState(initial);
  return (
    <Modal open onClose={onClose} title={title}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onSubmit(name.trim());
        }}
      >
        <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Folder name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          placeholder="e.g. Finance, Reports, Q4"
          style={{
            width: "100%",
            background: "var(--bg-elev)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "10px 12px",
            color: "var(--text)",
            fontSize: 14,
            fontFamily: "inherit",
          }}
        />
        <div className="flex justify-end gap-2" style={{ marginTop: 18 }}>
          <button type="button" style={secondaryButtonStyle} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" style={{ ...primaryButtonStyle, opacity: name.trim() ? 1 : 0.5 }} disabled={!name.trim()}>
            {cta}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteDialog({
  folder,
  onClose,
  onConfirm,
}: {
  folder: FolderNode;
  onClose: () => void;
  onConfirm: (f: FolderNode, strategy: DeleteStrategy) => void;
}) {
  const hasContents = folder.doc_count > 0 || folder.child_count > 0;
  const [strategy, setStrategy] = useState<DeleteStrategy>("parent");
  const opt: React.CSSProperties = {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    padding: "10px 12px",
    border: "1px solid var(--border)",
    borderRadius: 8,
    marginBottom: 8,
    cursor: "pointer",
    fontSize: 13,
  };
  return (
    <Modal open onClose={onClose} title={`Delete "${folder.name}"?`}>
      {hasContents ? (
        <>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 14px", lineHeight: 1.55 }}>
            This folder contains{folder.child_count ? ` ${folder.child_count} subfolder(s)` : ""}
            {folder.child_count && folder.doc_count ? " and" : ""}
            {folder.doc_count ? ` ${folder.doc_count} document(s)` : ""}. What should happen to them?
          </p>
          {(
            [
              ["parent", "Move contents up to the parent folder", "Nothing is lost — safest."],
              ["root", "Move all documents to the workspace root", "Folders are removed; documents kept."],
              ["all", "Delete everything inside", "Folders and documents are permanently removed."],
            ] as [DeleteStrategy, string, string][]
          ).map(([val, label, note]) => (
            <label key={val} style={{ ...opt, borderColor: strategy === val ? "var(--border-strong)" : "var(--border)" }}>
              <input
                type="radio"
                name="strategy"
                checked={strategy === val}
                onChange={() => setStrategy(val)}
                style={{ marginTop: 2, accentColor: "var(--accent)" }}
              />
              <span>
                <span style={{ color: "var(--text)" }}>{label}</span>
                <span style={{ display: "block", color: "var(--faint)", fontSize: 11.5, marginTop: 1 }}>{note}</span>
              </span>
            </label>
          ))}
        </>
      ) : (
        <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 14px" }}>
          This folder is empty. This cannot be undone.
        </p>
      )}
      <div className="flex justify-end gap-2" style={{ marginTop: 10 }}>
        <button type="button" style={secondaryButtonStyle} onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          style={{ ...primaryButtonStyle, background: "var(--danger)", color: "#fff" }}
          onClick={() => onConfirm(folder, hasContents ? strategy : "parent")}
        >
          Delete folder
        </button>
      </div>
    </Modal>
  );
}

function MoveDialog({
  doc,
  folders,
  onClose,
  onConfirm,
}: {
  doc: FolderDoc;
  folders: FolderNode[];
  onClose: () => void;
  onConfirm: (folderId: string | null) => void;
}) {
  const [dest, setDest] = useState<string | null>(doc.folder_id);
  // Full path label for each folder, so "Reports" under both Finance and HR are distinguishable.
  const byId = Object.fromEntries(folders.map((f) => [f.id, f]));
  function pathOf(id: string): string {
    const parts: string[] = [];
    let cur: string | null = id;
    const seen = new Set<string>();
    while (cur && byId[cur] && !seen.has(cur)) {
      seen.add(cur);
      parts.push(byId[cur].name);
      cur = byId[cur].parent_folder_id;
    }
    return parts.reverse().join(" / ");
  }
  const options = folders.slice().sort((a, b) => pathOf(a.id).localeCompare(pathOf(b.id)));
  return (
    <Modal open onClose={onClose} title={`Move "${doc.title}"`}>
      <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Destination</label>
      <select
        value={dest ?? ROOT}
        onChange={(e) => setDest(e.target.value === ROOT ? null : e.target.value)}
        className="h-select"
        style={{
          width: "100%",
          background: "var(--bg-elev)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "10px 12px",
          color: "var(--text)",
          fontSize: 14,
        }}
      >
        <option value={ROOT}>Workspace root (unfiled)</option>
        {options.map((f) => (
          <option key={f.id} value={f.id}>
            {pathOf(f.id)}
          </option>
        ))}
      </select>
      <div className="flex justify-end gap-2" style={{ marginTop: 18 }}>
        <button type="button" style={secondaryButtonStyle} onClick={onClose}>
          Cancel
        </button>
        <button type="button" style={primaryButtonStyle} onClick={() => onConfirm(dest)}>
          Move
        </button>
      </div>
    </Modal>
  );
}
