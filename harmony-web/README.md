# Harmony

Disclosure consistency, solved — a full multi-page product build: a dark cinematic marketing site, an
authenticated app shell, and every in-app screen on its own URL.

Harmony reads every draft against a company's entire disclosure history, flags what is off with cited evidence,
and routes each document through mandatory human approval. The AI never publishes.

```bash
npm install
npm run dev      # http://localhost:3000
```

`npm run build && npm run start` serves the production build. There is no backend — see **Data layer** below.

## Stack

- **Next.js 14** (App Router) · **React 18** · **TypeScript** (strict)
- **Tailwind CSS** with the design tokens in `tailwind.config.ts` and `app/globals.css`
- **three.js** (`three@0.160`) for the landing hero, mounted in a plain `useEffect` — no react-three-fiber
- Fonts via `next/font/google`: Instrument Serif, Inter, JetBrains Mono, Manrope
- No UI kit and no icon library. Every icon is inline SVG (Lucide-style, 1.4–1.5 stroke, `currentColor`)
- State is React state plus two contexts (`RoleContext`, `ToastProvider`) — no Redux

The first `npm install`/`next build` downloads the Google fonts, so it needs network access once.

## Routes

| URL | Screen |
| --- | --- |
| `/` | Marketing landing, three.js hero |
| `/pricing` | Three plan tiers, comparison, FAQ |
| `/customers` | Logo wall and testimonials |
| `/login` | Sign in — two-column, particle brand panel |
| `/signup` | Create workspace — 5-step flow, `?step=` driven |
| `/app` | Dashboard — 8 KPIs, pending approvals, activity, graph teaser |
| `/app/documents` | All Documents — corpus/draft upload zones, live uploads, filters, table |
| `/app/review/[id]` | Review Workspace — draft, evidence, AI suggestion, approval |
| `/app/knowledge` | Evidence Library — SVG knowledge graph with an inspector |
| `/app/analytics` | Analytics — trend line, severity/type bars, reviewer table |
| `/app/team` | Team & Activity — members, invite, manage, activity feed |
| `/app/settings/[tab]` | Settings — `org`, `members`, `security`, `api`, `billing`, `integrations` |

Every screen is a real route with real `<Link>` navigation. `/app/settings` redirects to `/app/settings/org`;
unknown URLs render `app/not-found.tsx`.

## Two skins, kept apart

Harmony has two visual systems and they never mix.

**Marketing** (`app/(marketing)/*`) — `#000` ground, Instrument Serif display type, literal hex values applied
per component, radial glow gradients. These pages are Server Components; the only client JavaScript on `/` is
`HeroObject`, and the pricing FAQ.

**App** (`app/(app)/*`, `/login`, `/signup`) — `#0a0d12` ground, Manrope headings over Inter body, driven by the
CSS custom properties on `.app-skin` in `app/globals.css`. Every tint is a `color-mix()` against a token
(`--accent`, `--accent-2`, `--warn`, `--danger`), so retuning one token re-tints the product consistently.

## Sizing

The two reference designs are authored for the desktop, and this build renders them **pixel-identical at
1280px and above** — the display type is `clamp()`ed so it reaches the reference size (88px hero, 76px closing,
52/48/44px section heads) by ~1230px and only scales below that rather than clipping.

Narrower is handled rather than ignored: the app grids collapse (8 KPIs go 4-up → 2-up, split views stack),
wide tables scroll inside their own card, and below `lg` the 240px sidebar is replaced by a scrollable nav
strip under the header. No page scrolls horizontally at 1920, 1440, 1280, 1024, 768 or 390.

## Permissions

`context/RoleContext.tsx` holds the active role and derives `canApprove` (Reviewer and above),
`canManageTeam` / `canManageBilling` / `canManageSecurity` (Admin and above), `isViewer` and `isEditorOnly`.
The header's role switcher writes to it and re-gates the UI everywhere:

- **Review** — Owner/Admin/Reviewer get Approve & publish, Request changes and Reject. Editor gets a notice that
  approval needs a Reviewer or above. Viewer gets a view-only notice.
- **Team** — invite, manage, suspend and remove are Admin and above.
- **Settings** — the danger zone, MFA management, API key creation and revocation, billing changes, and
  integration connections are all Admin and above; Viewer gets read-only organization fields.

The switcher exists so the model is demonstrable without five logins. In production `role` is seeded from the
authenticated user's RBAC claim and the control becomes a badge — a change to `RoleContext` alone. The active
role and workspace are kept in `sessionStorage` (restored after mount, so the markup never mismatches) and
therefore survive a reload, the way a real session would.

## Data layer

`lib/data.ts` holds the seed data and exposes every read as an `async` function taking the org id it is scoped
to (`getDocuments`, `getKpis`, `getAnalytics`, `getTeamMembers`, …). `lib/reviews.ts` holds the per-document
draft bodies and findings. Call sites go through `useAsyncData` / `useAsyncResource`, which already handle
out-of-order responses, so swapping the function bodies for `fetch` never touches a component.

The workspace switcher in the sidebar is real scoping: Acme, Globex and Demo return different documents, KPIs,
analytics and usage.

## Notable behaviour

- **Uploads run.** `lib/useUploads.ts` advances every in-flight upload on one interval, at different rates per
  stage (Queued → Uploading → Encrypting → Indexing → Complete), and each row is cancellable. Both cards accept
  drag-and-drop; the corpus card also takes a whole folder via `webkitdirectory`.
- **The review workspace is per document.** Each of the six documents has its own draft, findings, and workflow
  stage. `analyst-day-script` has not been analysed yet and offers to run the analysis.
- **Approval is deliberate.** Approve & publish opens a confirmation carrying the reviewer, unresolved and
  high-risk counts, AI confidence, and the responsibility statement, then advances the workflow.
- **API keys are shown once.** The secret is generated in the browser on click and never re-rendered after
  dismissal.

## Accessibility

Semantic landmarks throughout; a 2px accent focus ring with 2px offset on every interactive element; labelled
inputs (visually hidden where the design has no visible label); modals trap focus, close on Escape and on
backdrop click, and restore focus to their trigger; popovers close on outside click and Escape; the knowledge
graph nodes are keyboard-operable; toasts are announced through an `aria-live` region; and all animation is
disabled under `prefers-reduced-motion`.

## Layout

```
app/
  layout.tsx                     fonts + globals
  globals.css                    tokens for both skins, scrollbar, motion
  icon.svg                       favicon
  not-found.tsx
  (marketing)/                   layout (nav + footer), page, pricing, customers
  login/  signup/
  (app)/layout.tsx               sidebar + header + RoleProvider + ToastProvider
  (app)/app/                     page, documents, review/[id], knowledge, analytics, team, settings/[tab]
components/
  Logo.tsx
  marketing/                     Nav, HeroSection, HeroObject, LogoStrip, FlaggedDraft,
                                 ReviewerExperience, FeatureGrid, AnalyticsPanel, Testimonial,
                                 ClosingCTA, FaqAccordion, Footer
  app/                           Sidebar, MobileNav, Header, RoleSwitcher, Popover, Modal, Toast, Skeleton,
                                 KpiCard, DocTable, UploadZone, UploadList, WorkflowStepper,
                                 ReviewPanel, KnowledgeGraph, LineChart, BarList, SettingsTabs,
                                 TeamMembers, icons, settings/*
  auth/                          BrandPanel, ParticleField, SignupFlow
context/RoleContext.tsx
lib/                             data.ts, reviews.ts, style.ts, useAsyncData.ts, useUploads.ts
```
