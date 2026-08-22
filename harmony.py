# ============================================================================
# HARMONY  —  Disclosure Consistency Copilot   (DEPLOYABLE: pgvector + FastAPI)
# ----------------------------------------------------------------------------
# YE VERSION DEPLOY KE LIYE HAI:
#   - Storage: Postgres + pgvector (persistent, cloud par chalta hai) — FAISS nahi
#   - Dedup: har chunk ka content-hash ID -> same content dobara add ho to UPSERT
#            (duplicate row nahi banti)
#   - Ye file IMPORTABLE hai: app.py (FastAPI) isay import karta hai. Terminal input()
#     sirf CLI (__main__) mein hai; API us se bypass karti hai (run_review + publish).
#
# ASOOL: AI suggest karta hai, publish insaan karta hai. Advisory language.
# ============================================================================

import os
from contextvars import ContextVar
import sys
import re
import uuid
import hashlib
from datetime import date
from types import SimpleNamespace

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from dotenv import load_dotenv
from typing import TypedDict, Annotated, Literal
from pydantic import BaseModel, Field
from langgraph.graph import add_messages
from langchain_mistralai import ChatMistralAI, MistralAIEmbeddings
from langchain_community.document_loaders import PyPDFLoader, TextLoader, CSVLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_qdrant import QdrantVectorStore              # <-- Qdrant (deployable)
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, Filter, FieldCondition, MatchValue

load_dotenv()

# ----------------------------------------------------------------------------
# LangSmith tracing — OFF in production unless someone opts in on purpose.
# ----------------------------------------------------------------------------
# LangChain reads LANGCHAIN_TRACING_V2 straight from the environment; no code
# references it, so it is easy to leave on by accident. When it is on, every
# draft, every retrieved history chunk and every prompt is sent to LangSmith.
# For customers' confidential pre-publication disclosures that makes LangSmith a
# sub-processor they have not agreed to. Default to off, and require an explicit
# HARMONY_ALLOW_TRACING=true to override.
if os.getenv("APP_ENV", "development").strip().lower() == "production":
    if os.getenv("HARMONY_ALLOW_TRACING", "").strip().lower() != "true":
        if os.environ.pop("LANGCHAIN_TRACING_V2", None) not in (None, "", "false"):
            print("LangSmith tracing disabled in production (set HARMONY_ALLOW_TRACING=true to keep it).")
        os.environ["LANGCHAIN_TRACING_V2"] = "false"
        os.environ.pop("LANGSMITH_TRACING", None)

# ----------------------------------------------------------------------------
# VECTOR DB (deployable) — Qdrant Cloud
# ----------------------------------------------------------------------------
# .env mein:
#   QDRANT_URL=https://....cloud.qdrant.io
#   QDRANT_API_KEY=your_qdrant_key   (= ke baad space NAHI)
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = (os.getenv("QDRANT_API_KEY") or "").strip()   # strip: galti se space aaya to hat jaye

if not QDRANT_URL or not QDRANT_API_KEY:
    raise SystemExit(
        "QDRANT_URL / QDRANT_API_KEY not set. Add them to your .env, e.g.:\n"
        "  QDRANT_URL=https://xxxx.cloud.qdrant.io\n"
        "  QDRANT_API_KEY=your_key"
    )

model = ChatMistralAI(model="mistral-small-2503", api_key=os.getenv("MISTRAL_API_KEY"))


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class Finding(BaseModel):
    company: str
    claim: str
    prior_statement: str
    issue_type: str
    severity: Literal["low", "medium", "high"]
    final_summary: str
    rating: float


class Suggestion(BaseModel):
    audience: str
    original_text: str
    suggested_text: str
    sources: list[str]
    final_summary: str
    rating: float


class IssueItem(BaseModel):
    quote: str = Field(description="Exact sentence copied verbatim from the NEW DRAFT that is being flagged.")
    severity: Literal["low", "medium", "high"]
    reason: str = Field(description="Why this claim is inconsistent or unsupported, 1-2 sentences.")
    evidence_index: int = Field(description="0-based index of the evidence chunk below that supports this finding, or -1 if none of them do.")
    evidence_quote: str = Field(description="Exact sentence copied verbatim from that evidence chunk. Empty string if evidence_index is -1.")
    confidence: int = Field(description="0-100 confidence that this is a genuine, material inconsistency.")
    suggestion: str = Field(description="A safer, aligned rewording of the flagged sentence. Advisory only — never invent facts.")


class IssuesList(BaseModel):
    issues: list[IssueItem] = Field(default_factory=list)


# ============================================================================
# SHARED STATE
# ============================================================================

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    ingested_doc_ids: list[str]

    company_name: str
    draft_topic: str
    draft_text: str

    findings: list[Finding]
    suggestions: list[Suggestion]
    issues: list[dict]
    evidence: list[dict]

    consistency_summary: str
    consistency_rating: float

    impact_summary: str
    impact_rating: float

    suggestion_summary: str
    suggestion_rating: float

    final_summary: str
    average_rating: float

    next_agent: str
    retry_count: int
    critic_verdict: Literal["pass", "fail"]
    critique: str
    critic_retries: int
    summary: str

    report_approved: bool
    decision: str


# ============================================================================
# EMBEDDINGS + VECTOR STORE (Qdrant Cloud)
# ============================================================================
embeddings = MistralAIEmbeddings(model="mistral-embed", api_key=os.getenv("MISTRAL_API_KEY"))

# mistral-embed 1024-dimension vectors deta hai -> Qdrant collection isi size par banao
VECTOR_SIZE = 1024
COLLECTION = "harmony_history"   # (multi-tenant: aage har client ke liye alag collection)

# Qdrant client + collection (agar pehle se nahi hai to bana do)
qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
_existing = [c.name for c in qdrant_client.get_collections().collections]
if COLLECTION not in _existing:
    qdrant_client.create_collection(
        collection_name=COLLECTION,
        vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
    )

# Qdrant Cloud REJECTS a filtered search on a field with no payload index (400 Bad Request).
# retrieve_context()/structured_issues_agent() always filter by metadata.org_id for multi-tenant
# isolation, so that index must exist. create_payload_index() is safe to call every startup —
# it no-ops (or raises harmlessly) if the index is already there.
try:
    from qdrant_client.http.models import PayloadSchemaType
    qdrant_client.create_payload_index(
        collection_name=COLLECTION, field_name="metadata.org_id", field_schema=PayloadSchemaType.KEYWORD,
    )
except Exception as _e:
    print("payload index on metadata.org_id: already present or could not be (re)created:", _e)

vector_store = QdrantVectorStore(
    client=qdrant_client,
    collection_name=COLLECTION,
    embedding=embeddings,
)

SPLITTER = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

# multi-tenancy: har org ka data alag rakhne ke liye. run_review() ise set karta hai,
# retrieve/add functions ise metadata filter/tag ke tor par use karte hain.
#
# ContextVar, module-level global NAHI: /api/review sync `def` hai, is liye FastAPI
# use threadpool mein chalata hai -> do orgs ke requests SATH chalte hain. Global hota
# to org B ka set_org() org A ki 30-second pipeline ke beech mein value badal deta aur
# A ki report B ki history quote karti (cross-tenant leak). ContextVar har request
# (aur anyio ke through har threadpool worker) ke liye alag copy rakhta hai.
_CURRENT_ORG: ContextVar[str | None] = ContextVar("harmony_current_org", default=None)


def set_org(org_id):
    _CURRENT_ORG.set(org_id)


def get_org() -> str | None:
    return _CURRENT_ORG.get()


def _hash(text: str) -> str:
    # content ka normalized MD5 (dedup ke liye)
    norm = " ".join(text.lower().split())
    return hashlib.md5(norm.encode("utf-8")).hexdigest()


def _point_id(text: str) -> str:
    # Qdrant point ID sirf int ya UUID hota hai. MD5 (32 hex) = 128 bits = ek valid UUID.
    # KYUN: same content -> same UUID -> Qdrant UPSERT -> duplicate point nahi banta.
    return str(uuid.UUID(hex=_hash(text)))


def _supported(quote: str, context: str) -> bool:
    # fuzzy grounding: quote ke meaningful words ka 60%+ context mein ho to grounded.
    # KYUN: LLM evidence paraphrase karta hai, literal match galat "fail" deta tha.
    words = [w for w in re.findall(r"[a-z0-9$%.]+", quote.lower()) if len(w) > 2]
    if not words:
        return True
    ctx = " ".join(context.lower().split())
    hits = sum(1 for w in words if w in ctx)
    return (hits / len(words)) >= 0.6


def _locate_in_draft(quote: str, draft_text: str) -> list[int] | None:
    # Draft ke andar flagged quote ki position dhoondo (frontend highlight ke liye).
    # KYUN None return karta hai: agar hum confidently locate na kar saken, to us issue ko
    # drop karna behtar hai bajaye ke galat jagah highlight kar dein.
    if not quote:
        return None
    idx = draft_text.find(quote)
    if idx != -1:
        return [idx, idx + len(quote)]
    idx = draft_text.lower().find(quote.lower())
    if idx != -1:
        return [idx, idx + len(quote)]
    sentences = re.split(r"(?<=[.!?])\s+", draft_text)
    q_words = {w for w in re.findall(r"[a-z0-9]+", quote.lower()) if len(w) > 2}
    if not q_words:
        return None
    best_span, best_score, pos = None, 0.0, 0
    for sent in sentences:
        s_words = {w for w in re.findall(r"[a-z0-9]+", sent.lower()) if len(w) > 2}
        if s_words:
            score = len(q_words & s_words) / len(q_words)
            if score > best_score:
                start = draft_text.find(sent, pos)
                if start != -1:
                    best_score, best_span = score, [start, start + len(sent)]
        pos += len(sent)
    return best_span if best_score >= 0.4 else None


def extract_rating(text: str) -> float:
    match = re.search(r"rating[^0-9]{0,20}?([0-9]+(?:\.[0-9]+)?)\s*/\s*10", text, re.IGNORECASE)
    if not match:
        return 0.0
    try:
        return float(match.group(1))
    except ValueError:
        return 0.0


def retrieve_context(query: str, k: int = 6) -> str:
    # semantic search over Qdrant (agar org set hai to sirf usi org ka data)
    flt = None
    _org = get_org()
    if _org:
        flt = Filter(must=[FieldCondition(key="metadata.org_id", match=MatchValue(value=_org))])
    try:
        docs = vector_store.similarity_search(query, k=k, filter=flt)
    except Exception as e:
        print("retrieve error:", e)
        return "No relevant past statements found."
    if not docs:
        return "No relevant past statements found."
    return "\n\n".join(doc.page_content for doc in docs)


def add_documents_to_store(chunks: list[Document]):
    # KYA: chunks ko Qdrant mein daalo, ID = content ka UUID.
    # KYUN (dedup): same content -> same UUID -> Qdrant UPSERT karta hai, duplicate point nahi.
    if not chunks:
        return
    # har chunk par org_id tag karo (multi-tenant isolation)
    for c in chunks:
        c.metadata["org_id"] = get_org() or "default"
    # ID = content + org ka hash (taake do orgs ka same text alag rahe)
    ids = [_point_id((get_org() or "default") + "::" + c.page_content) for c in chunks]
    vector_store.add_documents(chunks, ids=ids)
    print(f"Upserted {len(chunks)} chunk(s) (duplicates auto-skipped by content ID).")


def read_path_as_text(path: str) -> str:
    supported = (".pdf", ".txt", ".json", ".csv")
    all_files = []
    if os.path.isdir(path):
        for file in os.listdir(path):
            if file.endswith(supported):
                all_files.append(os.path.join(path, file))
    else:
        all_files.append(path)

    texts = []
    for file in all_files:
        if file.endswith(".pdf"):
            loader = PyPDFLoader(file)
        elif file.endswith(".csv"):
            loader = CSVLoader(file)
        else:
            loader = TextLoader(file, encoding="utf-8")
        for d in loader.load():
            texts.append(d.page_content)
    return "\n\n".join(texts)


def add_to_history(text: str, company: str = "Unknown", doc_type: str = "approved", source_file: str | None = None) -> int:
    # approved draft (ya koi statement) ko history mein daalta hai (dedup ke saath). Chunk count
    # return karta hai taake caller ek HistoryItem record bana sake (Evidence Library listing ke liye).
    metadata = {"company": company, "date": str(date.today()), "doc_type": doc_type}
    if source_file:
        metadata["source_file"] = source_file
    doc = Document(page_content=text, metadata=metadata)
    chunks = SPLITTER.split_documents([doc])
    add_documents_to_store(chunks)
    return len(chunks)


def load_store() -> int:
    # Qdrant hamesha connected hai (persistent). Ye stub eval-compatibility ke liye hai.
    return 0


# ============================================================================
# NODE 1 — INGESTION AGENT
# ============================================================================

def ingestion_agent(state: AgentState):
    msg = state["messages"][-1]
    content = msg.content if hasattr(msg, "content") else msg["content"]
    path = content.split()[0]

    supported = (".pdf", ".txt", ".json", ".csv")
    all_files = []
    if os.path.isdir(path):
        for file in os.listdir(path):
            if file.endswith(supported):
                all_files.append(os.path.join(path, file))
    else:
        all_files.append(path)

    doc_ids = []
    total_chunks = 0
    for file in all_files:
        if file.endswith(".pdf"):
            loader = PyPDFLoader(file)
        elif file.endswith(".csv"):
            loader = CSVLoader(file)
        else:
            loader = TextLoader(file, encoding="utf-8")

        docs = loader.load()
        for d in docs:
            d.metadata["doc_type"] = "history"
            d.metadata["source_file"] = os.path.basename(file)
        chunks = SPLITTER.split_documents(docs)
        add_documents_to_store(chunks)

        for i in range(len(chunks)):
            doc_ids.append(f"{file}_chunk_{i}")
        total_chunks += len(chunks)

    confirmation = f"Ingested {total_chunks} chunks from {len(all_files)} file(s) into the history database."
    return {
        "ingested_doc_ids": doc_ids,
        "messages": [{"role": "assistant", "content": confirmation}],
    }


# ============================================================================
# NODE 2 — DRAFT SETUP AGENT
# ============================================================================

def draft_setup_agent(state: AgentState):
    if state.get("report_approved", False):
        return {
            "next_agent": "supervisor",
            "messages": [{"role": "assistant", "content": "Report already approved. Skipping setup."}],
        }

    user_input = state["messages"][-1].content

    prompt = f"""
You are a Disclosure Review Assistant.

Below is a DRAFT that a company wants to publish.

{user_input}

Extract ONLY the following information.

1. Company Name
2. Draft Topic (e.g. earnings, product launch, guidance)
3. Audience (e.g. investors, clients, public)

If any field is missing return "Unknown".

Return your answer in this exact format.

Company Name:
...

Draft Topic:
...

Audience:
...
"""
    response = model.invoke(prompt)

    company_name = "Unknown"
    draft_topic = "Unknown"
    audience = "Unknown"
    for line in response.content.split("\n"):
        if line.lower().startswith("company name"):
            company_name = line.split(":", 1)[1].strip()
        elif line.lower().startswith("draft topic"):
            draft_topic = line.split(":", 1)[1].strip()
        elif line.lower().startswith("audience"):
            audience = line.split(":", 1)[1].strip()

    return {
        "company_name": company_name,
        "draft_topic": draft_topic,
        "draft_text": user_input,
        "next_agent": "supervisor",
        "messages": [{"role": "assistant", "content": "Draft information extracted."}],
    }


# ============================================================================
# NODE 3 — SUPERVISOR AGENT
# ============================================================================

def supervisor_agent(state: AgentState) -> dict:
    if state.get("report_approved", False):
        return {"next_agent": "qa", "messages": [{"role": "assistant", "content": "Supervisor routing to qa"}]}
    if state.get("retry_count", 0) >= 2:
        return {"next_agent": "FINISH"}
    return {
        "next_agent": "consistency_check",
        "messages": [{"role": "assistant", "content": "Supervisor routing to consistency_check"}],
    }


# ============================================================================
# NODE 4 — CONSISTENCY CHECK AGENT
# ============================================================================

def consistency_check_agent(state: AgentState) -> dict:
    draft_text = state["draft_text"]
    context = retrieve_context(draft_text, k=6)

    prompt = f"""
You are a Senior Disclosure & Investor Relations Analyst.

Company:
{state["company_name"]}

Company's PAST statements (retrieved evidence — THIS IS YOUR ONLY SOURCE OF TRUTH):

{context}

NEW DRAFT to be published:

{draft_text}

Rules (very important):
- Compare each factual claim in the draft (numbers, dates, guidance, product status)
  ONLY against the PAST statements above.
- For EVERY inconsistency you list, include an "Evidence:" line that quotes the
  EXACT sentence from the PAST statements (copy it word-for-word inside quotes).
- If you cannot find a supporting sentence in the PAST statements, DO NOT list that item.
- Do NOT invent quotes or facts. Use soft language ("may differ from"), never "fraud".
- If everything is consistent, say so clearly.

Return your answer in exactly this format.

Inconsistencies:
- Issue: ...
  Severity: low / medium / high
  Evidence: "exact sentence copied from the past statements"
  Why: ...

Summary:
...

Rating:
... / 10   (10 = perfectly consistent)
"""
    response = model.invoke(prompt)

    print("\n========== CONSISTENCY CHECK ==========")
    print(response.content)
    print("=======================================\n")

    rating = extract_rating(response.content)
    summary = response.content
    for line in response.content.split("\n"):
        if line.lower().startswith("summary"):
            summary = line.split(":", 1)[1].strip()

    finding = Finding(
        company=state["company_name"], claim=draft_text[:200], prior_statement=context[:200],
        issue_type="see summary", severity="medium", final_summary=summary, rating=rating,
    )
    return {
        "findings": [finding],
        "consistency_summary": summary,
        "consistency_rating": rating,
        "next_agent": "critic",
        "messages": [{"role": "assistant", "content": response.content}],
    }


# ============================================================================
# NODE 5 — CRITIC AGENT (faithfulness gate)
# ============================================================================

def critic_agent(state: AgentState) -> dict:
    consistency_text = state["messages"][-1].content
    draft_text = state["draft_text"]
    evidence_pool = retrieve_context(draft_text, k=8)

    # sirf "Evidence:" lines wale quotes verify karo (draft ke quotes nahi)
    evidence_quotes = []
    for line in consistency_text.split("\n"):
        if "evidence:" in line.lower():
            for q in re.findall(r'"([^"]{10,})"', line):
                evidence_quotes.append(q)

    verified = 0
    unverified = 0
    for q in evidence_quotes:
        nq = " ".join(q.lower().split())
        if "none" in nq and "statement" in nq:
            continue
        if _supported(q, evidence_pool):
            verified += 1
        else:
            unverified += 1

    checked = verified + unverified
    grounding = (verified / checked) if checked else 1.0

    prompt = f"""
You are a grounding auditor. You are given the company's PAST STATEMENTS (context)
and a REVIEW REPORT that compares a NEW DRAFT against those statements.

IMPORTANT:
- The report will mention the DRAFT's claims. The draft is NOT part of the context.
  That is EXPECTED and is NOT a problem.
- Your ONLY job: check that the EVIDENCE the report attributes to the PAST STATEMENTS
  actually appears in the context below.
- If those evidence quotes are supported by the context, the report PASSES.
- Only FAIL if the report cites "evidence" from past statements that does NOT exist.

PAST STATEMENTS (context):
{evidence_pool}

REVIEW REPORT:
{consistency_text}

Return your answer in exactly this format.

Verdict: PASS or FAIL
Reason: ...
Score: ... / 10
"""
    response = model.invoke(prompt)
    verdict_text = response.content

    llm_fail = False
    for line in verdict_text.split("\n"):
        if line.lower().strip().startswith("verdict"):
            llm_fail = "fail" in line.lower()
            break

    code_fail = (checked >= 2 and grounding < 0.5)
    fail = llm_fail or code_fail

    print("\n========== CRITIC (faithfulness) ==========")
    print(f"Evidence quotes checked: {checked}  |  verified: {verified}  |  grounding: {round(grounding, 2)}")
    print(verdict_text)
    print("===========================================\n")

    crit_retries = state.get("critic_retries", 0)
    if (not fail) or crit_retries >= 2:
        return {
            "critic_verdict": "pass", "critique": verdict_text, "next_agent": "impact_check",
            "messages": [{"role": "assistant", "content": "Critic: grounding check passed."}],
        }
    return {
        "critic_verdict": "fail", "critique": verdict_text, "critic_retries": crit_retries + 1,
        "next_agent": "supervisor",
        "messages": [{"role": "assistant", "content": "Critic: evidence not fully grounded. Re-checking."}],
    }


# ============================================================================
# NODE 6 — IMPACT CHECK AGENT
# ============================================================================

def impact_check_agent(state: AgentState) -> dict:
    consistency_summary = state["consistency_summary"]
    context = retrieve_context(consistency_summary, k=6)

    prompt = f"""
You are a Senior Corporate Compliance Advisor.

Company:
{state["company_name"]}

Relevant past context:

{context}

Below is the consistency review summary.

{consistency_summary}

Assess

1. Disclosure Risk if the draft is published as-is (low / medium / high) and WHY.
2. Which specific inconsistency is the most important to fix first.
3. A short Impact Summary.
4. Overall Rating out of 10 (10 = very low risk).

Reminder: you are advising a human reviewer. You are NOT making legal conclusions.

Return your answer in exactly this format.

Risk:
...

Summary:
...

Rating:
...
"""
    response = model.invoke(prompt)

    print("\n========== IMPACT CHECK ==========")
    print(response.content)
    print("==================================\n")

    rating = extract_rating(response.content)
    summary = response.content
    for line in response.content.split("\n"):
        if line.lower().startswith("summary"):
            summary = line.split(":", 1)[1].strip()

    return {
        "impact_summary": summary, "impact_rating": rating, "next_agent": "suggestion",
        "messages": [{"role": "assistant", "content": response.content}],
    }


# ============================================================================
# NODE 7 — SUGGESTION AGENT
# ============================================================================

def suggestion_agent(state: AgentState) -> dict:
    consistency_summary = state["consistency_summary"]
    impact_summary = state["impact_summary"]
    context = retrieve_context(consistency_summary + " " + impact_summary, k=6)

    prompt = f"""
You are a Senior Investor Relations Editor.

Company:
{state["company_name"]}

Relevant past statements:

{context}

Consistency issues:

{consistency_summary}

Impact assessment:

{impact_summary}

For each important issue, SUGGEST (do not apply) a safer or clearer wording that
aligns with the company's past statements. Cite which past statement it aligns to.
Keep it advisory. Never invent facts. Never auto-publish.

Return your answer in exactly this format.

Suggestions:
...

Summary:
...

Rating:
...
"""
    response = model.invoke(prompt)

    print("\n========== SUGGESTIONS ==========")
    print(response.content)
    print("=================================\n")

    rating = extract_rating(response.content)
    summary = response.content
    for line in response.content.split("\n"):
        if line.lower().startswith("summary"):
            summary = line.split(":", 1)[1].strip()

    suggestion = Suggestion(
        audience=state["draft_topic"], original_text=state["draft_text"][:200],
        suggested_text=summary, sources=state.get("ingested_doc_ids", [])[:3],
        final_summary=summary, rating=rating,
    )
    return {
        "suggestions": [suggestion], "suggestion_summary": summary, "suggestion_rating": rating,
        "next_agent": "final_review",
        "messages": [{"role": "assistant", "content": response.content}],
    }


# ============================================================================
# NODE 7B — STRUCTURED ISSUES AGENT (evidence-grounded, per-sentence findings)
# ----------------------------------------------------------------------------
# Review Workspace UI ko per-sentence clickable evidence chahiye (severity, exact
# evidence quote, source, confidence, suggestion). Ye node wahi structured, VERIFIED
# data banata hai — koi bhi issue jiski evidence-quote us evidence chunk mein literally
# na mile, ya jiska draft-quote draft mein locate na ho, drop kar diya jata hai.
# ============================================================================

def structured_issues_agent(state: AgentState) -> dict:
    draft_text = state["draft_text"]

    flt = None
    _org = get_org()
    if _org:
        flt = Filter(must=[FieldCondition(key="metadata.org_id", match=MatchValue(value=_org))])
    try:
        docs = vector_store.similarity_search(draft_text, k=8, filter=flt)
    except Exception as e:
        print("structured issues: evidence retrieval error:", e)
        docs = []

    evidence_list = [{
        "content": d.page_content,
        "company": d.metadata.get("company") or "Unknown",
        "date": d.metadata.get("date") or "—",
        "source": d.metadata.get("source_file") or d.metadata.get("company") or "Unknown source",
        "doc_type": (d.metadata.get("doc_type") or "history").replace("_", " ").title(),
    } for d in docs]

    if not docs:
        return {"issues": [], "evidence": [], "messages": [{"role": "assistant", "content": "No history yet — no evidence-grounded issues to flag."}]}

    evidence_block = "\n\n".join(
        f'[{i}] (source: {d.metadata.get("source_file") or d.metadata.get("company", "Unknown")}, '
        f'date: {d.metadata.get("date", "Unknown")}, type: {d.metadata.get("doc_type", "history")})\n{d.page_content}'
        for i, d in enumerate(docs)
    )

    prompt = f"""
You are a Senior Disclosure Analyst identifying specific inconsistent sentences in a NEW DRAFT.

Company:
{state["company_name"]}

Context — consistency review already done on this draft:
{state.get("consistency_summary", "")}

Context — impact assessment already done on this draft:
{state.get("impact_summary", "")}

Numbered PAST-STATEMENT evidence chunks (your ONLY source of truth):
{evidence_block}

NEW DRAFT:
{draft_text}

For each sentence in the DRAFT that conflicts with, changes without explanation, or cannot be
supported by the evidence chunks above, produce one issue with:
- quote: copied EXACTLY (verbatim, word-for-word) from the DRAFT above.
- evidence_index: the number of the evidence chunk that supports this finding.
- evidence_quote: copied EXACTLY (verbatim) from that evidence chunk's text — never invent it.
- severity, confidence, a short reason, and one advisory rewording suggestion.

Rules:
- If you cannot find a supporting sentence in the evidence chunks, do not report that item.
- Never invent or paraphrase a quote — copy it exactly, or don't use it.
- Only flag genuinely material issues (numbers, dates, guidance, claims, terminology changes).
- If the draft is fully consistent with the evidence, return an empty issues list.
"""
    structured_model = model.with_structured_output(IssuesList)
    try:
        result: IssuesList = structured_model.invoke(prompt)
    except Exception as e:
        print("structured issues: model error:", e)
        return {"issues": [], "messages": [{"role": "assistant", "content": f"Structured issue extraction failed: {e}"}]}

    verified = []
    for it in result.issues:
        if not (0 <= it.evidence_index < len(docs)):
            continue
        ev_doc = docs[it.evidence_index]
        if not _supported(it.evidence_quote, ev_doc.page_content):
            continue
        span = _locate_in_draft(it.quote, draft_text)
        if span is None:
            continue
        verified.append({
            "quote": it.quote,
            "span": span,
            "severity": it.severity,
            "reason": it.reason,
            "evidence_doc": ev_doc.metadata.get("source_file") or ev_doc.metadata.get("company", "Unknown source"),
            "evidence_date": ev_doc.metadata.get("date", "—"),
            "evidence_source": (ev_doc.metadata.get("doc_type") or "history").replace("_", " ").title(),
            "evidence_quote": it.evidence_quote,
            "confidence": max(0, min(100, int(it.confidence))),
            "suggestion": it.suggestion,
        })

    print(f"\n========== STRUCTURED ISSUES ==========\n{len(verified)}/{len(result.issues)} issues passed grounding verification\n========================================\n")

    return {"issues": verified, "evidence": evidence_list,
            "messages": [{"role": "assistant", "content": f"Identified {len(verified)} evidence-grounded issue(s)."}]}


# ============================================================================
# NODE 8 — FINAL REVIEW AGENT
# ============================================================================

def _final_review_prompt(state: AgentState) -> tuple[str, float]:
    consistency_summary = state["consistency_summary"]
    impact_summary = state["impact_summary"]
    suggestion_summary = state["suggestion_summary"]
    consistency_rating = state["consistency_rating"]
    impact_rating = state["impact_rating"]
    suggestion_rating = state["suggestion_rating"]
    average_rating = round((consistency_rating + impact_rating + suggestion_rating) / 3, 2)

    prompt = f"""
You are a Senior Disclosure Review Director.

Company:
{state["company_name"]}

==================================================
CONSISTENCY SUMMARY

{consistency_summary}

Rating: {consistency_rating}/10

IMPACT SUMMARY

{impact_summary}

Rating: {impact_rating}/10

SUGGESTIONS SUMMARY

{suggestion_summary}

Rating: {suggestion_rating}/10

Average Rating: {average_rating}/10
==================================================

Prepare ONE FINAL CONSISTENCY REVIEW REPORT for a human reviewer.

Include
1. Executive Summary
2. Possible Inconsistencies (with severity)
3. Disclosure Risk
4. Suggested Wording Changes (advisory only)
5. Final Recommendation for the human reviewer

Keep it professional and advisory. Do NOT publish anything.
"""
    return prompt, average_rating


def final_review_agent(state: AgentState) -> dict:
    prompt, average_rating = _final_review_prompt(state)
    response = model.invoke(prompt)

    print("\n========== FINAL CONSISTENCY REPORT ==========")
    print(response.content)
    print(f"\nAverage Rating : {average_rating}/10")
    print("==============================================\n")

    return {
        "final_summary": response.content, "average_rating": average_rating,
        "summary": response.content, "next_agent": "human_review",
        "messages": [{"role": "assistant", "content": response.content}],
    }


def final_review_agent_stream(state: AgentState):
    # Report ke tokens live stream karta hai (frontend mein "typing" effect ke liye), phir
    # aakhir mein state-update dict yield karta hai — bilkul final_review_agent jaisa result.
    prompt, average_rating = _final_review_prompt(state)
    full_text = ""
    for chunk in model.stream(prompt):
        piece = chunk.content or ""
        if piece:
            full_text += piece
            yield piece

    print("\n========== FINAL CONSISTENCY REPORT (streamed) ==========")
    print(full_text)
    print(f"\nAverage Rating : {average_rating}/10")
    print("==========================================================\n")

    yield {
        "final_summary": full_text, "average_rating": average_rating,
        "summary": full_text, "next_agent": "human_review",
        "messages": [{"role": "assistant", "content": full_text}],
    }


# ============================================================================
# NODE 9 — HUMAN REVIEW (sirf CLI ke liye; API isay bypass karti hai)
# ============================================================================

def human_review(state: AgentState):
    print("\n========== CONSISTENCY REVIEW REPORT (for approval) ==========\n")
    print(state["final_summary"])
    print(f"\nAverage Rating : {state['average_rating']}/10\n")

    decision = input("Approve this review report? (yes/no): ").strip().lower()
    if decision == "yes":
        return {
            "report_approved": True, "next_agent": "publish",
            "messages": [{"role": "assistant", "content": "Approved. Preparing aligned version and saving to history."}],
        }
    return {
        "retry_count": state.get("retry_count", 0) + 1, "next_agent": "supervisor",
        "messages": [{"role": "assistant", "content": "Rejected. Sending back for another pass."}],
    }


# ============================================================================
# NODE 10 — PUBLISH AGENT (approved version + wapas history mein)
# ============================================================================

def publish_agent(state: AgentState):
    prompt = f"""
You are a Corporate Communications Editor.

The human reviewer has APPROVED the consistency review below.

Company:
{state["company_name"]}

Approved review report:

{state["final_summary"]}

Now produce the FINAL, consistency-aligned version of the announcement for the
human to publish themselves.

Write
1. Title
2. Final aligned announcement text
3. A one-line note of what was changed and why

Do not mention AI. Keep it professional. The human publishes this, not you.
"""
    response = model.invoke(prompt)

    note = ""
    chunks_added = 0
    try:
        chunks_added = add_to_history(response.content, company=state.get("company_name", "Unknown"), doc_type="approved")
        note = "\n\n[Saved to the history database for future comparisons.]"
    except Exception as e:
        note = f"\n\n[Could not save to history: {e}]"

    return {"messages": [{"role": "assistant", "content": response.content + note}], "chunks_added": chunks_added}


# ============================================================================
# NODE 11 — QA AGENT
# ============================================================================

def qa_agent(state: AgentState) -> dict:
    user_question = state["messages"][-1].content
    context = retrieve_context(user_question, k=8)

    prompt = f"""
You are a Disclosure Review Assistant answering questions about the company's
PAST STATEMENTS and the approved report.

Company:
{state["company_name"]}

Retrieved PAST STATEMENTS:

{context}

Approved review report (may or may not be relevant):

{state.get("final_summary", "")}

User Question:

{user_question}

Answer using the PAST STATEMENTS and the report above. Quote the relevant fact when possible.
Only say "Not found in the documents." if the answer truly does NOT appear.
"""
    response = model.invoke(prompt)
    return {"messages": [{"role": "assistant", "content": response.content}]}


# ============================================================================
# ROUTER + GRAPH (CLI ke liye; MemorySaver — koi extra DB nahi)
# ============================================================================

def route(state: AgentState):
    return state.get("next_agent", "FINISH")


from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

graph = StateGraph(AgentState)
graph.add_node("draft_setup", draft_setup_agent)
graph.add_node("supervisor", supervisor_agent)
graph.add_node("consistency_check", consistency_check_agent)
graph.add_node("critic", critic_agent)
graph.add_node("impact_check", impact_check_agent)
graph.add_node("suggestion", suggestion_agent)
graph.add_node("final_review", final_review_agent)
graph.add_node("human_review", human_review)
graph.add_node("publish", publish_agent)
graph.add_node("qa", qa_agent)

graph.add_edge(START, "draft_setup")
graph.add_conditional_edges("draft_setup", route, {"supervisor": "supervisor"})
graph.add_conditional_edges("supervisor", route, {
    "consistency_check": "consistency_check", "qa": "qa", "FINISH": END,
})
graph.add_conditional_edges("consistency_check", route, {"critic": "critic"})
graph.add_conditional_edges("critic", route, {"impact_check": "impact_check", "supervisor": "supervisor"})
graph.add_conditional_edges("impact_check", route, {"suggestion": "suggestion"})
graph.add_conditional_edges("suggestion", route, {"final_review": "final_review"})
graph.add_conditional_edges("final_review", route, {"human_review": "human_review"})
graph.add_conditional_edges("human_review", route, {"publish": "publish", "supervisor": "supervisor"})
graph.add_edge("publish", END)
graph.add_edge("qa", END)

checkpointer = MemorySaver()
workflow = graph.compile(checkpointer=checkpointer)


# ============================================================================
# run_review() + publish_review()  —  API/eval ke liye (human-input ke baghair)
# ============================================================================

def _apply(state: dict, update: dict) -> dict:
    for k, v in update.items():
        if k == "messages":
            for m in v:
                content = m["content"] if isinstance(m, dict) else getattr(m, "content", str(m))
                state["messages"].append(SimpleNamespace(role="assistant", content=content))
        else:
            state[k] = v
    return state


def run_review(draft_text: str, org_id: str | None = None) -> dict:
    set_org(org_id)
    state = {
        "messages": [SimpleNamespace(role="user", content=draft_text)],
        "draft_text": draft_text, "retry_count": 0, "critic_retries": 0, "report_approved": False,
    }
    state = _apply(state, draft_setup_agent(state))
    state = _apply(state, consistency_check_agent(state))
    state = _apply(state, critic_agent(state))
    state = _apply(state, impact_check_agent(state))
    state = _apply(state, suggestion_agent(state))
    state = _apply(state, structured_issues_agent(state))
    state = _apply(state, final_review_agent(state))
    return {
        "draft_text": draft_text,
        "company": state.get("company_name", ""),
        "draft_topic": state.get("draft_topic", ""),
        "consistency_summary": state.get("consistency_summary", ""),
        "consistency_rating": state.get("consistency_rating", 0.0),
        "final_summary": state.get("final_summary", ""),
        "average_rating": state.get("average_rating", 0.0),
        "critic_verdict": state.get("critic_verdict", "pass"),
        "issues": state.get("issues", []),
        "evidence": state.get("evidence", []),
    }


def run_review_stream(draft_text: str, org_id: str | None = None):
    # run_review() jaisa hi pipeline, lekin har step ke baad ek progress event yield karta
    # hai, aur final report ke tokens live stream karta hai — API isay SSE ke zariye
    # frontend tak pahunchati hai taake user ko real-time pata chale AI kya kar raha hai.
    set_org(org_id)
    state = {
        "messages": [SimpleNamespace(role="user", content=draft_text)],
        "draft_text": draft_text, "retry_count": 0, "critic_retries": 0, "report_approved": False,
    }

    yield {"type": "step", "label": "Reading your document"}
    state = _apply(state, draft_setup_agent(state))

    yield {"type": "step", "label": "Comparing to your past documents"}
    state = _apply(state, consistency_check_agent(state))

    yield {"type": "step", "label": "Double-checking the evidence"}
    state = _apply(state, critic_agent(state))

    yield {"type": "step", "label": "Assessing risk"}
    state = _apply(state, impact_check_agent(state))

    yield {"type": "step", "label": "Writing suggestions"}
    state = _apply(state, suggestion_agent(state))

    yield {"type": "step", "label": "Finding the specific issues"}
    state = _apply(state, structured_issues_agent(state))

    yield {"type": "step", "label": "Writing the final report"}
    for piece in final_review_agent_stream(state):
        if isinstance(piece, str):
            yield {"type": "token", "text": piece}
        else:
            state = _apply(state, piece)

    yield {"type": "done", "result": {
        "draft_text": draft_text,
        "company": state.get("company_name", ""),
        "draft_topic": state.get("draft_topic", ""),
        "consistency_summary": state.get("consistency_summary", ""),
        "consistency_rating": state.get("consistency_rating", 0.0),
        "final_summary": state.get("final_summary", ""),
        "average_rating": state.get("average_rating", 0.0),
        "critic_verdict": state.get("critic_verdict", "pass"),
        "issues": state.get("issues", []),
        "evidence": state.get("evidence", []),
    }}


def publish_review(result: dict, org_id: str | None = None) -> dict:
    # approved review -> final aligned version + history mein save. (API approve par call hota hai)
    set_org(org_id)
    state = {"company_name": result.get("company", "Unknown"), "final_summary": result.get("final_summary", "")}
    out = publish_agent(state)
    return {"final_version": out["messages"][-1]["content"], "chunks_added": out.get("chunks_added", 0)}


# ============================================================================
# MAIN (optional CLI — API ke liye app.py use karein)
# ============================================================================

if __name__ == "__main__":
    import uuid
    config = {"configurable": {"thread_id": str(uuid.uuid4())}}
    print("\n===== HARMONY CLI (for the web app, run: uvicorn app:app --reload) =====\n")

    add_hist = input("Add past statements? Enter a FOLDER/FILE path, or press Enter to skip:\n> ").strip()
    if add_hist:
        ingestion_agent({"messages": [{"role": "user", "content": add_hist}]})

    print("\nSubmit a draft (paste text OR a file/folder path). Type 'exit' to quit.\n")
    while True:
        user = input("Draft or question > ").strip()
        if user.lower() == "exit":
            break
        draft_text = read_path_as_text(user) if os.path.exists(user) else user
        result = workflow.invoke({"messages": [{"role": "user", "content": draft_text}]}, config=config)
        print("\nAssistant :", result["messages"][-1].content)
