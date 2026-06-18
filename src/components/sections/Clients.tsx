"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";
import type { Dict } from "@/lib/dictionaries";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const BARS = 16;
const CYCLE_MS = 2600;

export default function Clients({ dict }: { dict: Dict }) {
  const ref = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const c = dict.clients;
  const projects = c.projects;
  const total = projects.length;

  const [active, setActive] = useState(0);

  // Second clause of the positioning line in teal.
  const titleParts = c.title.split(/(?<=\.)\s+/);

  const current = projects[active];
  // Deterministic "signal" heights derived from the active name (no RNG).
  const barVals = Array.from({ length: BARS }, (_, j) => {
    const code = current.org.charCodeAt((j * 5 + 3) % current.org.length) || 65;
    return 0.18 + ((code % 11) / 11) * 0.82;
  });

  // Auto-advance — fast, pauses on hover, idles when offscreen or reduced-motion.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    let inView = true;
    const io = new IntersectionObserver(
      ([e]) => (inView = e.isIntersecting),
      { threshold: 0.25 }
    );
    if (el) io.observe(el);
    const id = window.setInterval(() => {
      if (pausedRef.current || !inView) return;
      setActive((a) => (a + 1) % total);
    }, CYCLE_MS);
    return () => {
      window.clearInterval(id);
      io.disconnect();
    };
  }, [total]);

  // Entrance choreography (runs once).
  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        gsap.set(".clients-h2", { clipPath: "inset(0 0% 0 0)" });
        return;
      }

      gsap.fromTo(
        ".clients-eyebrow-dash",
        { width: 0 },
        { width: "3.5rem", duration: 1.1, ease: "power3.out",
          scrollTrigger: { trigger: ".clients-heading", start: "top 85%" } }
      );
      gsap.to(".clients-h2", {
        clipPath: "inset(0 0% 0 0)", duration: 1.2, ease: "power4.out",
        scrollTrigger: { trigger: ".clients-h2", start: "top 85%" },
      });
      gsap.from(".clients-stage", {
        opacity: 0, y: 30, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: ".clients-module", start: "top 80%" },
      });
      gsap.from(".reg-item", {
        opacity: 0, x: 24, duration: 0.5, stagger: 0.035, ease: "power2.out",
        scrollTrigger: { trigger: ".clients-register", start: "top 82%" },
      });
      gsap.from(".clients-more", {
        opacity: 0, y: 16, duration: 0.6, ease: "power2.out",
        scrollTrigger: { trigger: ".clients-register", start: "top 60%" },
      });
    },
    { scope: ref }
  );

  // Per-switch animation — re-runs whenever the active project changes.
  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const tl = gsap.timeline();
      tl.fromTo(".stage-char",
        { yPercent: 115, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.5, ease: "power3.out", stagger: 0.022 }, 0);
      tl.fromTo(".stage-index",
        { yPercent: 80, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.45, ease: "power3.out" }, 0);
      tl.fromTo(".stage-system",
        { opacity: 0, x: -12 },
        { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" }, 0.05);
      tl.to(".signal-bar",
        { scaleY: (i: number) => barVals[i], duration: 0.55, ease: "power2.out", stagger: 0.018 }, 0);
      tl.to(".stage-progress-fill",
        { scaleX: (active + 1) / total, duration: 0.6, ease: "power3.out" }, 0);
    },
    { dependencies: [active], scope: ref }
  );

  const pause = () => (pausedRef.current = true);
  const resume = () => (pausedRef.current = false);

  return (
    <section
      id="clients"
      ref={ref}
      className="relative py-24 lg:py-32 bg-[var(--bg-inset)] text-white overflow-hidden"
    >
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

      <div className="relative z-10 mx-auto max-w-[1280px] px-6 lg:px-10">
        {/* header */}
        <div className="clients-heading max-w-3xl">
          <div className="mono text-[11px] tracking-[0.25em] uppercase text-[var(--brand-teal-bright)] flex items-center gap-2">
            <span className="clients-eyebrow-dash h-px w-6 bg-[var(--brand-teal-bright)]" />
            {c.eyebrow}
          </div>
          <h2 className="clients-h2 mask-reveal mt-5 text-[clamp(1.7rem,3.2vw,2.7rem)] leading-[1.05] tracking-[-0.02em] font-medium">
            {titleParts[0]}
            {titleParts.length > 1 && (
              <>
                {" "}
                <span className="text-[var(--brand-teal-bright)]">
                  {titleParts.slice(1).join(" ")}
                </span>
              </>
            )}
          </h2>
        </div>

        {/* interactive module */}
        <div
          className="clients-module mt-12 grid gap-10 lg:mt-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16"
          onMouseEnter={pause}
          onMouseLeave={resume}
          onFocusCapture={pause}
          onBlurCapture={resume}
        >
          {/* ── feature stage ── */}
          <div className="clients-stage relative">
            <div className="mono flex items-center gap-3 text-[11px] tracking-[0.28em] uppercase text-white/40">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-red)]" />
              {c.colOrg}
              <span className="ml-auto inline-flex items-baseline tabular-nums text-white/30">
                <span className="overflow-hidden">
                  <span className="stage-index inline-block text-[var(--brand-teal-bright)]">
                    {String(active + 1).padStart(2, "0")}
                  </span>
                </span>
                <span className="px-1">/</span>
                <span>{String(total).padStart(2, "0")}</span>
              </span>
            </div>

            {/* big institution name — letters cascade on each switch */}
            <div className="relative mt-5 min-h-[clamp(4.2rem,11vw,8.5rem)] overflow-hidden">
              <h3
                key={active}
                aria-label={current.org}
                className="flex flex-wrap text-[clamp(1.7rem,4.4vw,3.4rem)] font-medium leading-[1.04] tracking-[-0.02em]"
              >
                {current.org.split(" ").map((word, wi) => (
                  // Group by word so flex-wrap only breaks between words, never
                  // mid-word ("Insu rance"); characters still cascade individually.
                  <span key={wi} aria-hidden className="inline-flex whitespace-nowrap mr-[0.26em]">
                    {Array.from(word).map((ch, j) => (
                      <span key={j} className="stage-char inline-block will-change-transform">
                        {ch}
                      </span>
                    ))}
                  </span>
                ))}
              </h3>
            </div>

            {/* system delivered */}
            <p className="stage-system mono mt-4 text-[12px] tracking-[0.18em] uppercase text-[var(--brand-teal-soft)]">
              {current.system}
            </p>

            {/* animated signal bars */}
            <div className="mt-8 flex h-12 items-end gap-1.5" aria-hidden>
              {barVals.map((_, j) => (
                <span
                  key={j}
                  className="signal-bar block w-full flex-1 origin-bottom rounded-sm bg-[var(--brand-teal)]/40"
                  style={{ height: "100%", transform: "scaleY(0.25)" }}
                />
              ))}
            </div>

            {/* progress through the roster */}
            <div className="mt-5 h-px w-full overflow-hidden bg-white/10">
              <span
                className="stage-progress-fill block h-full w-full origin-left bg-[var(--brand-teal-bright)]"
                style={{ transform: "scaleX(0.05)" }}
              />
            </div>
          </div>

          {/* ── compact register index ── */}
          <div className="clients-register">
            <ul className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              {projects.map((p, i) => {
                const on = i === active;
                return (
                  <li key={i} className="reg-item">
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onFocus={() => setActive(i)}
                      onClick={() => setActive(i)}
                      aria-current={on}
                      className="group flex w-full items-center gap-3 border-b border-white/5 py-2.5 text-left transition-colors duration-200"
                    >
                      <span
                        className={`mono text-[10px] tabular-nums transition-colors duration-200 ${
                          on ? "text-[var(--brand-teal-bright)]" : "text-white/30 group-hover:text-white/60"
                        }`}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`h-px flex-none transition-all duration-300 ${
                          on ? "w-5 bg-[var(--brand-teal-bright)]" : "w-2 bg-white/20 group-hover:w-3"
                        }`}
                      />
                      <span
                        className={`truncate text-[13px] transition-colors duration-200 ${
                          on ? "text-white" : "text-white/45 group-hover:text-white/80"
                        }`}
                      >
                        {p.org}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* and more — static note (no all-projects page to link to) */}
            <div className="clients-more mt-6 flex items-baseline gap-2.5 border-t border-white/10 pt-5">
              <span aria-hidden className="mono text-base leading-none text-[var(--brand-red)]">+</span>
              <span className="text-[15px] text-white/65">40 {c.more}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
