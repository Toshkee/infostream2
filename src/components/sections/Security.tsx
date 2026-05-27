"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import type { Dict } from "@/lib/dictionaries";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function Security({ dict }: { dict: Dict }) {
  const ref = useRef<HTMLDivElement>(null);

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
    },
    { scope: ref }
  );

  return (
    <section id="security" ref={ref} className="relative py-28 lg:py-36 bg-[var(--bg-elev)] overflow-hidden">
      <div className="relative z-10 mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid lg:grid-cols-12 gap-12">
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

          <div className="lg:col-span-7 sec-pillars grid sm:grid-cols-3 gap-4">
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
                {/* corner brackets — appear on hover */}
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
      </div>
    </section>
  );
}
