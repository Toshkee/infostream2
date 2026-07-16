"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, type ReactNode } from "react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Frames a section with a teal hairline:
 *  - top beam traces L→R as the section enters
 *  - corner ticks snap in the moment the top beam finishes
 *  - bottom beam traces R→L as the section is leaving the viewport
 */
export default function EdgeBeam({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const beamDuration = 1.1;

      gsap.fromTo(
        ".edge-beam-top",
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: beamDuration,
          ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start: "top 85%", once: true },
        }
      );

      gsap.fromTo(
        ".edge-tick",
        { opacity: 0, scale: 0.4 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.18,
          ease: "back.out(2.2)",
          stagger: 0.05,
          delay: beamDuration - 0.05,
          scrollTrigger: { trigger: ref.current, start: "top 85%", once: true },
        }
      );

      gsap.fromTo(
        ".edge-beam-bottom",
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: beamDuration,
          ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start: "bottom 75%", once: true },
        }
      );
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className="relative">
      {/* top beam — L→R */}
      <span
        aria-hidden
        className="edge-beam-top pointer-events-none absolute top-0 left-0 right-0 h-px origin-left z-10"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, var(--brand-teal-bright) 30%, var(--brand-teal-bright) 70%, transparent 100%)",
          boxShadow: "0 0 8px rgba(72,184,177,0.5)",
        }}
      />
      {/* corner ticks — snap in when the top beam lands. Visible by default;
         the fromTo below hides them just-in-time on motion-OK clients, so
         reduced-motion/no-JS visitors still get the full static frame. */}
      <span
        aria-hidden
        className="edge-tick pointer-events-none absolute top-0 left-0 h-2 w-2 border-t border-l border-[var(--brand-teal-bright)] z-10"
      />
      <span
        aria-hidden
        className="edge-tick pointer-events-none absolute top-0 right-0 h-2 w-2 border-t border-r border-[var(--brand-teal-bright)] z-10"
      />
      {/* bottom beam — R→L, draws as section is leaving */}
      <span
        aria-hidden
        className="edge-beam-bottom pointer-events-none absolute bottom-0 left-0 right-0 h-px origin-right z-10"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, var(--brand-teal-bright) 30%, var(--brand-teal-bright) 70%, transparent 100%)",
          boxShadow: "0 0 8px rgba(72,184,177,0.5)",
        }}
      />
      {children}
    </div>
  );
}
