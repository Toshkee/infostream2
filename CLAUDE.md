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
`src/app/[lang]/page.tsx` is the only route. It renders a fixed sequence of section components from `src/components/sections/` inside a `SmoothScroll` (Lenis) provider wrapping the whole tree in the layout. `ScrollProgress` and a `grain-overlay` div are layout-level chrome.

### Animation / 3D
- GSAP-driven pinned/scroll animations live inside the section components (e.g. `PinnedHero`, `StageViz`). Smooth scroll is provided globally by `src/components/providers/SmoothScroll.tsx` — GSAP ScrollTrigger work must integrate with Lenis rather than the native scroller.
- `src/components/three/HeroScene.tsx` is the R3F canvas mounted inside `PinnedHero`'s backdrop. It's loaded via `next/dynamic` with `ssr: false` and suppressed under `prefers-reduced-motion`. Receives `phase` (0..5) from the parent's ScrollTrigger to couple camera/material to scroll progress.

### Styling
Tailwind v4 is configured purely through `src/app/globals.css` (`@import "tailwindcss"` + `@theme` tokens). There is no `tailwind.config.{js,ts}` — add design tokens in `globals.css`. Fonts are wired via `next/font` in the root layout exposing `--font-sans-stack` / `--font-mono-stack` CSS variables.

### Path alias
`@/*` → `src/*` (see `tsconfig.json`).
