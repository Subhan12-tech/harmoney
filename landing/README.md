# Harmony Landing Page

Marketing landing page for Harmony — Disclosure Consistency Copilot. Next.js 14 (App Router) + TypeScript + Tailwind CSS, with an animated three.js hero.

## Develop

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Build

```bash
npm run build
npm run start
```

## Structure

- `app/` — root layout (fonts, global styles) and the single page route
- `components/` — one component per section of the page, in the order they render on `/`
- `components/HeroObject.tsx` — the only client component; mounts a three.js scene (a rotating hollow cube built from smaller cubes) into the hero's right column
