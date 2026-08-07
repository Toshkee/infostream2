"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* Lenis owns the scroll position while it runs: it writes scrollTop from its
   own rAF loop, so a native `window.scrollTo` (smooth or not) gets reverted
   within a frame. Anything that wants to move the page programmatically has
   to go through Lenis — hence this module-level handle. Null on the routes
   that opt out of Lenis (the expertise subpages) and under reduced motion,
   where native scrolling is the real scroller. */
let activeLenis: Lenis | null = null;

/** Scroll the page to `y`, through Lenis when it is the active scroller. */
export function smoothScrollTo(y: number, duration = 0.6) {
  if (activeLenis) activeLenis.scrollTo(y, { duration });
  else window.scrollTo({ top: y, behavior: "smooth" });
}

/* True once Lenis has arrived at its target. Lenis emits no scroll events
   while the main thread is stalled, so anything that waits for "scrolling
   stopped" has to ask whether travel is actually finished — otherwise a
   long flick interrupted by a stall (the cold-load three.js compile that
   lagSmoothing below exists to absorb) looks like a settled scroll and gets
   acted on from a stale position. */
export function isScrollSettled() {
  if (!activeLenis) return true;
  return Math.abs(activeLenis.targetScroll - activeLenis.animatedScroll) < 1;
}

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The expertise subpages are short static documents (often barely taller
  // than the viewport) with no scroll-scrubbed animation. Lenis easing there
  // reads as broken — a wheel flick glides for ~a second and dead-stops at
  // the bottom — so those routes get native scroll; the homepage keeps Lenis
  // for the pinned ScrollTrigger scrub feel.
  const nativeScroll = pathname.includes("/expertise/");

  useEffect(() => {
    if (nativeScroll) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
    });

    activeLenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(raf);
    // Keep GSAP's default lag smoothing on, rather than the usual Lenis recipe's
    // lagSmoothing(0). A one-off main-thread stall on cold load — the lazy three.js
    // chunk compiling/parsing + the first WebGL frame warming up — otherwise dumps
    // its whole accumulated delta into the next scrubbed frame, which reads as the
    // scroll lurching past the pinned process section instead of scrubbing it. The
    // 500ms threshold only ever fires on exactly such a catastrophic stall; normal
    // 16–33ms frames never trip it, so Lenis stays perfectly synced in regular use.
    gsap.ticker.lagSmoothing(500, 33);

    return () => {
      gsap.ticker.remove(raf);
      activeLenis = null;
      lenis.destroy();
    };
  }, [nativeScroll]);

  return <>{children}</>;
}
