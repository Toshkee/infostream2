"use client";

import dynamic from "next/dynamic";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, useState } from "react";
import CanvasErrorBoundary from "@/components/three/CanvasErrorBoundary";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { Dict } from "@/lib/dictionaries";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const ShieldScene = dynamic(() => import("@/components/three/ShieldScene"), {
  ssr: false,
  loading: () => null,
});

// Warm the ssr:false three.js chunk on the client right after hydration so the
// shield is compiled/fetched before the user scrolls here — mirrors PinnedHero's
// HeroScene warm. Same literal path so the bundler maps both to the one chunk.
if (typeof window !== "undefined") {
  void import("@/components/three/ShieldScene");
}

export default function Security({ dict }: { dict: Dict }) {
  const ref = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [buildProgress, setBuildProgress] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  useGSAP(
    () => {
      gsap.to(".sec-h2", {
        clipPath: "inset(0 0% 0 0)",
        duration: 1.2,
        ease: "power4.out",
        scrollTrigger: { trigger: ".sec-h2", start: "top 85%" },
      });

      gsap.fromTo(
        ".sec-pillar",
        { clipPath: "inset(0 0 100% 0)", opacity: 0, y: 30 },
        {
          clipPath: "inset(0 0 0% 0)",
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: { trigger: ".sec-pillars", start: "top 80%" },
        }
      );

      // Drive the shield build from scroll position over the stage element —
      // particles lock into the shield outline as the section scrolls past.
      if (stage.current) {
        ScrollTrigger.create({
          trigger: stage.current,
          start: "top 85%",
          end: "bottom 30%",
          scrub: 0.5,
          onUpdate: (self) => setBuildProgress(self.progress),
        });
      }
    },
    { scope: ref }
  );

  return (
    <section id="security" ref={ref} className="relative py-28 lg:py-36 bg-[var(--bg-elev)] overflow-hidden">
      <div className="relative z-10 mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 sec-heading">
            <div className="mono text-[11px] tracking-[0.25em] uppercase text-[var(--brand-teal)] flex items-center gap-2">
              <span className="h-px w-6 bg-[var(--brand-teal)]" />
              {dict.security.eyebrow}
            </div>
            <h2 className="sec-h2 mask-reveal mt-5 text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.05] tracking-[-0.02em] font-medium">
              {dict.security.title}
            </h2>
            <p className="mt-6 text-[var(--fg-dim)] leading-relaxed max-w-md">
              {dict.security.body}
            </p>
          </div>

          {/* 3D shield — assembles from particles as you scroll. */}
          <div ref={stage} className="lg:col-span-7 relative h-[420px] lg:h-[520px]">
            {!reducedMotion && (
              <CanvasErrorBoundary>
                <ShieldScene progress={buildProgress} />
              </CanvasErrorBoundary>
            )}
          </div>
        </div>

        <div className="sec-pillars grid sm:grid-cols-3 gap-4 mt-16">
          {dict.security.pillars.map((p, i) => (
            <div
              key={i}
              className="sec-pillar group relative bg-[var(--bg)] border hairline rounded-xl p-6 hover:border-[var(--brand-teal)] hover:-translate-y-1 transition-all duration-300"
            >
              <div className="mono text-[10px] tracking-[0.22em] uppercase text-[var(--brand-teal)]">
                {p.k}
              </div>
              <p className="mt-4 text-[var(--fg)] leading-relaxed text-[15px]">{p.v}</p>
              <span className="absolute top-5 right-5 h-1.5 w-1.5 rounded-full bg-[var(--brand-teal)] opacity-60 group-hover:opacity-100 transition-opacity" />
              <span
                aria-hidden
                className="pointer-events-none absolute top-2 left-2 h-3 w-3 border-t border-l border-[var(--brand-teal)] opacity-0 -translate-x-1 -translate-y-1 group-hover:opacity-90 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b border-r border-[var(--brand-teal)] opacity-0 translate-x-1 translate-y-1 group-hover:opacity-90 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
