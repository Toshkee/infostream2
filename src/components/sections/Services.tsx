"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { Dict } from "@/lib/dictionaries";
import { SERVICES_ART } from "./servicesArt";

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, useGSAP);

export default function Services({ dict }: { dict: Dict }) {
  const s = dict.services;
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      gsap.to(".srv-h2", {
        clipPath: "inset(0 0% 0 0)",
        duration: 1.1,
        ease: "power4.out",
        scrollTrigger: { trigger: ".srv-h2", start: "top 85%" },
      });

      const rows = gsap.utils.toArray<HTMLElement>(".srv-row");

      if (reduced) {
        gsap.set(".svc-draw", { drawSVG: "100%" });
        gsap.set([".svc-pulse", ".srv-copy > *"], { opacity: 1, x: 0, y: 0 });
        return;
      }

      rows.forEach((row) => {
        const draws = row.querySelectorAll<SVGElement>(".svc-draw");
        const pulses = row.querySelectorAll<SVGElement>(".svc-pulse");
        const floats = row.querySelectorAll<SVGElement>(".svc-float");
        const copy = row.querySelectorAll<HTMLElement>(".srv-copy > *");
        const flip = row.dataset.flip === "1";

        gsap.set(draws, { drawSVG: "0%" });
        gsap.set(pulses, { opacity: 0, transformOrigin: "center" });

        const tl = gsap.timeline({ scrollTrigger: { trigger: row, start: "top 78%" } });
        tl.from(copy, { opacity: 0, x: flip ? 28 : -28, duration: 0.7, ease: "power3.out", stagger: 0.08 }, 0)
          .to(draws, { drawSVG: "100%", duration: 1, stagger: 0.03, ease: "power2.out" }, 0.15)
          .to(pulses, { opacity: 1, duration: 0.4, stagger: 0.06, ease: "power2.out" }, "-=0.4");

        pulses.forEach((p, i) => {
          gsap.to(p, {
            scale: 1.7, opacity: 0.35, duration: 1.2 + i * 0.25, ease: "sine.inOut",
            repeat: -1, yoyo: true, delay: 1.2 + i * 0.18, transformOrigin: "center",
          });
        });
        floats.forEach((g, i) => {
          gsap.to(g, { y: 5, duration: 2.6 + i * 0.5, ease: "sine.inOut", repeat: -1, yoyo: true, delay: 0.6 });
        });
      });
    },
    { scope: ref, dependencies: [reduced] }
  );

  return (
    <section
      id="services"
      ref={ref}
      className="relative bg-[var(--bg-inset)] text-white py-24 lg:py-32 overflow-hidden"
    >
      {/* Grid backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at center, black 35%, transparent 80%)",
        }}
      />

      <div className="relative mx-auto max-w-[1280px] px-6 lg:px-10">
        {/* Heading */}
        <div className="max-w-2xl">
          <div className="mono text-[11px] tracking-[0.25em] uppercase text-[var(--brand-teal-bright)]">
            {s.eyebrow}
          </div>
          <h2 className="srv-h2 mask-reveal mt-5 text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.05] tracking-[-0.02em] font-medium">
            {s.title}
          </h2>
          <p className="mt-6 text-white/65 leading-relaxed max-w-md text-[15.5px]">{s.body}</p>
        </div>

        {/* Alternating editorial rows */}
        <div className="mt-16 lg:mt-24 flex flex-col gap-20 lg:gap-28">
          {s.items.map((it, i) => {
            const flip = i % 2 === 1;
            return (
              <div
                key={i}
                data-flip={flip ? "1" : "0"}
                className="srv-row relative grid items-center gap-8 lg:grid-cols-12 lg:gap-12"
              >
                {/* Illustration — large, floating on a soft spotlight (no card) */}
                <div className={`relative lg:col-span-7 ${flip ? "lg:order-2" : "lg:order-1"}`}>
                  <div className="relative mx-auto w-full max-w-[460px]">
                    {/* spotlight glow */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          "radial-gradient(circle at 50% 45%, rgba(72,184,177,0.13), transparent 62%)",
                      }}
                    />
                    {/* faint framing ring (not a box) */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 aspect-square w-[78%] rounded-full border border-white/[0.06]"
                    />
                    <svg
                      viewBox="0 0 240 180"
                      className="relative w-full h-auto"
                      role="img"
                      aria-label={it.k}
                      dangerouslySetInnerHTML={{ __html: SERVICES_ART[i] ?? "" }}
                    />
                  </div>
                </div>

                {/* Copy */}
                <div className={`srv-copy lg:col-span-5 ${flip ? "lg:order-1" : "lg:order-2"}`}>
                  <h3 className="font-medium leading-tight tracking-[-0.02em] text-[clamp(1.55rem,3vw,2.35rem)]">
                    {it.k}
                  </h3>
                  <p className="mt-4 max-w-md text-white/65 leading-relaxed text-[15.5px]">{it.v}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
