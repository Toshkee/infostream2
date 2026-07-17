@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint (flat config in `eslint.config.mjs`, extends `next/core-web-vitals` + `next/typescript`)

No test runner is configured.

## Stack

Next.js 16 (App Router) + React 19 + TypeScript 5, Tailwind CSS v4 (via `@tailwindcss/postcss`, no `tailwind.config`), GSAP + `@gsap/react` for animation, Lenis for smooth scroll, `@react-three/fiber` + `@react-three/drei` + Three.js for the 3D hero layer (`src/components/three/`).

## Architecture

### Next.js 16 caveats (read before editing)
This repo runs on a Next.js version with breaking changes vs. older training data. **Always consult `node_modules/next/dist/docs/` before touching framework code.** Concrete differences already present in the repo:

- **`src/proxy.ts`** is what older Next calls `middleware.ts`. The exported function is `proxy(request)`, not `middleware(request)`. It handles locale redirects for `/` → `/<defaultLocale>`.
- **Route param props are async + typed via generated globals.** Pages/layouts use `PageProps<'/[lang]'>` / `LayoutProps<'/[lang]'>` (global types, no import needed) and must `await params` before reading values. See `src/app/[lang]/page.tsx` and `layout.tsx`.

### i18n
Single dynamic segment `[lang]` with locales declared in two places that must stay in sync:
- `src/lib/dictionaries.ts` — server-only dictionary loader (`eng`, `mne`), exposes `getDictionary`, `hasLocale`, `Locale`, `Dict`.
- `src/proxy.ts` — locale list + default for the redirect matcher.

Dictionaries live in `src/lib/dict/*.json` and are dynamically imported. Pages fetch the dictionary once in the server component and pass `dict` down as props; child components are typed against `Dict`.

### Page composition
`src/app/[lang]/page.tsx` is the homepage; `src/app/[lang]/expertise/[domain]/page.tsx` serves the four expertise-domain client pages (slugs `finance`/`hr`/`healthcare`/`dms`, also listed in `sitemap.ts`). `[lang]/layout.tsx` generates per-locale `Metadata` (title/OG/Twitter/JSON-LD `Organization` schema) and renders `SmoothScroll`, a persistent `Assistant` chat widget, and the `grain-overlay` div as layout-level chrome. The homepage renders `Navbar`, then `Hero` (intro + wide 3D shot), `Expertise` (pinned, 4 domain stops with client lists from `dict.expertise`), `PinnedProcess` (pinned, the four process scenes + planet flight), then `Technology` / `Projects` / `Security` / `Contact` each wrapped in `EdgeBeam` (an animated teal-hairline frame), then `Footer`. Shared presentation helpers (icon set, `Medallion`, `OrbitArcs`, `FollowTheStream`, `rev()`, `MOTION_QUERY`) live in `src/components/sections/visuals.tsx`.

### Animation / 3D
- GSAP-driven pinned/scroll animations live inside the section components (`Expertise`, `PinnedProcess`) and in `EdgeBeam`. Smooth scroll is provided globally by `src/components/providers/SmoothScroll.tsx` — GSAP ScrollTrigger work must integrate with Lenis rather than the native scroller. Note the deliberate `gsap.ticker.lagSmoothing(500, 33)` call there (see the comment in that file before changing it) — it exists to absorb a one-off cold-load stall from the lazy three.js chunk, not a general Lenis recipe.
- The pinned sections write a single scrubbed CSS variable per frame (`--ph` in `PinnedProcess`, `--xp` in `Expertise`); every reveal is a pure CSS function of it. Pinned/static variants are gated by the `.process-pinned`/`.expertise-pinned` classes in `globals.css`, whose media query must stay identical to `MOTION_QUERY`.
- `src/components/three/HeroScene.tsx` is the R3F canvas, mounted twice: in `Hero` with a phase ref parked at 0 (wide intro shot) and in `PinnedProcess` with the ScrollTrigger-driven ref (phases 1..4 = the four process-stage planet nodes; the pin drives `--ph` over [0.65, 5] so the original phase numbering survives the split). Loaded via `next/dynamic` with `ssr: false`, suppressed under `prefers-reduced-motion`, and frameloop-gated offscreen via `useInView` — node/planet count must match the number of pinned process scenes or the dust cloud whites out.

### Styling
Tailwind v4 is configured purely through `src/app/globals.css` (`@import "tailwindcss"` + `@theme` tokens). There is no `tailwind.config.{js,ts}` — add design tokens in `globals.css`. Fonts are wired via `next/font` in the root layout exposing `--font-sans-stack` / `--font-mono-stack` CSS variables.

### Path alias
`@/*` → `src/*` (see `tsconfig.json`).
