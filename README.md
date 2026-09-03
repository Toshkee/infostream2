# Infostream website

Company website for Infostream (Podgorica, Montenegro): a bilingual marketing
site with a small AI assistant. Built with Next.js 16 (App Router), React 19,
TypeScript, Tailwind CSS v4, GSAP and Lenis.

## Requirements

- Node.js 20 or newer (`.nvmrc` pins 20)
- npm (a `package-lock.json` is committed; use `npm ci` for reproducible installs)

## Development

```bash
npm ci
cp .env.example .env.local   # then fill in GEMINI_API_KEY
npm run dev                  # http://localhost:3000 → redirects to /eng
```

| Script              | What it does                                                  |
| ------------------- | ------------------------------------------------------------- |
| `npm run dev`       | Dev server with hot reload                                    |
| `npm run build`     | Production build into `.next/`                                |
| `npm run start`     | Serve the production build                                    |
| `npm run lint`      | ESLint                                                        |
| `npm run typecheck` | Generates Next's route types, then TypeScript with no emit    |
| `npm run check`     | Repo invariants: dictionary parity, motion query, locale list |
| `npm run verify`    | lint + check + typecheck + build, the same as CI              |

GitHub Actions runs `verify` on every push and pull request
(`.github/workflows/ci.yml`).

## Where things live

| You want to change…                          | Edit                                                    |
| -------------------------------------------- | ------------------------------------------------------- |
| Any visible text, in either language         | `src/lib/dict/eng.json` and `src/lib/dict/mne.json`     |
| Company facts (address, founding year, links) | `src/lib/company.ts`                                    |
| Locales, `<html lang>`, hreflang codes       | `src/lib/locales.ts`                                    |
| Client logos                                 | `public/clients/` plus `FEATURED_ASSETS` in `Clients.tsx` |
| Design tokens, fonts, keyframes              | `src/app/globals.css`                                   |
| What the assistant knows (fact brief)        | `src/lib/facts/eng.json` and `src/lib/facts/mne.json`   |
| The assistant's rules and prompt             | `src/lib/assistant.ts`                                  |
| Security headers / CSP                       | `next.config.ts`                                        |

The assistant answers from two sources: the page copy in the dictionaries and
the fact brief in `src/lib/facts/`, which holds verified company facts that
are not shown on any page (services, key figures, delivered projects). Only
put verifiable facts there; never financials or staff names. The route logs
one line per request (locale, turn count, sizes, latency) and no message
content.

The two dictionaries, and the two fact files, must have identical key trees.
`npm run check` enforces this. Edit them with a UTF-8-aware editor; never run `sed`/`perl -pi` over
them (that has corrupted the Montenegrin file before).

Routes: `/eng` and `/mne` (homepage), `/eng/expertise/{finance,hr,dms,healthcare}`
(one page per expertise domain, slugs come from the dictionary), `/api/chat`
(the assistant). Everything else 404s with a branded page.

Read `docs/animation.md` before touching anything that scrolls or animates.

## Environment variables

| Variable         | Required | Purpose                                                     |
| ---------------- | -------- | ----------------------------------------------------------- |
| `GEMINI_API_KEY` | yes      | Google AI Studio key for the assistant. Server-only.        |
| `GEMINI_MODEL`   | no       | Override the primary model (default `gemini-2.5-flash`).    |
| `ASSISTANT_ENABLED` | no    | `0` removes the chat widget and refuses `/api/chat`. Rebuild after changing it. |
| `TRUSTED_PROXY`  | no       | `1` enables per-IP rate limiting on `/api/chat`. Set it only when a proxy you control sets `x-real-ip`. See step 2 below. |
| `CHAT_DEBUG`     | no       | `1` returns upstream error detail to the browser. Dev only. |

Without `GEMINI_API_KEY` the site builds and runs; only the assistant replies
with "not configured".

## Hosting handover

The site is a standard Next.js app with one server route (`/api/chat`) and
server-generated Open Graph images, so it needs a Node runtime. A pure static
export is not possible without dropping the assistant.

**Option A: any Node host (VPS, Docker, Railway, Render, Fly, etc.)**

```bash
npm ci
npm run build
NODE_ENV=production GEMINI_API_KEY=… npm run start   # listens on :3000
```

Put it behind a reverse proxy that terminates HTTPS (nginx, Caddy, the
platform's load balancer). Checklist:

1. **HTTPS is mandatory.** In production the app sends HSTS and
   `upgrade-insecure-requests`; over plain HTTP the page will break.
2. **Forward the real client IP, then set `TRUSTED_PROXY=1`.** The chat route
   ignores `x-real-ip` and `x-forwarded-for` unless `TRUSTED_PROXY=1`, because
   a client can forge either header and buy itself a fresh per-IP budget on
   every request. So:
   - Make the proxy set the header itself and strip any incoming value. nginx:
     `proxy_set_header X-Real-IP $remote_addr;`
   - Only then set `TRUSTED_PROXY=1` on the app.

   Leave it unset and the route simply does not rate-limit per IP; the
   aggregate ceiling (240 requests/minute across all callers) still applies.
   That is the safe default, not a working configuration: without step 2 a
   single abuser is capped only by that shared ceiling.
3. **Rate-limit `/api/chat` at the proxy.** The app's own limiter is
   in-memory per process and resets on every restart; it is a soft guard, not
   a quota. Something like nginx `limit_req` (a few requests per second per
   IP) protects the Gemini key from running up a bill.
4. **Set `GEMINI_API_KEY`** as an environment variable on the host, never in a
   file inside the repo.
5. Run one process (the in-memory limiter is per process). If you scale to
   several, the proxy-level limit from step 3 is the one that counts.

**Option B: Vercel**

Connect the GitHub repository, set `GEMINI_API_KEY` and `TRUSTED_PROXY=1` in
the project's environment variables, deploy. Vercel overwrites `x-real-ip`
with a value the caller cannot control, which is exactly the condition
`TRUSTED_PROXY` asks about, so step 1 and the proxy half of step 2 are handled
for you. For step 3, enable a WAF rate-limit rule on `/api/chat` or accept
that the in-app limiter is per-instance.

**Domain.** All canonical URLs, sitemap entries and the JSON-LD point at
`https://infostream.co.me` (see `src/lib/company.ts`). Change it there if the
site is served from a different hostname.

**Before go-live.** Open `/eng`, `/mne`, one expertise page, a nonsense URL
(should be a branded 404), and send one message to the assistant. Check the
site on a phone: below 1024px the homepage uses its static, non-pinned
layout.

## Repository layout

```
src/app/[lang]/                 pages, layout, metadata, error and 404 boundaries
src/app/api/chat/route.ts       assistant endpoint (validates, rate-limits, proxies to Gemini)
src/components/sections/        homepage sections
src/components/layout/          Navbar, Footer
src/components/providers/       SmoothScroll (Lenis + ScrollTrigger wiring)
src/lib/dict/                   eng.json, mne.json — all copy
src/lib/                        locales, company facts, dictionary loader, assistant prompt
src/proxy.ts                    locale redirect (Next 16's replacement for middleware.ts)
scripts/check-invariants.mjs    repo guards run by `npm run check`
docs/animation.md               scroll/animation contract
```
