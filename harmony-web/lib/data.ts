/**
 * Seed data for the Harmony product.
 *
 * There is no backend in this build, but every read is exposed as an `async`
 * function taking the org id it is scoped to, so swapping the bodies for real
 * `fetch` calls is a local change that never touches a call site.
 */

/* ============================================================
   Types
   ============================================================ */

export type Role = "Owner" | "Admin" | "Reviewer" | "Editor" | "Viewer";
export type Severity = "High" | "Medium" | "Low";

export type DocStatus = "Draft" | "In Review" | "Changes Requested" | "Approved" | "Published";

export type DocType =
  | "Earnings Release"
  | "Investor Letter"
  | "Regulatory Filing"
  | "Press Release"
  | "Analyst Call"
  | "Corporate Statement";

export interface HarmonyDocument {
  id: string;
  name: string;
  type: DocType;
  status: DocStatus;
  reviewer: string;
  risk: Severity;
  updated: string;
}

export interface Issue {
  id: string;
  severity: Severity;
  /** The exact draft sentence this issue is anchored to. */
  phrase: string;
  reason: string;
  evidenceDoc: string;
  evidenceDate: string;
  evidenceSource: string;
  evidenceQuote: string;
  confidence: number;
  /** What to do about it, in prose. */
  suggestion: string;
  /**
   * The AI's concrete replacement for `phrase` — the starting point a reviewer
   * edits. Applying either this or the reviewer's own wording rewrites the
   * sentence in the draft.
   */
  suggestedRewrite: string;
}

export interface Kpi {
  label: string;
  value: string;
  delta: string;
}

export interface ActivityEntry {
  initials: string;
  text: string;
  time: string;
}

export interface TeamMember {
  name: string;
  email: string;
  role: Role;
  status: "Active" | "Invited" | "Suspended";
  lastActive: string;
  /** The signed-in user's row, which mirrors the live role switcher. */
  isCurrentUser?: boolean;
}

export interface Plan {
  id: "starter" | "business" | "enterprise";
  name: string;
  price: string;
  cadence: string;
  desc: string;
  cta: string;
  highlighted: boolean;
  features: string[];
}

/* ============================================================
   Roles & permissions
   ============================================================ */

export const ROLE_RANK: Record<Role, number> = {
  Owner: 1,
  Admin: 2,
  Reviewer: 3,
  Editor: 4,
  Viewer: 5,
};

export const ROLES: Role[] = ["Owner", "Admin", "Reviewer", "Editor", "Viewer"];

/* ============================================================
   Organizations
   ============================================================ */

export interface Org {
  id: string;
  name: string;
  website: string;
  industry: string;
  timezone: string;
  workspaceId: string;
}

export const ORGS: Org[] = [
  {
    id: "acme",
    name: "Acme Corporation",
    website: "acme.com",
    industry: "Enterprise Software",
    timezone: "America/New_York",
    workspaceId: "ws_9f2k4h1a",
  },
  {
    id: "globex",
    name: "Globex Inc.",
    website: "globex.com",
    industry: "Industrial Manufacturing",
    timezone: "America/Chicago",
    workspaceId: "ws_3d8m2p7c",
  },
  {
    id: "demo",
    name: "Demo Workspace",
    website: "demo.harmony.app",
    industry: "Demonstration",
    timezone: "UTC",
    workspaceId: "ws_demo0001",
  },
];

export const DEFAULT_ORG_ID = "acme";

export function getOrg(orgId: string): Org {
  return ORGS.find((o) => o.id === orgId) ?? ORGS[0];
}

export const CURRENT_USER = { name: "Riley Chen", email: "riley.chen@acme.com", initials: "RC" };

/* ============================================================
   Workflow
   ============================================================ */

export const WORKFLOW_STAGES = [
  "Draft",
  "AI Analysis",
  "Review",
  "Changes Requested",
  "Ready for Approval",
  "Approved",
  "Published",
] as const;

export type WorkflowStage = (typeof WORKFLOW_STAGES)[number];

/* ============================================================
   Documents
   ============================================================ */

const DOCUMENTS: HarmonyDocument[] = [
  {
    id: "q3-fy2026-earnings",
    name: "Q3 FY2026 Earnings Release",
    type: "Earnings Release",
    status: "In Review",
    reviewer: "Priya Shah",
    risk: "High",
    updated: "12m ago",
  },
  {
    id: "investor-letter-august",
    name: "Investor Letter — August",
    type: "Investor Letter",
    status: "Changes Requested",
    reviewer: "Elena Torres",
    risk: "Medium",
    updated: "1h ago",
  },
  {
    id: "fy25-10k-filing",
    name: "FY25 10-K Filing",
    type: "Regulatory Filing",
    status: "Approved",
    reviewer: "Marcus Webb",
    risk: "Low",
    updated: "3h ago",
  },
  {
    id: "q2-press-release",
    name: "Q2 Press Release",
    type: "Press Release",
    status: "Published",
    reviewer: "Priya Shah",
    risk: "Low",
    updated: "1d ago",
  },
  {
    id: "analyst-day-script",
    name: "Analyst Day Script",
    type: "Analyst Call",
    status: "Draft",
    reviewer: "David Okafor",
    risk: "Low",
    updated: "2d ago",
  },
  {
    id: "corporate-sustainability",
    name: "Corporate Sustainability Statement",
    type: "Corporate Statement",
    status: "In Review",
    reviewer: "Elena Torres",
    risk: "Medium",
    updated: "3d ago",
  },
];

/** The documents surfaced on the dashboard as awaiting a decision. */
const PENDING_APPROVAL_IDS = ["q3-fy2026-earnings", "investor-letter-august", "analyst-day-script"];

/* ============================================================
   Review workspace — the seeded draft and its three issues
   ============================================================ */

export const REVIEW_ISSUES: Issue[] = [
  {
    id: "rev",
    severity: "High",
    phrase: "Revenue growth is expected at 20–25% for fiscal Q3",
    reason:
      "The current revenue growth range differs from previously communicated guidance without an explanation for the change.",
    evidenceDoc: "Q1 2026 Earnings Call",
    evidenceDate: "Jan 30, 2026",
    evidenceSource: "Transcript, p. 4",
    evidenceQuote: "Revenue growth expected at 15–20%.",
    confidence: 92,
    suggestion:
      "Align the stated range with prior guidance, or add explicit context for why guidance has changed.",
    suggestedRewrite:
      "Revenue growth is expected at 15–20% for fiscal Q3, consistent with the guidance issued on our Q1 2026 earnings call",
  },
  {
    id: "term",
    severity: "Medium",
    phrase: "Management identified a significant deficiency in the revenue recognition process",
    reason:
      "Prior filings used the term “material weakness” for this control issue; this draft uses “significant deficiency,” a materially different classification.",
    evidenceDoc: "FY2025 10-K Filing",
    evidenceDate: "Mar 3, 2026",
    evidenceSource: "Item 9A, Controls and Procedures",
    evidenceQuote: "Management identified a material weakness in the revenue recognition process.",
    confidence: 81,
    suggestion:
      "Confirm the correct classification with Legal before filing; terminology must match the control assessment on record.",
    suggestedRewrite: "Management identified a material weakness in the revenue recognition process",
  },
  {
    id: "claim",
    severity: "Low",
    phrase: "enterprise customer count grew 40% year-over-year",
    reason:
      "This growth figure could not be matched to any supporting statement in prior filings, investor letters, or approved metrics.",
    evidenceDoc: "No matching source found",
    evidenceDate: "—",
    evidenceSource: "Evidence Library",
    evidenceQuote: "No corroborating statement located in the last 8 quarters of disclosures.",
    confidence: 64,
    suggestion: "Add a citation for the 40% figure, or soften the claim to a range that is supportable.",
    suggestedRewrite: "enterprise customer count grew at a double-digit rate year-over-year",
  },
];

/**
 * The draft body. Each paragraph is split around its flagged phrase so the
 * highlight renders as a real inline element — no dangerouslySetInnerHTML.
 */
export const REVIEW_DRAFT: { before: string; issueId: string | null; after: string }[] = [
  {
    before:
      "Harmony delivered a strong third quarter, with continued momentum across our enterprise segment. ",
    issueId: "rev",
    after: ", supported by expansion in our largest accounts and continued discipline on cost of delivery.",
  },
  {
    before: "Our internal controls environment remains sound. ",
    issueId: "term",
    after: " during the quarter, which has since been remediated ahead of filing.",
  },
  {
    before: "Customer momentum remained strong across the base, and ",
    issueId: "claim",
    after: ", reflecting continued demand for the platform among large organizations.",
  },
  {
    before:
      "We remain focused on disciplined execution as we head into the final quarter of the fiscal year, and we thank our employees, customers and shareholders for their continued trust in Harmony.",
    issueId: null,
    after: "",
  },
];

export const REVIEW_META = {
  submittedBy: "Priya Shah",
  analysisCompleted: "12 minutes ago",
  aiConfidence: 92,
};

/** The steps the AI takes before a human ever sees a suggestion. */
export const AI_WORKFLOW = ["Retrieve", "Compare", "Reason", "Verify", "Cite", "Suggest", "Human Review"];

/* ============================================================
   Dashboard
   ============================================================ */

const KPIS: Kpi[] = [
  { label: "Active reviews", value: "14", delta: "+3 this week" },
  { label: "Documents reviewed", value: "128", delta: "+11 this month" },
  { label: "Inconsistencies detected", value: "342", delta: "+28 this month" },
  { label: "High-risk issues", value: "9", delta: "2 unresolved" },
  { label: "Suggestions generated", value: "261", delta: "78% applied" },
  { label: "Approval rate", value: "94%", delta: "+2pt vs Q2" },
  { label: "Avg review time", value: "3.2h", delta: "-18min vs Q2" },
  { label: "Consistency score", value: "87/100", delta: "+5 vs Q2" },
];

const TEAM_ACTIVITY: ActivityEntry[] = [
  { initials: "PS", text: "Priya Shah approved Q2 Press Release", time: "18m ago" },
  { initials: "ET", text: "Elena Torres requested changes on Investor Letter", time: "52m ago" },
  { initials: "MW", text: "Marcus Webb applied 3 AI suggestions", time: "2h ago" },
  { initials: "DO", text: "David Okafor started AI analysis on 10-K draft", time: "4h ago" },
];

export const NOTIFICATIONS = [
  { title: "High-risk inconsistency detected in Q3 Earnings Release", time: "12m ago" },
  { title: "Priya Shah requested changes on Investor Letter — Aug", time: "1h ago" },
  { title: "New security alert: new sign-in from unrecognized device", time: "Yesterday" },
];

/* ============================================================
   Knowledge graph
   ============================================================ */

export interface GraphNodeDef {
  id: string;
  label1: string;
  label2: string;
  /** Radius encodes how many statements the source contributes. */
  r: number;
  /** Degrees around the centre; null marks the centre node itself. */
  angle: number | null;
  statements: string[];
}

export const GRAPH_NODES: GraphNodeDef[] = [
  {
    id: "draft",
    label1: "Draft:",
    label2: "Q3 Release",
    r: 30,
    angle: null,
    statements: [
      "Revenue growth is expected at 20–25% for fiscal Q3.",
      "Management identified a significant deficiency in the revenue recognition process.",
      "Enterprise customer count grew 40% year-over-year.",
    ],
  },
  {
    id: "n1",
    label1: "Q1 2026",
    label2: "Earnings Call",
    r: 20,
    angle: -150,
    statements: [
      "Revenue growth expected at 15–20%.",
      "We continue to see strength in our largest enterprise accounts.",
      "Cost of delivery improved 180 basis points year-over-year.",
    ],
  },
  {
    id: "n2",
    label1: "Q4 2025",
    label2: "Press Release",
    r: 16,
    angle: -90,
    statements: [
      "Full-year revenue grew 22% to $412M.",
      "Net revenue retention of 118% across the enterprise segment.",
    ],
  },
  {
    id: "n3",
    label1: "FY25 Investor",
    label2: "Letter",
    r: 16,
    angle: -30,
    statements: [
      "We added 240 net-new enterprise logos in fiscal 2025.",
      "Our disclosure discipline is a competitive advantage, not overhead.",
    ],
  },
  {
    id: "n4",
    label1: "10-K Filing",
    label2: "Mar 2026",
    r: 22,
    angle: 30,
    statements: [
      "Management identified a material weakness in the revenue recognition process.",
      "Remediation is expected to complete before the end of fiscal Q3.",
      "No restatement of prior-period financials is required.",
    ],
  },
  {
    id: "n5",
    label1: "Revenue Rec.",
    label2: "Policy",
    r: 18,
    angle: 90,
    statements: [
      "Multi-year contracts are recognised ratably over the committed term.",
      "Usage overages are recognised in the period incurred.",
    ],
  },
  {
    id: "n6",
    label1: "Guidance Memo",
    label2: "Feb 2026",
    r: 18,
    angle: 150,
    statements: [
      "Any change to a published guidance range requires IR and Legal sign-off.",
      "Guidance changes must be accompanied by stated rationale.",
    ],
  },
];

/* ============================================================
   Analytics
   ============================================================ */

export const CONSISTENCY_SCORES = [72, 78, 81, 79, 85, 87];
export const CONSISTENCY_MONTHS = ["Mar", "Apr", "May", "Jun", "Jul", "Aug"];

export const SEVERITY_BARS: SeverityBar[] = [
  { label: "High", count: 9, width: 9, token: "var(--danger)" },
  { label: "Medium", count: 34, width: 34, token: "var(--warn)" },
  { label: "Low", count: 58, width: 58, token: "var(--accent-2)" },
];

export const TYPE_BARS = [
  { label: "Regulatory Filing", count: 31, width: 62 },
  { label: "Earnings Release", count: 22, width: 44 },
  { label: "Press Release", count: 15, width: 30 },
  { label: "Corporate Statement", count: 12, width: 24 },
  { label: "Investor Letter", count: 9, width: 18 },
];

export const REVIEW_PERF = [
  { name: "Priya Shah", time: "2.1h", rate: "96%" },
  { name: "Marcus Webb", time: "3.4h", rate: "91%" },
  { name: "Elena Torres", time: "2.8h", rate: "94%" },
  { name: "David Okafor", time: "4.0h", rate: "88%" },
];

/* ============================================================
   Team
   ============================================================ */

/** `role: null` marks the signed-in user, whose row follows the role switcher. */
const TEAM_MEMBER_SEED: (Omit<TeamMember, "role"> & { role: Role | null })[] = [
  {
    name: "Riley Chen",
    email: "riley.chen@acme.com",
    role: null,
    status: "Active",
    lastActive: "Now",
    isCurrentUser: true,
  },
  { name: "Priya Shah", email: "priya.shah@acme.com", role: "Reviewer", status: "Active", lastActive: "12m ago" },
  { name: "Marcus Webb", email: "marcus.webb@acme.com", role: "Editor", status: "Active", lastActive: "1h ago" },
  { name: "Elena Torres", email: "elena.torres@acme.com", role: "Admin", status: "Active", lastActive: "3h ago" },
  { name: "David Okafor", email: "david.okafor@acme.com", role: "Reviewer", status: "Invited", lastActive: "—" },
  { name: "Sam Patel", email: "sam.patel@acme.com", role: "Viewer", status: "Suspended", lastActive: "14d ago" },
];

/* ============================================================
   Settings
   ============================================================ */

export const SESSIONS = [
  {
    device: "Chrome on macOS",
    location: "New York, US",
    ip: "204.14.88.12",
    lastActive: "Active now",
    current: true,
  },
  {
    device: "Safari on iOS",
    location: "New York, US",
    ip: "204.14.88.40",
    lastActive: "2h ago",
    current: false,
  },
];

export const SECURITY_LOG = [
  { event: "Signed in from Chrome on macOS", time: "Just now" },
  { event: "MFA enabled", time: "Yesterday, 4:12pm" },
  { event: "Password changed", time: "3 days ago" },
  { event: "Failed login attempt", time: "5 days ago" },
  { event: "API key created — “Reporting bot”", time: "1 week ago" },
];

export const API_KEYS = [
  { name: "Reporting bot", created: "Jul 2, 2026", lastUsed: "2h ago", perm: "Read-only" },
  { name: "CI pipeline", created: "May 14, 2026", lastUsed: "1d ago", perm: "Read/Write" },
];

/**
 * The plan tiers. `/pricing` (marketing skin) and Settings → Billing (app skin)
 * both read this, so a price only ever changes in one place.
 */
export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: "$490",
    cadence: "/mo",
    desc: "Up to 3 reviewers, 50 documents/mo.",
    cta: "Downgrade",
    highlighted: false,
    features: [
      "3 reviewer seats",
      "50 documents / month",
      "Evidence-cited AI analysis",
      "Email approval routing",
      "90-day audit retention",
    ],
  },
  {
    id: "business",
    name: "Business",
    price: "$1,900",
    cadence: "/mo",
    desc: "Unlimited reviewers, 500 documents/mo, SSO.",
    cta: "Current plan",
    highlighted: true,
    features: [
      "Unlimited reviewer seats",
      "500 documents / month",
      "SAML SSO & SCIM provisioning",
      "Slack and Teams approval routing",
      "Full immutable audit trail",
      "Knowledge graph & analytics",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    desc: "Unlimited usage, dedicated support, custom SLAs.",
    cta: "Contact sales",
    highlighted: false,
    features: [
      "Unlimited documents",
      "Dedicated CSM & 24×7×365 on-call",
      "Custom SLAs and data residency",
      "Private model deployment",
      "Custom retention policy",
      "Named security reviewer",
    ],
  },
];

export const USAGE_BARS = [
  { label: "Seats used", value: "18 / 25", width: 72 },
  { label: "Documents analyzed", value: "312 / 500", width: 62 },
  { label: "AI analysis minutes", value: "4,120 / 6,000", width: 69 },
];

export const INTEGRATIONS = [
  {
    category: "Documents",
    name: "Google Drive",
    desc: "Import drafts directly from shared drives.",
    connected: true,
    action: "Disconnect",
  },
  {
    category: "Documents",
    name: "Microsoft SharePoint",
    desc: "Sync disclosure drafts and filings.",
    connected: false,
    action: "Connect",
  },
  {
    category: "Communication",
    name: "Slack",
    desc: "Get review and risk alerts in Slack.",
    connected: true,
    action: "Configure",
  },
  {
    category: "Communication",
    name: "Microsoft Teams",
    desc: "Route approvals to Teams channels.",
    connected: false,
    action: "Connect",
  },
  {
    category: "Financial / Filing",
    name: "SEC / Regulatory Data",
    desc: "Cross-reference filings automatically.",
    connected: true,
    action: "Configure",
  },
  {
    category: "Enterprise",
    name: "Okta",
    desc: "Provision users and enforce SSO.",
    connected: false,
    action: "Connect",
  },
];

export const SETTINGS_TABS = [
  { key: "org", label: "Organization" },
  { key: "members", label: "Members & Roles" },
  { key: "security", label: "Security" },
  { key: "api", label: "API" },
  { key: "billing", label: "Billing" },
  { key: "integrations", label: "Integrations" },
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number]["key"];

export const SETTINGS_TAB_KEYS: readonly string[] = SETTINGS_TABS.map((t) => t.key);

/* ============================================================
   Marketing
   ============================================================ */

export const BRANDS: { text: string; style: React.CSSProperties }[] = [
  { text: "Meridian", style: { fontFamily: "Georgia, serif", fontStyle: "italic" } },
  { text: "ARDEN", style: { fontWeight: 700, letterSpacing: "0.08em" } },
  { text: "Halcyon", style: { fontFamily: "var(--font-instrument-serif), serif", fontSize: 20 } },
  { text: "◆ Vantage", style: { fontWeight: 600 } },
  { text: "Northwind", style: { fontFamily: "Georgia, serif" } },
  { text: "CLARO", style: { fontWeight: 700 } },
  { text: "▲ apex", style: {} },
  { text: "Ferris & Co.", style: { fontFamily: "var(--font-instrument-serif), serif", fontSize: 20 } },
  { text: "◐ orbital", style: {} },
  { text: "Blackstone Row", style: { fontFamily: "Georgia, serif" } },
  { text: "STRATA", style: { fontWeight: 700 } },
  { text: "✱ signal", style: {} },
];

export const TESTIMONIALS = [
  {
    quote:
      "We cut disclosure review from two weeks to four days, and caught a guidance mismatch that would have made the front page.",
    name: "Elena Costa",
    title: "VP Investor Relations, Meridian",
    initials: "EC",
  },
  {
    quote:
      "Every finding arrives with the prior filing attached. My team stopped arguing about whether something was inconsistent and started deciding what to do about it.",
    name: "Daniel Whitfield",
    title: "Deputy General Counsel, Arden",
    initials: "DW",
  },
  {
    quote:
      "The approval trail is what sold our audit committee. Nothing publishes without a named human on the record.",
    name: "Sofia Marchetti",
    title: "Head of Corporate Communications, Halcyon",
    initials: "SM",
  },
];

export const PRICING_FAQ = [
  {
    q: "Does Harmony ever publish a document on its own?",
    a: "No. Harmony analyses, cites, and suggests — but every document routes through a named human reviewer with role-based approval before it can be published. That constraint is structural, not a setting you can turn off.",
  },
  {
    q: "How does Harmony learn our disclosure history?",
    a: "You upload your historical corpus — filings, transcripts, press releases, investor letters, policy memos — and Harmony indexes it as evidence. Every subsequent finding cites a specific sentence, page, or timestamp from that corpus.",
  },
  {
    q: "What happens if we exceed our document allowance?",
    a: "Nothing breaks. We notify your workspace admins at 80% and 100% of the allowance, and overage is billed at the plan's per-document rate. Enterprise plans are uncapped.",
  },
  {
    q: "Which identity providers are supported?",
    a: "SAML 2.0 and OIDC, including Okta, Azure AD, Google Workspace, and any compliant IdP. SCIM provisioning and deprovisioning is included on Business and Enterprise.",
  },
  {
    q: "Where is our data stored, and is it used for training?",
    a: "Data is encrypted at rest and in transit, stored in your chosen region, and is never used to train shared models. Enterprise plans can specify data residency and a custom retention policy.",
  },
  {
    q: "Can we trial Harmony before committing?",
    a: "Yes. Every plan starts with a 30-day pilot against a sample of your own historical corpus, so you can see real findings on real disclosures before signing anything.",
  },
];

/* ============================================================
   Async getters — the seam a real API drops into
   ============================================================ */

async function resolve<T>(value: T): Promise<T> {
  return value;
}

export async function getDocuments(orgId: string): Promise<HarmonyDocument[]> {
  // Scoped by org so data never mixes across workspaces.
  if (orgId === "demo") return resolve(DOCUMENTS.slice(0, 3));
  return resolve(DOCUMENTS);
}

export async function getDocument(orgId: string, id: string): Promise<HarmonyDocument | undefined> {
  const docs = await getDocuments(orgId);
  return docs.find((d) => d.id === id);
}

export async function getPendingApprovals(orgId: string): Promise<HarmonyDocument[]> {
  const docs = await getDocuments(orgId);
  return docs.filter((d) => PENDING_APPROVAL_IDS.includes(d.id));
}

export async function getKpis(orgId: string): Promise<Kpi[]> {
  return resolve(KPIS_BY_ORG[orgId] ?? KPIS);
}

export async function getTeamActivity(orgId: string): Promise<ActivityEntry[]> {
  return resolve(orgId === "demo" ? TEAM_ACTIVITY.slice(0, 2) : TEAM_ACTIVITY);
}

export async function getTeamMembers(orgId: string, currentRole: Role): Promise<TeamMember[]> {
  const org = getOrg(orgId);
  return resolve(
    TEAM_MEMBER_SEED.map((m) => ({
      ...m,
      // The current user's row always reflects the live role switcher.
      role: (m.role ?? currentRole) as Role,
      email: m.email.replace("acme.com", org.website),
    })),
  );
}

export async function getPlans(): Promise<Plan[]> {
  return resolve(PLANS);
}

/* ============================================================
   Org-scoped variants
   ------------------------------------------------------------
   `activeOrg` is not decoration: switching workspaces changes every number
   on screen, the way it would if each org were a separate tenant.
   ============================================================ */

const KPIS_BY_ORG: Record<string, Kpi[]> = {
  acme: KPIS,
  globex: [
    { label: "Active reviews", value: "6", delta: "+1 this week" },
    { label: "Documents reviewed", value: "74", delta: "+7 this month" },
    { label: "Inconsistencies detected", value: "187", delta: "+14 this month" },
    { label: "High-risk issues", value: "4", delta: "1 unresolved" },
    { label: "Suggestions generated", value: "129", delta: "71% applied" },
    { label: "Approval rate", value: "91%", delta: "+1pt vs Q2" },
    { label: "Avg review time", value: "4.1h", delta: "-12min vs Q2" },
    { label: "Consistency score", value: "81/100", delta: "+3 vs Q2" },
  ],
  demo: [
    { label: "Active reviews", value: "2", delta: "Sample workspace" },
    { label: "Documents reviewed", value: "12", delta: "Seeded corpus" },
    { label: "Inconsistencies detected", value: "24", delta: "Across 3 drafts" },
    { label: "High-risk issues", value: "1", delta: "1 unresolved" },
    { label: "Suggestions generated", value: "18", delta: "60% applied" },
    { label: "Approval rate", value: "100%", delta: "Demo data" },
    { label: "Avg review time", value: "1.4h", delta: "Demo data" },
    { label: "Consistency score", value: "93/100", delta: "Demo data" },
  ],
};

/* ============================================================
   Analytics
   ============================================================ */

export interface SeverityBar {
  label: Severity;
  count: number;
  width: number;
  token: string;
}

export interface TypeBar {
  label: string;
  count: number;
  width: number;
}

export interface ReviewerPerformance {
  name: string;
  time: string;
  rate: string;
}

export interface AnalyticsSnapshot {
  scores: number[];
  months: string[];
  severity: SeverityBar[];
  types: TypeBar[];
  performance: ReviewerPerformance[];
}

const ANALYTICS_BY_ORG: Record<string, AnalyticsSnapshot> = {
  acme: {
    scores: CONSISTENCY_SCORES,
    months: CONSISTENCY_MONTHS,
    severity: SEVERITY_BARS,
    types: TYPE_BARS,
    performance: REVIEW_PERF,
  },
  globex: {
    scores: [64, 68, 67, 73, 78, 81],
    months: CONSISTENCY_MONTHS,
    severity: [
      { label: "High", count: 4, width: 12, token: "var(--danger)" },
      { label: "Medium", count: 19, width: 42, token: "var(--warn)" },
      { label: "Low", count: 31, width: 68, token: "var(--accent-2)" },
    ],
    types: [
      { label: "Regulatory Filing", count: 18, width: 60 },
      { label: "Press Release", count: 12, width: 40 },
      { label: "Earnings Release", count: 11, width: 37 },
      { label: "Corporate Statement", count: 8, width: 27 },
      { label: "Investor Letter", count: 5, width: 17 },
    ],
    performance: [
      { name: "Priya Shah", time: "2.6h", rate: "93%" },
      { name: "Marcus Webb", time: "4.2h", rate: "89%" },
      { name: "Elena Torres", time: "3.1h", rate: "92%" },
      { name: "David Okafor", time: "5.0h", rate: "84%" },
    ],
  },
  demo: {
    scores: [88, 90, 89, 91, 92, 93],
    months: CONSISTENCY_MONTHS,
    severity: [
      { label: "High", count: 1, width: 6, token: "var(--danger)" },
      { label: "Medium", count: 6, width: 32, token: "var(--warn)" },
      { label: "Low", count: 17, width: 88, token: "var(--accent-2)" },
    ],
    types: [
      { label: "Earnings Release", count: 9, width: 60 },
      { label: "Press Release", count: 7, width: 47 },
      { label: "Investor Letter", count: 5, width: 33 },
      { label: "Regulatory Filing", count: 2, width: 13 },
      { label: "Corporate Statement", count: 1, width: 7 },
    ],
    performance: [
      { name: "Priya Shah", time: "1.2h", rate: "100%" },
      { name: "Riley Chen", time: "1.6h", rate: "100%" },
    ],
  },
};

export async function getAnalytics(orgId: string): Promise<AnalyticsSnapshot> {
  return resolve(ANALYTICS_BY_ORG[orgId] ?? ANALYTICS_BY_ORG.acme);
}

/* ============================================================
   Knowledge graph getter
   ============================================================ */

export async function getGraph(orgId: string): Promise<GraphNodeDef[]> {
  // The demo workspace has a thinner corpus, so fewer sources surround the draft.
  if (orgId === "demo") return resolve(GRAPH_NODES.filter((n) => !["n5", "n6"].includes(n.id)));
  return resolve(GRAPH_NODES);
}

/* ============================================================
   Settings getters
   ============================================================ */

export async function getSessions(_orgId: string) {
  return resolve(SESSIONS);
}

export async function getSecurityLog(_orgId: string) {
  return resolve(SECURITY_LOG);
}

export async function getApiKeys(orgId: string) {
  return resolve(orgId === "demo" ? API_KEYS.slice(0, 1) : API_KEYS);
}

export async function getIntegrations(_orgId: string) {
  return resolve(INTEGRATIONS);
}

export async function getUsage(orgId: string) {
  if (orgId === "globex") {
    return resolve([
      { label: "Seats used", value: "9 / 25", width: 36 },
      { label: "Documents analyzed", value: "148 / 500", width: 30 },
      { label: "AI analysis minutes", value: "1,905 / 6,000", width: 32 },
    ]);
  }
  if (orgId === "demo") {
    return resolve([
      { label: "Seats used", value: "3 / 3", width: 100 },
      { label: "Documents analyzed", value: "12 / 50", width: 24 },
      { label: "AI analysis minutes", value: "210 / 600", width: 35 },
    ]);
  }
  return resolve(USAGE_BARS);
}
