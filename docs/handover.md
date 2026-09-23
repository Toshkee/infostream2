# Developer and hosting handover

Everything a developer or host needs to run, change and deploy the Infostream
website. The company-facing overview is in the repository README.

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
| `CHAT_DAILY_MAX` | no       | Ceiling on upstream Gemini calls per UTC day, per process (default 1500). Best-effort; the real cap is the quota on the key. |

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
   file inside the repo, and **cap what it can spend**. Everything in the app
   (nginx `limit_req`, the per-IP window, `CHAT_DAILY_MAX`) is best-effort and
   resets when the process restarts, so the only real stop is on Google's side:
   - In Google Cloud Console, pick the project the key belongs to, then
     **Billing → Budgets & alerts → Create budget**. Scope it to that project,
     set a monthly amount you would not mind losing, and tick the alert
     thresholds (50/90/100%).
   - A budget only *notifies*. To make it actually stop, go to
     **APIs & Services → Generative Language API → Quotas**, and lower
     *Generate requests per minute/day* to a number this site could never
     legitimately exceed. That is the hard ceiling.
   - Restrict the key itself under **APIs & Services → Credentials**: limit it
     to the Generative Language API only. Leave the referrer/IP restriction
     off — the key is used server-side from the VPS, so an IP restriction set
     to the VPS address is the useful one if you want a second lock.
   - Keep a separate key for local development so revoking one never takes the
     site down.
5. Run one process (the in-memory limiter is per process). If you scale to
   several, the proxy-level limit from step 3 is the one that counts.

**VPS setup (the production target).** Ready-made files live in `deploy/`.
They assume a Linux VPS with systemd, nginx, Node 20+ and git, and about 2 GB
of RAM (or RAM + swap) for the build. `deploy.sh` checks both before it
fetches anything and tells you how to add swap if the box is short; a build
that runs out of memory is killed by the kernel with a bare `Killed` and no
other explanation.

**Cloudflare.** `infostream.co.me` resolves to Cloudflare addresses and its
nameservers are Cloudflare's, so requests reach nginx from a Cloudflare edge,
not from the visitor. `deploy/nginx.conf` therefore trusts `CF-Connecting-IP`
from Cloudflare's published ranges; without that block every visitor shares a
handful of buckets and both rate limits become meaningless. If the proxy is
ever turned off for this record, delete that block. Note also that Cloudflare
is a shared cache sitting in front of a site whose HTML carries a long
`s-maxage`: do not enable a "Cache Everything" page rule for this host unless
you are prepared to purge the cache on every deploy.

**HSTS.** The app sends `Strict-Transport-Security` for **this host only**.
`includeSubDomains` is deliberately absent because `vpn.infostream.co.me`
answers on plain HTTP and has no TLS listener at all — with the directive, any
browser that had loaded the main site would refuse to open the VPN portal for
the next two years. HSTS cannot be recalled once sent; a browser honours it
until the max-age runs out or the same host serves `max-age=0`. Add
`; includeSubDomains` back in `next.config.ts` only once every subdomain
terminates TLS.

1. Create the user and folder:
   `sudo useradd --system --create-home infostream && sudo mkdir -p /srv/infostream && sudo chown infostream: /srv/infostream`
2. Copy `deploy/deploy.sh` to `/srv/infostream/deploy.sh`.
3. Copy `deploy/infostream.env.example` to `/etc/infostream.env`, fill in
   `GEMINI_API_KEY`, then `sudo chown root:infostream /etc/infostream.env && sudo chmod 640 /etc/infostream.env`.
4. Install `deploy/infostream.service` into `/etc/systemd/system/` and run
   `sudo systemctl daemon-reload && sudo systemctl enable infostream`.
5. Let the deploy user restart the service without a password
   (`sudo visudo -f /etc/sudoers.d/infostream`):
   `infostream ALL=NOPASSWD: /usr/bin/systemctl restart infostream`
6. As `infostream`, run `/srv/infostream/deploy.sh`. It builds into
   `releases/<timestamp>-<commit>`, flips the `current` symlink, restarts and
   smoke-tests the app on `127.0.0.1:3000`. It keeps the last three releases.
7. Install `deploy/nginx.conf` as the site config. It `include`s certbot's
   managed TLS profile, so run certbot before the first `nginx -t`. If the old site answers for
   `infostream.co.me` on the same VPS, disable its server block in the same
   step. Then `sudo nginx -t && sudo systemctl reload nginx`. If the VPS has
   no certificate yet, run, with only the port 80 block enabled first:

   ```bash
   sudo certbot certonly --webroot -w /var/www/html \
     -d infostream.co.me -d www.infostream.co.me \
     --deploy-hook "systemctl reload nginx"
   ```

   **The `--deploy-hook` is not optional.** `certonly` installs no nginx
   plugin, so certbot renews the certificate on disk and nginx keeps serving
   the one it loaded at startup. Everything looks fine for 90 days and then
   the site goes down with an expired certificate. The hook is stored in the
   renewal config, so it applies to every future renewal. On an existing
   certificate, add it with
   `sudo certbot renew --deploy-hook "systemctl reload nginx" --force-renewal`
   once, or edit `/etc/letsencrypt/renewal/infostream.co.me.conf` by hand.
   Confirm the renewal timer is active: `systemctl list-timers | grep certbot`.
8. **Set Cloudflare's SSL/TLS mode to "Full (strict)"** for this domain
   (Cloudflare dashboard → SSL/TLS → Overview). On "Flexible", Cloudflare
   talks plain HTTP to the origin, the port 80 block above answers with a
   redirect to HTTPS, Cloudflare follows it back to itself and the site dies
   in a redirect loop — `ERR_TOO_MANY_REDIRECTS`, with nothing wrong in the
   nginx logs. "Full (strict)" also requires the origin certificate from step
   7 to be valid, which it is. If certbot's HTTP-01 challenge fails while the
   record is proxied, either turn off "Always Use HTTPS" in Cloudflare for the
   duration or pause the proxy (grey cloud) until the certificate is issued.

Every later release is step 6 again. To roll back, point `current` at an
older folder in `releases/` and restart the service. Logs, including the
assistant's one-line audit entries, are in `journalctl -u infostream`.

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

**Images and `sharp`.** `next/image` optimises at runtime and needs the native
`sharp` library. It is declared in `package.json`, but its prebuilt binaries
are platform-specific and npm treats them as optional — a host where they fail
to install produces a working build whose every image 500s. `deploy.sh` asks
the optimizer for one real image before it calls a release good, so this fails
at deploy time rather than in front of a visitor.
