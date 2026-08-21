# ============================================================================
# DOCUMENTS + REVIEWS — persistence + audit trail (org-scoped)
# ============================================================================
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from db import engine, User, Document, Review, AuditLog, Membership, HistoryItem
from auth import current_user, current_org_id

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
    for r in reviews:
        try:
            issues = json.loads(r.issues_json or "[]")
        except (json.JSONDecodeError, TypeError):
            issues = []
        for it in issues:
            sev_counts[{"high": "High", "medium": "Medium", "low": "Low"}.get(it.get("severity"), "Low")] += 1

    # document-type breakdown
    type_counts: dict = {}
    for d in docs:
        type_counts[d.doc_type] = type_counts.get(d.doc_type, 0) + 1

    # consistency-score trend — most recent 6 reviews, in order
    trend = [{"rating": r.average_rating, "at": str(r.created_at)} for r in reviews[-6:]]

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
        "severity_breakdown": [{"label": k, "count": v} for k, v in sev_counts.items()],
        "type_breakdown": [{"label": k, "count": v} for k, v in sorted(type_counts.items(), key=lambda x: -x[1])],
        "score_trend": trend,
        "review_performance": review_performance,
    }
