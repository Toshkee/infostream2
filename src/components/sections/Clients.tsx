"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import type { Dict } from "@/lib/dictionaries";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function Clients({ dict }: { dict: Dict }) {
  const ref = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);

  // Scroll-velocity skew on the marquee
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let last = window.scrollY;
    let raf = 0;
    let skew = 0, targetSkew = 0;
    const tick = () => {
      const cur = window.scrollY;
      const v = cur - last;
      last = cur;
      targetSkew = Math.max(-12, Math.min(12, v * 0.25));
      skew += (targetSkew - skew) * 0.12;
      if (marqueeRef.current) {
        marqueeRef.current.style.transform = `skewY(${skew.toFixed(2)}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useGSAP(
    () => {
      gsap.to(".clients-h2", {
        clipPath: "inset(0 0% 0 0)",
        duration: 1.2,
        ease: "power4.out",
        scrollTrigger: { trigger: ".clients-h2", start: "top 85%" },
      });

      gsap.utils.toArray<HTMLElement>(".client-row").forEach((el, i) => {
        gsap.from(el, {
          opacity: 0,
          x: -30,
          duration: 0.7,
          ease: "power3.out",
          delay: i * 0.06,
          scrollTrigger: { trigger: el, start: "top 90%" },
        });
      });

      gsap.fromTo(
        ".clients-eyebrow-dash",
        { width: 0 },
        {
          width: "3.5rem",
          duration: 1.1,
          ease: "power3.out",
          scrollTrigger: { trigger: ".clients-heading", start: "top 85%" },
        }
      );
    },
    { scope: ref }
  );

  const marqueeRow = [...dict.clients.list, ...dict.clients.list];

  return (
    <section id="clients" ref={ref} className="relative py-28 lg:py-36 bg-[var(--bg-inset)] text-white overflow-hidden">
      {/* decorative grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="clients-heading">
          <div className="mono text-[11px] tracking-[0.25em] uppercase text-[var(--brand-teal-bright)] flex items-center gap-2">
            <span className="clients-eyebrow-dash h-px w-6 bg-[var(--brand-teal-bright)]" />
            {dict.clients.eyebrow}
          </div>
          <h2 className="clients-h2 mask-reveal mt-5 text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.05] tracking-[-0.02em] font-medium max-w-3xl">
            {dict.clients.title}
          </h2>
        </div>

        <ul className="mt-14 divide-y divide-white/10 border-y border-white/10">
          {dict.clients.list.map((name, i) => (
            <li key={i} className="client-row relative flex items-baseline justify-between py-5 lg:py-6 group cursor-default overflow-hidden">
              {/* hover line-fill — sweeps in from the left */}
              <span
                aria-hidden
                className="pointer-events-none absolute left-0 bottom-0 h-px w-full origin-left scale-x-0 bg-[var(--brand-teal-bright)] transition-transform duration-500 ease-out group-hover:scale-x-100"
              />
              <span className="flex items-baseline gap-5">
                <span className="text-2xl lg:text-3xl tracking-[-0.01em] text-white group-hover:text-[var(--brand-teal-bright)] group-hover:translate-x-2 transition-all duration-300">
                  {name}
                </span>
              </span>
              <span className="mono text-[11px] tracking-[0.22em] uppercase text-white/30 hidden md:inline">
                client · MNE
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* infinite marquee (skews on scroll velocity) */}
      <div ref={marqueeRef} className="relative mt-20 border-y border-white/10 py-6 overflow-hidden transition-transform">
        <div className="marquee-inner inline-flex whitespace-nowrap gap-12">
          {marqueeRow.map((n, i) => (
            <span key={i} className="mono text-[11px] tracking-[0.3em] uppercase text-white/40 flex items-center gap-12">
              {n}
              <span className="inline-block h-1 w-1 rounded-full bg-[var(--brand-red)]" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
