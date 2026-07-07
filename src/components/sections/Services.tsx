"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import type { Dict } from "@/lib/dictionaries";
import { SERVICES_ART } from "./servicesArt";

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, useGSAP);

// Must be the exact string the CSS gate in globals.css uses
// (.services-pinned / .services-static) — the pinned variant displays iff this
// matches, so the pin always has its JS. Phones and reduced-motion visitors get
// the static stacked variant, which needs no JS at all.
const MOTION_QUERY =
  "(prefers-reduced-motion: no-preference) and (min-width: 1024px) and (min-height: 500px)";

export default function Services({ dict }: { dict: Dict }) {
  const s = dict.services;
  const ref = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      // Mirrors the CSS gate: these triggers exist exactly while the pinned
      // variant is displayed; gsap.matchMedia reverts them if that changes.
      mm.add(MOTION_QUERY, () => {
        const pinEl = pin.current;
        const trackEl = track.current;
        if (!pinEl || !trackEl) return;

        gsap.to(".srv-h2", {
          clipPath: "inset(0 0% 0 0)",
          duration: 1.1,
          ease: "power4.out",
          scrollTrigger: { trigger: pinEl, start: "top 75%" },
        });

        // Art draws in once as the section approaches, so the first panels are
        // settled by pin start and the far ones long before they scroll in.
        const draws = pinEl.querySelectorAll<SVGElement>(".svc-draw");
        const pulses = pinEl.querySelectorAll<SVGElement>(".svc-pulse");
        const floats = pinEl.querySelectorAll<SVGElement>(".svc-float");
        gsap.set(draws, { drawSVG: "0%" });
        gsap.set(pulses, { opacity: 0, transformOrigin: "center" });
        gsap
          .timeline({ scrollTrigger: { trigger: pinEl, start: "top 70%", once: true } })
          .to(draws, { drawSVG: "100%", duration: 1.4, ease: "power2.out", stagger: 0.012 })
          .to(pulses, { opacity: 1, duration: 0.5, stagger: 0.04 }, "-=0.6");

        pulses.forEach((p, i) => {
          gsap.to(p, {
            scale: 1.7, opacity: 0.35, duration: 1.2 + (i % 4) * 0.25, ease: "sine.inOut",
            repeat: -1, yoyo: true, delay: 1.6 + (i % 5) * 0.18, transformOrigin: "center",
          });
        });
        floats.forEach((g, i) => {
          gsap.to(g, { y: 5, duration: 2.6 + (i % 3) * 0.5, ease: "sine.inOut", repeat: -1, yoyo: true, delay: 0.6 });
        });

        // The pin: vertical scroll scrubs the track sideways, 1:1 with the
        // horizontal overflow, so the scroll distance always matches the content.
        const dist = () => Math.max(trackEl.scrollWidth - pinEl.clientWidth, 1);
        gsap
          .timeline({
            scrollTrigger: {
              trigger: pinEl,
              start: "top top",
              end: () => "+=" + dist(),
              pin: pinEl,
              pinSpacing: true,
              scrub: 0.6,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          })
          .to(trackEl, { x: () => -dist(), ease: "none" }, 0)
          .to(".srv-progress", { scaleX: 1, ease: "none" }, 0);
      });
    },
    { scope: ref }
  );

  const backdrop = (
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
  );

  return (
    <section id="services" ref={ref} className="relative bg-[var(--bg-inset)] text-white">
      {/* ════ Pinned horizontal variant (motion-OK desktop — gated in CSS) ════ */}
      <div className="services-pinned">
        <div ref={pin} className="relative h-[100svh] w-full overflow-hidden">
          {backdrop}

          <div className="relative flex h-full flex-col">
            {/* Heading row */}
            <div className="mx-auto w-full max-w-[1280px] px-6 lg:px-10 pt-24">
              <div className="flex items-end justify-between gap-10">
                <div>
                  <div className="mono text-[11px] tracking-[0.25em] uppercase text-[var(--brand-teal-bright)]">
                    {s.eyebrow}
                  </div>
                  <h2 className="srv-h2 mask-reveal mt-4 text-[clamp(1.8rem,3.2vw,2.7rem)] leading-[1.05] tracking-[-0.02em] font-medium">
                    {s.title}
                  </h2>
                </div>
                <p className="max-w-sm pb-1 text-white/60 leading-relaxed text-[14.5px]">
                  {s.body}
                </p>
              </div>
            </div>

            {/* Horizontal track — scrubbed sideways by the pin */}
            <div className="flex flex-1 items-center overflow-hidden">
              <div
                ref={track}
                className="flex items-stretch gap-5 will-change-transform pl-[max(1.5rem,calc((100vw-1280px)/2+2.5rem))] pr-[max(1.5rem,calc((100vw-1280px)/2+2.5rem))]"
              >
                {s.items.map((it, i) => (
                  <div
                    key={i}
                    className="group flex h-[min(58vh,520px)] w-[clamp(400px,34vw,500px)] shrink-0 flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] p-7 transition-colors duration-300 hover:border-[var(--brand-teal-bright)]/40 hover:bg-white/[0.04]"
                  >
                    <div className="relative flex min-h-0 flex-1 items-center justify-center">
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0"
                        style={{
                          background:
                            "radial-gradient(circle at 50% 50%, rgba(72,184,177,0.12), transparent 62%)",
                        }}
                      />
                      <svg
                        viewBox="0 0 240 180"
                        className="relative h-full max-h-[240px] w-auto max-w-full"
                        role="img"
                        aria-label={it.k}
                        dangerouslySetInnerHTML={{ __html: SERVICES_ART[i] ?? "" }}
                      />
                    </div>
                    <div className="mt-6 border-t border-white/[0.07] pt-5">
                      <h3 className="font-medium leading-tight tracking-[-0.02em] text-[clamp(1.15rem,1.6vw,1.4rem)]">
                        {it.k}
                      </h3>
                      <p className="mt-3 text-white/65 leading-relaxed text-[14px]">{it.v}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scrub progress — functional indicator of horizontal position */}
            <div className="mx-auto w-full max-w-[1280px] px-6 lg:px-10 pb-10">
              <div className="h-px w-full bg-white/10">
                <div className="srv-progress h-full origin-left scale-x-0 bg-[var(--brand-teal-bright)]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ════ Static stacked variant (phones, short viewports, reduced motion) ════ */}
      <div className="services-static relative overflow-hidden py-24">
        {backdrop}
        <div className="relative mx-auto max-w-[1280px] px-6">
          <div className="max-w-2xl">
            <div className="mono text-[11px] tracking-[0.25em] uppercase text-[var(--brand-teal-bright)]">
              {s.eyebrow}
            </div>
            <h2 className="mt-5 text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.05] tracking-[-0.02em] font-medium">
              {s.title}
            </h2>
            <p className="mt-6 text-white/65 leading-relaxed max-w-md text-[15.5px]">{s.body}</p>
          </div>

          <div className="mt-16 flex flex-col gap-14">
            {s.items.map((it, i) => (
              <div key={i} className="grid gap-6 border-t border-white/[0.07] pt-10 sm:grid-cols-[1fr_200px] sm:items-start">
                <div className="max-w-md">
                  <h3 className="font-medium leading-tight tracking-[-0.02em] text-[1.35rem]">
                    {it.k}
                  </h3>
                  <p className="mt-3 text-white/65 leading-relaxed text-[15px]">{it.v}</p>
                </div>
                <svg
                  viewBox="0 0 240 180"
                  className="w-full max-w-[220px] h-auto"
                  role="img"
                  aria-label={it.k}
                  dangerouslySetInnerHTML={{ __html: SERVICES_ART[i] ?? "" }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
