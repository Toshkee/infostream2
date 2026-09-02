@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint (flat config in `eslint.config.mjs`, extends `next/core-web-vitals` + `next/typescript`)
- `npm run typecheck` — `tsc --noEmit`
- `npm run check` — repo invariants (dictionary parity, motion query, locale list)
- `npm run verify` — lint + check + typecheck + build; this is what CI (`.github/workflows/ci.yml`) runs

No test runner is configured. `docs/animation.md` is the scroll/animation contract; read it before touching Lenis/ScrollTrigger code.

## Stack

Next.js 16 (App Router) + React 19 + TypeScript 5, Tailwind CSS v4 (via `@tailwindcss/postcss`, no `tailwind.config`), GSAP + `@gsap/react` for animation, and Lenis for smooth scroll.

## Architecture

### Next.js 16 caveats (read before editing)
This repo runs on a Next.js version with breaking changes vs. older training data. **Always consult `node_modules/next/dist/docs/` before touching framework code.** Concrete differences already present in the repo:

- **`src/proxy.ts`** is what older Next calls `middleware.ts`. The exported function is `proxy(request)`, not `middleware(request)`. It handles locale redirects for `/` → `/<defaultLocale>`.
- **Route param props are async + typed via generated globals.** Pages/layouts use `PageProps<'/[lang]'>` / `LayoutProps<'/[lang]'>` (global types, no import needed) and must `await params` before reading values. See `src/app/[lang]/page.tsx` and `layout.tsx`.

### i18n
Single dynamic segment `[lang]`. The locale list lives in ONE place:
- `src/lib/locales.ts` — client-safe: `locales`, `defaultLocale`, `Locale`, `hasLocale`, `htmlLang` (BCP 47 for `<html lang>`/hreflang), `ogLocale`, `localeNames` (switcher endonyms), `languageAlternates()`. Imported by `proxy.ts` and client components.
- `src/lib/dictionaries.ts` — server-only loader that re-exports the above and adds `getDictionary` / `Dict`.

Dictionaries live in `src/lib/dict/*.json` and are dynamically imported. Pages fetch the dictionary once in the server component and pass **slices** down (`nav={dict.nav}`, `hero={dict.hero}`, typed as `Dict["hero"]`); only server components take the whole `dict`. The `[lang]/error.tsx` boundary cannot load the dictionary, so the layout hands it `dict.errorPage` through an inert `<script id="i18n-error" type="application/json">` block.

No visitor-facing copy in code: every `lang === "mne" ? … : …` is a smell. Locale-independent company facts (site URL, address, founding year, social links, "60+" figure) live in `src/lib/company.ts` and feed the JSON-LD, sitemap/robots and the assistant prompt.

### Assistant
`/api/chat` (`src/app/api/chat/route.ts`) proxies to Gemini. The system prompt (`src/lib/assistant.ts`) is built from the dictionary **plus** `src/lib/facts/{eng,mne}.json` (loaded by `src/lib/facts.ts`), the FACT BRIEF: verified company facts not rendered on any page (stats, services, delivered projects). Never add unverified products there (DotBond was removed for that reason); never financials or staff names. `ASSISTANT_ENABLED=0` (`src/lib/assistantFlag.ts`) hides the widget and refuses the route. The route logs one content-free audit line per request.

`npm run check` (`scripts/check-invariants.mjs`, also run in CI) fails if the two dictionaries' (or fact files') key trees differ, if a locale has no dictionary file, or if `MOTION_QUERY` drifts from the CSS gate.

### Page composition
`src/app/[lang]/page.tsx` is the homepage; `src/app/[lang]/expertise/[domain]/page.tsx` serves the four expertise-domain client pages (slugs come from `dict.expertise.items[].slug`; `sitemap.ts` and `generateStaticParams` both derive from it). `[lang]/layout.tsx` generates per-locale `Metadata` (title/OG/Twitter/JSON-LD `Organization` schema) and renders `SmoothScroll`, the `AssistantLoader` (lazy, idle-mounted `Assistant` chat widget), and the `grain-overlay` div as layout-level chrome. The homepage renders `Navbar`, then `Hero`, `Expertise`, `PinnedProcess`, then `Clients` (the full reference register grouped by the four expertise domains, reading `dict.expertise.items[].clients`) / `Technology` / `Security` / `Contact` each wrapped in `EdgeBeam` (an animated teal-hairline frame), then `Footer`. Shared presentation helpers (icon set, `Medallion`, `rev()`, `MOTION_QUERY`) live in `src/components/sections/visuals.tsx`.

### Animation
- GSAP-driven pinned/scroll animations live inside `Expertise` and `EdgeBeam`. Smooth scroll is provided globally by `src/components/providers/SmoothScroll.tsx` — GSAP ScrollTrigger work must integrate with Lenis rather than the native scroller.
- `Expertise` writes one scrubbed CSS variable per frame (`--xp`); its pinned/static variants are gated by the `.expertise-pinned` class in `globals.css`, whose media query must stay identical to `MOTION_QUERY`.

### Styling
Tailwind v4 is configured purely through `src/app/globals.css` (`@import "tailwindcss"` + `@theme` tokens). There is no `tailwind.config.{js,ts}` — add design tokens in `globals.css`. Fonts are wired via `next/font` in the root layout exposing `--font-sans-stack` / `--font-mono-stack` CSS variables.

### Path alias
`@/*` → `src/*` (see `tsconfig.json`).
