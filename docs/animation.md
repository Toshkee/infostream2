# Animation and scroll contract

The homepage mixes Lenis smooth scrolling with GSAP ScrollTrigger pins. That
combination works, but only if every piece respects the rules below. Each
rule exists because breaking it produced a visible bug at some point.

## 1. Lenis owns the scroll position (desktop only)

`src/components/providers/SmoothScroll.tsx` creates one Lenis instance on the
homepage for viewports of 1024px and wider that do not prefer reduced motion.
It drives `scrollTop` from its own rAF loop, so a native `window.scrollTo`
gets reverted within a frame and looks like a no-op.

- To move the page programmatically, call `smoothScrollTo(y)` from
  `SmoothScroll.tsx`. It routes through Lenis when Lenis is active and falls
  back to native scrolling otherwise (mobile, reduced motion, expertise pages).
- To ask "has the scroll finished?", use `isScrollSettled()`. Lenis emits no
  scroll events while the main thread is stalled, so a settled-looking
  position may still be mid-flight.
- The expertise subpages (`/[lang]/expertise/*`) opt out of Lenis entirely and
  use native scrolling.

## 2. ScrollTrigger must be fed by Lenis

`SmoothScroll.tsx` wires `lenis.on("scroll", ScrollTrigger.update)` and runs
Lenis inside `gsap.ticker`. Do not add a second rAF loop or call
`ScrollTrigger.update` elsewhere.

GSAP's lag smoothing stays at `lagSmoothing(500, 33)`. The common Lenis recipe
sets it to 0, which lets a long main-thread stall dump its whole accumulated
delta into one scrubbed frame. Leave it on.

## 3. Never use ScrollTrigger's built-in `snap` on the pins

Its tween drives the native scroller, which Lenis then reverts, so the pin
lands visibly offset. Stop snapping is implemented in `src/lib/scrollSnap.ts`
(`attachStopSnap`), which waits for `isScrollSettled()` and moves through
`smoothScrollTo`.

## 4. Scrubbed scenes are pure functions of scroll progress

`Expertise` writes one CSS variable per frame (`--xp`) and everything inside
the pin derives from it via `rev()` in `visuals.tsx`. Do not animate elements
inside a pinned scene with time-based GSAP tweens: a `lagSmoothing` skip or an
occluded-tab rAF freeze can strand them mid-tween. Reveals that are not
scroll-scrubbed use `maskReveal()` in `src/lib/maskReveal.ts`, which is a CSS
transition and cannot be stranded.

## 5. One media query gates the pinned variant, in two files

`MOTION_QUERY` in `src/components/sections/visuals.tsx` decides in JS whether
to build the pinned scenes. The `@media` block around `.expertise-pinned` in
`src/app/globals.css` decides in CSS which variant is visible. They must be
byte-identical or one variant renders without its behaviour (or both render).

`npm run check` fails when they drift. Change both or neither.

## 6. Node count must match scene count

In the pinned sections the number of data nodes must equal the number of
scenes (stops). A mismatch makes the dust-cloud transition white out.

## 7. Reduced motion

Every animated component reads `usePrefersReducedMotion()` (or the media
query directly) and settles to its final state immediately. Test any new
animation with reduced motion enabled before shipping.

## Debugging notes

- In `next dev`, the first load of the process section can stutter for a few
  seconds while the on-demand chunk compiles. This does not happen in
  production builds.
- If a CSS edit "does not show up", check the served stylesheet first; the dev
  server can serve a stale `globals.css`. A real byte change forces a rebuild
  (`touch` does not).
- Weird V8 "deserialization" or OOM crashes from `next dev` mean a corrupt
  `.next` cache. Delete `.next` and restart.
