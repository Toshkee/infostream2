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
   long flick interrupted by a stall looks like a settled scroll and gets
   acted on from a stale position. */
export function isScrollSettled() {
  if (!activeLenis) return true;
  return Math.abs(activeLenis.targetScroll - activeLenis.animatedScroll) < 1;
}

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Expertise subpages are short static documents, while the homepage's
  // scroll-scrubbed interaction is desktop-only. Both are more reliable with
  // native touch scrolling, so Lenis is reserved for desktop homepages.
  const nativeScroll = pathname.includes("/expertise/");

  useEffect(() => {
    if (nativeScroll) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const mobile = window.matchMedia("(max-width: 1023px)").matches;
    if (mobile) return;

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
    // lagSmoothing(0). It prevents a long main-thread stall from dumping its whole
    // accumulated delta into the next scrubbed frame. The 500ms threshold never
    // trips during normal 16–33ms frames, so Lenis stays in sync in regular use.
    gsap.ticker.lagSmoothing(500, 33);

    return () => {
      gsap.ticker.remove(raf);
      activeLenis = null;
      lenis.destroy();
    };
  }, [nativeScroll]);

  return <>{children}</>;
}
