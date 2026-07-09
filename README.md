# Infostream — company website

Marketing site for Infostream, built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, GSAP, and React Three Fiber.

## Getting started

```bash
npm install
npm run dev      # dev server at http://localhost:3000
```

Other commands:

```bash
npm run build    # production build
npm run start    # serve the production build
npm run lint     # ESLint
```

There is no test runner configured.

## Project tour

The whole site is a single page, rendered in two languages. Start here:

- **`src/app/[lang]/page.tsx`** — the only route. It reads like a table of contents: it loads the dictionary for the current language and stacks the section components in order. If you're looking for a specific part of the page, this file tells you which component it is.
- **`src/components/sections/`** — the page blocks, one file per section (`PinnedHero`, `Projects`, `Clients`, `Technology`, `Security`, `Stats`, `Contact`). Most content/markup changes happen here.
- **`src/components/layout/`** — site chrome: `Navbar`, `Footer`, `ScrollProgress`.
- **`src/components/three/`** — the 3D hero scene (`HeroScene.tsx`, React Three Fiber). Loaded client-side only and driven by scroll progress passed down from `PinnedHero`. This and `PinnedHero.tsx` are the densest code in the repo — expect GSAP ScrollTrigger and shader-ish material work.
- **`src/components/providers/SmoothScroll.tsx`** — Lenis smooth scrolling, wrapped around the whole app in the layout. Any new ScrollTrigger work must play nicely with Lenis rather than the native scroller.
- **`src/components/`** (root) — small standalone components: `Assistant` (chat widget, backed by `src/app/api/chat/route.ts`), `EdgeBeam`, `TechLogos`.
- **`src/hooks/`** — shared hooks (`useInView`, `usePrefersReducedMotion`).
- **`src/lib/`** — non-component code. Most importantly **`dict/eng.json` and `dict/mne.json`: all user-facing text lives in these two files.** To change wording, edit both. `dictionaries.ts` is the loader; keep its locale list in sync with `src/proxy.ts`.
- **`src/app/globals.css`** — all Tailwind v4 configuration and design tokens (`@theme`). There is intentionally no `tailwind.config` file.
- **`public/projects/`** — the project showcase videos and their poster images.

### Editing text / translations

Every visible string comes from `src/lib/dict/eng.json` (English) and `src/lib/dict/mne.json` (Montenegrin). The two files share the same structure; components are typed against it, so a missing key fails the build. **Careful with encoding:** the Montenegrin file contains non-ASCII characters — edit it with a UTF-8-aware editor, not stream tools like `sed`/`perl -pi`, which have corrupted it before.

## Heads up: this is Next.js 16

Some conventions differ from older Next.js versions you may know (framework docs ship in `node_modules/next/dist/docs/`):

- **`src/proxy.ts` is what used to be `middleware.ts`.** It exports `proxy(request)` and handles the `/` → `/<defaultLocale>` redirect.
- **Route params are async.** Pages and layouts receive typed props via generated globals (`PageProps<'/[lang]'>`) and must `await params` before reading values.

## Internationalization

Routes live under a single dynamic segment: `/eng` and `/mne`. The locale list is declared in two places that must stay in sync: `src/lib/dictionaries.ts` and `src/proxy.ts`. Pages fetch the dictionary once on the server and pass `dict` down as props.
