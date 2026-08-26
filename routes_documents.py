# ============================================================================
# DOCUMENTS + REVIEWS — persistence + audit trail (org-scoped)
# ============================================================================
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from db import engine, User, Document, Review, AuditLog, Membership, HistoryItem
import harmony
from auth import current_user, current_org_id, require_role
from routes_auth import audit

router = APIRouter(prefix="/api", tags=["documents"])


def _user_names(org_id: str) -> dict:
    # user_id -> display name, org ke members ke liye (tables mein "reviewer"/"submitted by" ke liye)
    out = {}
    with Session(engine) as s:
        for m in s.exec(select(Membership).where(Membership.org_id == org_id)).all():
            u = s.get(User, m.user_id)
            if u:
                out[u.id] = u.full_name or u.email
    return out


def _latest_reviews_by_doc(doc_ids: list[str]) -> dict:
    if not doc_ids:
        return {}
    out = {}
    with Session(engine) as s:
        rows = s.exec(select(Review).where(Review.document_id.in_(doc_ids))
                      .order_by(Review.created_at.desc())).all()
    for r in rows:
        out.setdefault(r.document_id, r)   # order_by desc -> pehli entry = latest
    return out


@router.get("/documents")
def list_documents(org_id: str = Depends(current_org_id), user: User = Depends(current_user),
                   status: str | None = None, doc_type: str | None = None):
    with Session(engine) as s:
        q = select(Document).where(Document.org_id == org_id)
        if status:
            q = q.where(Document.status == status)
        if doc_type:
            q = q.where(Document.doc_type == doc_type)
        docs = s.exec(q.order_by(Document.created_at.desc())).all()

    names = _user_names(org_id)
    reviews = _latest_reviews_by_doc([d.id for d in docs])
    out = []
    for d in docs:
        rev = reviews.get(d.id)
        row = d.dict()
        row["submitted_by"] = names.get(d.created_by, "Unknown")
        if rev and rev.decided_by:
            row["reviewer"] = names.get(rev.decided_by, "—")
        elif rev:
            row["reviewer"] = "Awaiting review"
        else:
            row["reviewer"] = "—"   # imported historical document — never went through a review
        row["average_rating"] = rev.average_rating if rev else None
        out.append(row)
    return {"documents": out}


@router.get("/documents/{doc_id}")
def get_document(doc_id: str, org_id: str = Depends(current_org_id), user: User = Depends(current_user)):
    with Session(engine) as s:
        d = s.get(Document, doc_id)
        if not d or d.org_id != org_id:      # org isolation check
            raise HTTPException(404, "Document not found.")
        reviews = s.exec(select(Review).where(Review.document_id == doc_id)
                         .order_by(Review.created_at.desc())).all()

    names = _user_names(org_id)
    doc_row = d.dict()
    doc_row["submitted_by"] = names.get(d.created_by, "Unknown")

    review_rows = []
    for r in reviews:
        row = r.dict()
        try:
            row["issues"] = json.loads(r.issues_json or "[]")
        except (json.JSONDecodeError, TypeError):
            row["issues"] = []
        try:
            row["evidence"] = json.loads(r.evidence_json or "[]")
        except (json.JSONDecodeError, TypeError):
            row["evidence"] = []
        row["submitted_by"] = names.get(r.created_by, "Unknown")
        row["decided_by_name"] = names.get(r.decided_by, "") if r.decided_by else ""
        review_rows.append(row)

    return {"document": doc_row, "reviews": review_rows}


@router.get("/reviews")
def list_reviews(org_id: str = Depends(current_org_id), user: User = Depends(current_user)):
    with Session(engine) as s:
        reviews = s.exec(select(Review).where(Review.org_id == org_id)
                         .order_by(Review.created_at.desc())).all()
    return {"reviews": [r.dict() for r in reviews]}


@router.get("/history")
def list_history(org_id: str = Depends(current_org_id), user: User = Depends(current_user)):
    # Evidence Library ki "saari previous documents" list — har paste/upload/approved-publish
    # jo history mein gaya, chunk count ke saath (asli data, koi placeholder nahi).
    with Session(engine) as s:
        rows = s.exec(select(HistoryItem).where(HistoryItem.org_id == org_id)
                      .order_by(HistoryItem.created_at.desc())).all()
    names = _user_names(org_id)
    out = []
    for h in rows:
        row = h.dict()
        row["added_by_name"] = names.get(h.added_by, "Unknown")
        out.append(row)
    return {"history": out, "total_chunks": sum(h.chunk_count for h in rows)}


@router.get("/audit")
def audit_trail(org_id: str = Depends(current_org_id), user: User = Depends(current_user), limit: int = 100):
    with Session(engine) as s:
        logs = s.exec(select(AuditLog).where(AuditLog.org_id == org_id)
                      .order_by(AuditLog.created_at.desc()).limit(limit)).all()
    names = _user_names(org_id)
    out = []
    for l in logs:
        row = l.dict()
        row["actor_name"] = names.get(l.user_id, "System")
        out.append(row)
    return {"audit": out}


@router.get("/dashboard/stats")
def dashboard_stats(org_id: str = Depends(current_org_id), user: User = Depends(current_user)):
    with Session(engine) as s:
        docs = s.exec(select(Document).where(Document.org_id == org_id)).all()
        reviews = s.exec(select(Review).where(Review.org_id == org_id)).all()
    approved = [r for r in reviews if r.status == "approved"]
    return {
        "documents_reviewed": len(reviews),
        "active_reviews": len([r for r in reviews if r.status == "pending"]),
        "approved": len(approved),
        "approval_rate": round(100 * len(approved) / len(reviews)) if reviews else 0,
        "avg_consistency": round(sum(r.average_rating for r in reviews) / len(reviews), 2) if reviews else 0,
        "documents_total": len(docs),
        "high_risk_open": len([d for d in docs if d.risk == "High" and d.status not in ("Published",)]),
    }


@router.get("/analytics")
def analytics(org_id: str = Depends(current_org_id), user: User = Depends(current_user)):
    with Session(engine) as s:
        docs = s.exec(select(Document).where(Document.org_id == org_id)).all()
        reviews = s.exec(select(Review).where(Review.org_id == org_id)
                         .order_by(Review.created_at.asc())).all()
    names = _user_names(org_id)

    # severity breakdown — from every flagged issue across every review (real, evidence-grounded data)
    sev_counts = {"High": 0, "Medium": 0, "Low": 0}
    total_issues = 0
    issues_per_review: dict = {}
    for r in reviews:
        try:
            issues = json.loads(r.issues_json or "[]")
        except (json.JSONDecodeError, TypeError):
            issues = []
        issues_per_review[r.id] = len(issues)
        total_issues += len(issues)
        for it in issues:
            sev_counts[{"high": "High", "medium": "Medium", "low": "Low"}.get(it.get("severity"), "Low")] += 1

    # document-type breakdown
    type_counts: dict = {}
    for d in docs:
        type_counts[d.doc_type] = type_counts.get(d.doc_type, 0) + 1

    # document RISK breakdown — how many documents currently sit at each risk level
    risk_counts = {"High": 0, "Medium": 0, "Low": 0}
    for d in docs:
        risk_counts[d.risk if d.risk in risk_counts else "Low"] += 1

    # headline totals — the four numbers a customer wants at a glance
    decided = [r for r in reviews if r.status in ("approved", "rejected")]
    approved = [r for r in decided if r.status == "approved"]
    ratings = [r.average_rating for r in reviews if r.average_rating]
    published = sum(1 for d in docs if d.status == "Published")
    totals = {
        "reviews": len(reviews),
        "issues": total_issues,
        # average consistency on a 0-100 scale (ratings are stored 0-10)
        "avg_consistency": round((sum(ratings) / len(ratings)) * 10) if ratings else 0,
        "approval_rate": round(100 * len(approved) / len(decided)) if decided else 0,
        "published": published,
        "avg_issues_per_review": round(total_issues / len(reviews), 1) if reviews else 0,
    }

    # consistency-score trend — most recent 12 reviews, in order, each carrying
    # the issue count so the UI can plot findings alongside the score.
    trend = [{"rating": r.average_rating, "at": str(r.created_at),
              "issues": issues_per_review.get(r.id, 0),
              "company": r.company or ""} for r in reviews[-12:]]

    # review performance — grouped by who decided each review
    perf: dict = {}
    for r in reviews:
        if not r.decided_by or not r.decided_at:
            continue
        bucket = perf.setdefault(r.decided_by, {"decided": 0, "approved": 0, "total_seconds": 0.0})
        bucket["decided"] += 1
        if r.status == "approved":
            bucket["approved"] += 1
        bucket["total_seconds"] += (r.decided_at - r.created_at).total_seconds()
    review_performance = []
    for uid, b in perf.items():
        avg_seconds = b["total_seconds"] / b["decided"] if b["decided"] else 0
        review_performance.append({
            "name": names.get(uid, "Unknown"),
            "avg_minutes": round(avg_seconds / 60, 1),
            "approval_rate": round(100 * b["approved"] / b["decided"]) if b["decided"] else 0,
            "decided": b["decided"],
        })
    review_performance.sort(key=lambda x: -x["decided"])

    return {
        "totals": totals,
        "severity_breakdown": [{"label": k, "count": v} for k, v in sev_counts.items()],
        "type_breakdown": [{"label": k, "count": v} for k, v in sorted(type_counts.items(), key=lambda x: -x[1])],
        "risk_breakdown": [{"label": k, "count": v} for k, v in risk_counts.items()],
        "score_trend": trend,
        "review_performance": review_performance,
    }


# ============================================================================
# DELETING
# ============================================================================
# Admin and above. Both are irreversible and say so; neither is offered to a
# reviewer or editor, because removing the record of what was checked is an
# administrative act rather than part of reviewing.

@router.delete("/documents/{doc_id}")
def delete_document(doc_id: str, org_id: str = Depends(current_org_id),
                    user: User = Depends(require_role("admin"))):
    """Delete a document and every review of it.

    This removes the RECORD of the review. It does not remove anything the
    document contributed to the evidence library when it was approved - that is
    a separate row with its own delete, because the two are separate decisions:
    withdrawing a draft is not the same as retracting the statement it made.
    """
    with Session(engine) as s:
        doc = s.get(Document, doc_id)
        # The org filter IS the access check, not a nicety.
        if not doc or doc.org_id != org_id:
            raise HTTPException(404, "Document not found.")
        title = doc.title
        reviews = s.exec(select(Review).where(Review.document_id == doc_id)).all()
        for r in reviews:
            s.delete(r)
        s.delete(doc)
        s.commit()
        n_reviews = len(reviews)

    audit(org_id, user.id, "document.deleted", f"{title} ({n_reviews} review(s))")
    return {"status": "deleted", "document": title, "reviews_removed": n_reviews}


@router.delete("/history/{item_id}")
def delete_history_item(item_id: str, org_id: str = Depends(current_org_id),
                        user: User = Depends(require_role("admin"))):
    """Remove an evidence document, including its vectors.

    The vectors go FIRST, and the row is only deleted if that succeeded. The
    other order fails badly: a row removed while its chunks survive leaves
    evidence that still steers every future review with nothing in the library
    pointing at it - invisible and unremovable through the UI.

    Rows created before chunks carried a history_id cannot be targeted, so those
    are refused rather than half-deleted.
    """
    with Session(engine) as s:
        item = s.get(HistoryItem, item_id)
        if not item or item.org_id != org_id:
            raise HTTPException(404, "Evidence document not found.")
        label = item.source_file or item.company or "Pasted text"

    before = harmony.count_history_chunks(item_id, org_id)
    if before == 0:
        # Nothing tagged with this id - either legacy, or already cleared.
        raise HTTPException(
            409,
            "This entry was added before evidence could be individually deleted, so its "
            "passages cannot be located. Removing the row would leave them in the search "
            "index permanently. Contact support to have the collection rebuilt.")

    if not harmony.delete_history_chunks(item_id, org_id):
        raise HTTPException(503, "Could not reach the search index. Nothing was deleted.")

    after = harmony.count_history_chunks(item_id, org_id)
    if after > 0:
        raise HTTPException(500, f"{after} passage(s) survived the delete. The entry was kept "
                                 "so it can be retried rather than orphaning them.")

    with Session(engine) as s:
        item = s.get(HistoryItem, item_id)
        if item:
            s.delete(item)
            s.commit()

    audit(org_id, user.id, "history.deleted", f"{label} ({before} passage(s))")
    return {"status": "deleted", "document": label, "passages_removed": before}

