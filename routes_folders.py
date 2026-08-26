# ============================================================================
# FOLDERS — the workspace document tree (org-scoped, permission-checked)
# ----------------------------------------------------------------------------
# The user owns the hierarchy. These endpoints create/rename/move/delete folders
# and move documents between them; nothing here invents or renames a folder on
# the user's behalf (that is the AI suggestion layer, which only ever proposes).
#
# org_id IS the workspace boundary. Every query filters on it and every folder_id
# or document_id arriving from the client is validated to belong to the caller's
# org before it is touched - a raw id from the frontend can never reach another
# workspace's tree. That check lives in _folder_or_404 / _document_or_404 and is
# applied on every path.
# ============================================================================

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from db import engine, User, Document, Review, Folder
from auth import current_user, current_org_id, require_role
from routes_auth import audit

router = APIRouter(prefix="/api", tags=["folders"])


# ---------------------------------------------------------------------------
# helpers — every one is org-scoped
# ---------------------------------------------------------------------------

def _folder_or_404(s: Session, folder_id: str, org_id: str) -> Folder:
    f = s.get(Folder, folder_id)
    if not f or f.org_id != org_id:          # org check IS the access check
        raise HTTPException(404, "Folder not found.")
    return f


def _document_or_404(s: Session, doc_id: str, org_id: str) -> Document:
    d = s.get(Document, doc_id)
    if not d or d.org_id != org_id:
        raise HTTPException(404, "Document not found.")
    return d


def _name_taken(s: Session, org_id: str, parent_id: str | None, name: str,
                exclude_id: str | None = None) -> bool:
    # Uniqueness is scoped to (workspace, parent, name): "Reports" may exist
    # under both Finance and HR, but not twice under the same parent.
    q = select(Folder).where(Folder.org_id == org_id,
                             Folder.parent_folder_id == parent_id)
    for f in s.exec(q).all():
        if f.id != exclude_id and f.name.strip().lower() == name.strip().lower():
            return True
    return False


def _children_map(folders: list[Folder]) -> dict:
    kids: dict = {}
    for f in folders:
        kids.setdefault(f.parent_folder_id, []).append(f)
    return kids


def _descendant_ids(folders: list[Folder], root_id: str) -> set[str]:
    """Every folder id under root_id (exclusive). Used for cycle checks and
    cascade deletes without recursive SQL."""
    kids = _children_map(folders)
    out: set[str] = set()
    stack = [root_id]
    while stack:
        cur = stack.pop()
        for child in kids.get(cur, []):
            if child.id not in out:
                out.add(child.id)
                stack.append(child.id)
    return out


def _breadcrumb(folders: list[Folder], folder_id: str | None) -> list[dict]:
    by_id = {f.id: f for f in folders}
    chain: list[dict] = []
    cur = folder_id
    seen: set[str] = set()
    while cur and cur in by_id and cur not in seen:
        seen.add(cur)
        f = by_id[cur]
        chain.append({"id": f.id, "name": f.name})
        cur = f.parent_folder_id
    chain.reverse()
    return chain


# ---------------------------------------------------------------------------
# read
# ---------------------------------------------------------------------------

@router.get("/folders")
def list_folders(org_id: str = Depends(current_org_id), user: User = Depends(current_user)):
    """The whole tree for this workspace, plus a document count per folder.

    Returns a flat list (the client builds the tree) with each folder's DIRECT
    document count and DIRECT child-folder count, so the sidebar can render
    without N further requests.
    """
    with Session(engine) as s:
        folders = s.exec(select(Folder).where(Folder.org_id == org_id)).all()
        docs = s.exec(select(Document).where(Document.org_id == org_id)).all()

    doc_counts: dict = {}
    for d in docs:
        doc_counts[d.folder_id] = doc_counts.get(d.folder_id, 0) + 1
    child_counts: dict = {}
    for f in folders:
        child_counts[f.parent_folder_id] = child_counts.get(f.parent_folder_id, 0) + 1

    out = [{
        "id": f.id,
        "parent_folder_id": f.parent_folder_id,
        "name": f.name,
        "doc_count": doc_counts.get(f.id, 0),
        "child_count": child_counts.get(f.id, 0),
        "created_at": str(f.created_at),
    } for f in folders]
    # Alphabetical within a parent — a stable, predictable order for a tree.
    out.sort(key=lambda x: x["name"].lower())
    return {"folders": out, "root_doc_count": doc_counts.get(None, 0)}


# ---------------------------------------------------------------------------
# create
# ---------------------------------------------------------------------------

class FolderCreate(BaseModel):
    name: str
    parent_folder_id: str | None = None


@router.post("/folders")
def create_folder(body: FolderCreate, org_id: str = Depends(current_org_id),
                  user: User = Depends(require_role("editor"))):
    name = (body.name or "").strip()
    if not name:
        raise HTTPException(400, "Folder name cannot be empty.")
    if len(name) > 120:
        raise HTTPException(400, "Folder name is too long.")

    with Session(engine) as s:
        if body.parent_folder_id:
            _folder_or_404(s, body.parent_folder_id, org_id)   # parent must be ours
        if _name_taken(s, org_id, body.parent_folder_id, name):
            raise HTTPException(409, f'A folder named "{name}" already exists here.')
        f = Folder(org_id=org_id, parent_folder_id=body.parent_folder_id,
                   name=name, created_by=user.id)
        s.add(f); s.commit(); s.refresh(f)
        result = {"id": f.id, "name": f.name, "parent_folder_id": f.parent_folder_id}
    audit(org_id, user.id, "folder.created", name)
    return result


# ---------------------------------------------------------------------------
# rename / move
# ---------------------------------------------------------------------------

class FolderUpdate(BaseModel):
    name: str | None = None
    # Use the sentinel below to distinguish "move to root" (null) from "unchanged".
    parent_folder_id: str | None = None
    move: bool = False           # set true when parent_folder_id is a deliberate move


@router.patch("/folders/{folder_id}")
def update_folder(folder_id: str, body: FolderUpdate, org_id: str = Depends(current_org_id),
                  user: User = Depends(require_role("editor"))):
    with Session(engine) as s:
        folder = _folder_or_404(s, folder_id, org_id)
        folders = s.exec(select(Folder).where(Folder.org_id == org_id)).all()

        new_parent = folder.parent_folder_id
        if body.move:
            new_parent = body.parent_folder_id
            if new_parent:
                _folder_or_404(s, new_parent, org_id)
                # A folder cannot move into itself or any of its own descendants,
                # which would detach a whole subtree into a cycle.
                if new_parent == folder_id or new_parent in _descendant_ids(folders, folder_id):
                    raise HTTPException(400, "A folder cannot be moved inside itself.")

        new_name = folder.name
        if body.name is not None:
            new_name = body.name.strip()
            if not new_name:
                raise HTTPException(400, "Folder name cannot be empty.")
            if len(new_name) > 120:
                raise HTTPException(400, "Folder name is too long.")

        if _name_taken(s, org_id, new_parent, new_name, exclude_id=folder_id):
            raise HTTPException(409, f'A folder named "{new_name}" already exists in the destination.')

        folder.name = new_name
        folder.parent_folder_id = new_parent
        folder.updated_at = datetime.utcnow()
        s.add(folder); s.commit()
    audit(org_id, user.id, "folder.updated", new_name)
    return {"status": "ok", "id": folder_id, "name": new_name, "parent_folder_id": new_parent}


# ---------------------------------------------------------------------------
# delete — with an explicit strategy for the documents inside
# ---------------------------------------------------------------------------

@router.delete("/folders/{folder_id}")
def delete_folder(folder_id: str, strategy: str = "parent",
                  org_id: str = Depends(current_org_id),
                  user: User = Depends(require_role("editor"))):
    """Delete a folder. `strategy` decides what happens to the documents in it
    and its subtree - the destructive choice is never made silently:

      parent (default) — lift this folder's direct children (subfolders and
                         documents) up to its parent, then delete only this
                         folder. Nothing is lost.
      root             — move every document in the whole subtree to the
                         workspace root, delete this folder and all subfolders.
      all              — delete this folder, all subfolders, and every document
                         within (and their reviews). Fully destructive.
    """
    if strategy not in ("parent", "root", "all"):
        raise HTTPException(400, "Unknown delete strategy.")

    with Session(engine) as s:
        folder = _folder_or_404(s, folder_id, org_id)
        parent_id = folder.parent_folder_id
        folders = s.exec(select(Folder).where(Folder.org_id == org_id)).all()
        descendants = _descendant_ids(folders, folder_id)
        subtree = {folder_id} | descendants
        docs = s.exec(select(Document).where(Document.org_id == org_id)).all()

        moved = deleted = 0
        folders_removed = 0
        if strategy == "parent":
            # Reparent DIRECT children up one level; the rest of the subtree
            # rides along unchanged beneath them. Only THIS folder is removed.
            for f in folders:
                if f.parent_folder_id == folder_id:
                    f.parent_folder_id = parent_id
                    s.add(f)
            for d in docs:
                if d.folder_id == folder_id:
                    d.folder_id = parent_id
                    s.add(d); moved += 1
            s.delete(folder)
            folders_removed = 1
        elif strategy == "root":
            for d in docs:
                if d.folder_id in subtree:
                    d.folder_id = None
                    s.add(d); moved += 1
            for f in folders:
                if f.id in subtree:
                    s.delete(f)
            folders_removed = len(subtree)
        else:  # all
            for d in docs:
                if d.folder_id in subtree:
                    for r in s.exec(select(Review).where(Review.document_id == d.id)).all():
                        s.delete(r)
                    s.delete(d); deleted += 1
            for f in folders:
                if f.id in subtree:
                    s.delete(f)
            folders_removed = len(subtree)
        s.commit()

    audit(org_id, user.id, "folder.deleted", f"{folder.name} (strategy={strategy})")
    return {"status": "deleted", "strategy": strategy,
            "documents_moved": moved, "documents_deleted": deleted,
            "folders_removed": folders_removed}


# ---------------------------------------------------------------------------
# move a document between folders (never duplicates it)
# ---------------------------------------------------------------------------

class DocMove(BaseModel):
    folder_id: str | None = None      # null = workspace root


@router.post("/documents/{doc_id}/move")
def move_document(doc_id: str, body: DocMove, org_id: str = Depends(current_org_id),
                  user: User = Depends(require_role("editor"))):
    """Change a document's folder. This updates the relationship only - the same
    document row moves, nothing is copied, and its status/version is untouched."""
    with Session(engine) as s:
        doc = _document_or_404(s, doc_id, org_id)
        if body.folder_id:
            _folder_or_404(s, body.folder_id, org_id)   # destination must be ours
        doc.folder_id = body.folder_id
        s.add(doc); s.commit()
        title = doc.title
    audit(org_id, user.id, "document.moved", title)
    return {"status": "ok", "document_id": doc_id, "folder_id": body.folder_id}
