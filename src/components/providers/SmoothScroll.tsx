"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
    });

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
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
