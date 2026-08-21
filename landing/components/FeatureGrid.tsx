function IconBase({ children }: { children: React.ReactNode }) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4}>
      {children}
    </svg>
  );
}

const FEATURES = [
  {
    title: "Evidence-first analysis",
    body: "Every finding cites a prior source with page, timestamp, and confidence.",
    icon: (
      <IconBase>
        <circle cx="11" cy="11" r="6" />
        <line x1="16" y1="16" x2="21" y2="21" />
      </IconBase>
    ),
  },
  {
    title: "Real-time inbox",
    body: "Reviewers see new drafts, changes, and approvals the moment they land.",
    icon: (
      <IconBase>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 6 9-6" />
      </IconBase>
    ),
  },
  {
    title: "Deliverable audit trail",
    body: "Every approval, edit, and dismiss is signed, timestamped, and immutable.",
    icon: (
      <IconBase>
        <path d="M7 3h7l4 4v14H7z" />
        <line x1="10" y1="12" x2="15" y2="12" />
        <line x1="10" y1="16" x2="15" y2="16" />
      </IconBase>
    ),
  },
  {
    title: "Managed deliverability",
    body: "Route approvals through Slack, Teams, or email — no lost drafts.",
    icon: (
      <IconBase>
        <path d="M4 12l5 5L20 6" />
      </IconBase>
    ),
  },
  {
    title: "SAML SSO & SCIM",
    body: "Okta, Azure AD, or your own IdP. Provisioning and deprovisioning automatic.",
    icon: (
      <IconBase>
        <rect x="4" y="11" width="16" height="9" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </IconBase>
    ),
  },
  {
    title: "Priority support 24×7×365",
    body: "Named CSM and human on-call. No forms. No ticket queues.",
    icon: (
      <IconBase>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </IconBase>
    ),
  },
];

export function FeatureGrid() {
  return (
    <section className="mx-auto max-w-[1000px] text-center" style={{ padding: "100px 40px" }}>
      <div
        className="mx-auto mb-7"
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: "radial-gradient(circle at 30% 30%, #4a6fff, #1a1a3a)",
          boxShadow: "0 0 60px rgba(90,120,255,.35)",
        }}
      />
      <h2 className="font-serif" style={{ fontSize: 52 }}>
        Reach reviewers, not rework.
      </h2>
      <p className="mx-auto text-muted2" style={{ fontSize: 16, maxWidth: 480, marginTop: 16, marginBottom: 56 }}>
        Consistency isn&rsquo;t a checklist — it&rsquo;s a system. Six controls we&rsquo;ve built into the review
        loop.
      </p>

      <div className="grid gap-7 text-left sm:grid-cols-2 md:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title}>
            <div
              className="mb-4 flex items-center justify-center text-[#8a8a8a]"
              style={{ width: 32, height: 32, borderRadius: 8, background: "#0a0a0a", border: "1px solid #1a1a1a" }}
            >
              {f.icon}
            </div>
            <div className="text-white" style={{ fontSize: 15, marginBottom: 6 }}>
              {f.title}
            </div>
            <div className="text-muted" style={{ fontSize: 13.5, lineHeight: 1.5 }}>
              {f.body}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
