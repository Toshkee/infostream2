"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Dict, Locale } from "@/lib/dictionaries";
import { EyebrowBars, MOTION_QUERY, Starfield, type CSSVars } from "./visuals";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ─── Expertise — pinned domain showcase ───
   Four scroll stops (finance / HR / healthcare / DMS & workflow), sharing the
   process section's animation language: one --xp variable (0..3) written per
   scrubbed frame, every reveal a pure CSS function of it — deterministic and
   replayed in reverse when scrolling back. No timers, no GSAP time-tweens
   (see reveal-animations guidance: scrubbed vars survive occluded tabs).

   Unlike the process scenes (decoration backed by an sr-only block), the
   active domain here is the real content — it carries a live link to the
   domain subpage, so the current scene stays in the accessibility tree and
   only inactive scenes are inert. */

// How many clients a domain scene lists before collapsing into a "+N" chip.
const MAX_HOME_CLIENTS = 6;

// Sequential fade around `target`: fully visible within ±0.32, fully gone by
// ±0.48 — the outgoing domain clears before the incoming one starts. Unlike
// the process scenes (sparse card layouts, where a 50/50 crossfade reads as
// travel), these are dense text lists: overlapping two of them at half
// opacity reads as ghosting, so the midpoint here is a clean dark beat.
const domainStyle = (target: number): CSSVars => ({
  "--so": `clamp(0, min(calc((var(--xp) - ${target - 0.48}) / 0.16), calc((${target + 0.48} - var(--xp)) / 0.16)), 1)`,
  opacity: "var(--so)",
  transform: `translateY(clamp(-18px, calc((var(--xp) - ${target}) * -26px), 18px))`,
});

// Maps the scene-local --u onto a 0..1 reveal --r (opacity + lift), starting
// at `start` over `len` — local copy of the shared rev() tuned for --u set
// per domain wrapper below. Every call must satisfy start + len <= 0: the pin
// ends exactly at the last scene's center (u = 0), so anything that completes
// later can never fully reveal on the final domain.
const drev = (start: number, len = 0.12, lift = 10): CSSVars => ({
  "--r": `clamp(0, calc((var(--u) - ${start}) / ${len}), 1)`,
  opacity: "var(--r)",
  transform: `translateY(calc((1 - var(--r)) * ${lift}px))`,
});

// Scroll-drawn stroke: dash the whole element (L generously overestimates its
// length) and retract the offset as the scene-local --u passes `start`, so the
// line traces itself in — and un-traces on reverse scroll. Same completion rule
// as drev: start + len <= 0. In the static variant --u is never set, so the
// invalid var() collapses stroke-dashoffset to its initial 0 = fully drawn.
const draw = (L: number, start: number, len = 0.14): React.CSSProperties => ({
  strokeDasharray: L,
  strokeDashoffset: `calc((1 - clamp(0, calc((var(--u) - ${start}) / ${len}), 1)) * ${L}px)`,
});

// Fade-in for art parts that can't dash-draw (filled dots, the svcart-flow
// traces whose dasharray belongs to their ambient animation) — put on a <g>
// wrapper so it composes with svcart-blink's own opacity animation.
const fadeIn = (start: number, len = 0.1): React.CSSProperties => ({
  opacity: `clamp(0, calc((var(--u) - ${start}) / ${len}), 1)`,
});

// Domain title — clip-path wipe from the top, like the process descriptions.
const titleStyle: CSSVars = {
  "--r": "clamp(0, calc((var(--u) + 0.45) / 0.25), 1)",
  clipPath: "inset(0 0 calc((1 - var(--r)) * 100%) 0)",
  opacity: "calc(0.2 + 0.8 * var(--r))",
};

// Per-domain atmosphere — a faint hue tint layered over the shared nebula,
// crossfaded by --xp proximity. Alphas stay ≤ ~0.1 so the stops read as
// weather changing over one sky, not four color-coded slides.
const DOMAIN_TINT: Record<string, string> = {
  finance: "rgba(196, 150, 74, 0.09)",
  hr: "rgba(148, 118, 214, 0.09)",
  healthcare: "rgba(74, 196, 142, 0.09)",
  dms: "rgba(92, 142, 214, 0.1)",
};

export default function Expertise({ dict, lang }: { dict: Dict; lang: Locale }) {
  const outer = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const st = useRef<ScrollTrigger | null>(null);
  const [active, setActive] = useState(0);

  const x = dict.expertise;
  const items = x.items;
  const last = items.length - 1;

  useGSAP(
    () => {
      ScrollTrigger.config({ ignoreMobileResize: true });
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERY, () => {
        if (!pin.current) return;
        st.current = ScrollTrigger.create({
          trigger: pin.current,
          start: "top top",
          end: () => `+=${last * window.innerHeight * (window.innerWidth < 900 ? 0.9 : 1.2)}`,
          pin: pin.current,
          pinSpacing: true,
          scrub: 0.6,
          onUpdate: (self) => {
            const p = self.progress * last;
            pin.current?.style.setProperty("--xp", p.toFixed(4));
            setActive(Math.max(0, Math.min(last, Math.round(p))));
          },
        });
        return () => {
          st.current = null;
        };
      });
    },
    { scope: outer }
  );

  // Rail navigation — map a domain index onto the pin's scroll span. Native
  // smooth scrolling coexists with Lenis the same way the navbar's
  // scroll-to-top does; ScrollTrigger's onUpdate keeps --xp/active in sync.
  const jumpTo = useCallback(
    (i: number) => {
      const t = st.current;
      if (!t) return;
      window.scrollTo({ top: t.start + (i / last) * (t.end - t.start), behavior: "smooth" });
    },
    [last]
  );

  return (
    <div id="expertise" ref={outer} className="relative bg-[var(--bg-inset)]">
      <noscript>
        <style>{`.expertise-pinned{display:none !important}.expertise-static{display:block !important}`}</style>
      </noscript>

      {/* ════ Pinned scroll-scrubbed variant (gated in CSS) ════ */}
      <div className="expertise-pinned">
        <div
          ref={pin}
          className="relative h-[100svh] w-full overflow-hidden text-white"
          style={{ "--xp": 0 } as CSSVars}
        >
          {/* Quiet backdrop — a shade of the hero's nebula, no 3D layer: the
             typography is the visual here. Outer stop is exactly --bg-inset so
             the section's top and bottom edges dissolve into the hero above
             and the process pin below with no visible seam. */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 100% 80% at 70% 30%, #131b2e 0%, #0d111c 60%, #0d111c 100%)",
            }}
          />
          {/* per-domain hue tint over the shared nebula, crossfaded by --xp */}
          {items.map((it, i) => (
            <div
              key={it.slug}
              aria-hidden
              className="absolute inset-0"
              style={{
                background: `radial-gradient(ellipse 100% 80% at 70% 30%, ${
                  DOMAIN_TINT[it.slug] ?? "transparent"
                } 0%, transparent 62%)`,
                opacity: `clamp(0, min(calc(var(--xp) - ${i - 1}), calc(${i + 1} - var(--xp))), 1)`,
              }}
            />
          ))}
          {/* sparser continuation of the hero's star dust */}
          <Starfield count={85} seed={0x21c7} strength={0.6} bias={false} />
          {/* top + bottom dissolve into --bg-inset so no seam line shows
             against the hero above or the process pin below */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[var(--bg-inset)] to-transparent"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[var(--bg-inset)]"
          />

          <div className="relative z-10 mx-auto flex h-full max-w-[1280px] flex-col px-6 pt-28 pb-10 md:pt-36 lg:px-10">
            {/* Section header — persistent across all four stops */}
            <div className="flex items-center gap-3 text-[11px] font-medium tracking-[0.25em] uppercase text-[var(--brand-teal-bright)]">
              <EyebrowBars />
              {x.eyebrow}
            </div>

            <div className="mt-10 grid flex-1 min-h-0 gap-10 lg:mt-16 lg:grid-cols-[minmax(230px,290px)_1fr] lg:gap-16">
              {/* Domain rail — compact stack with a scrub-driven fill; self-start
                 so the track hugs the list instead of stretching to the pin.
                 Each name is a real button that scrolls the pin to its stop. */}
              <div className="hidden self-start lg:flex gap-5">
                <div aria-hidden className="relative w-px self-stretch bg-white/10">
                  <div
                    className="absolute left-0 top-0 w-px bg-[var(--brand-teal-bright)]"
                    style={{ height: `calc((var(--xp) / ${last}) * 100%)` }}
                  />
                </div>
                <ul className="flex flex-col gap-9 py-1.5">
                  {items.map((it, i) => (
                    <li key={it.slug}>
                      <button
                        type="button"
                        onClick={() => jumpTo(i)}
                        aria-current={i === active ? "true" : undefined}
                        className={`cursor-pointer text-left text-[16px] leading-snug tracking-[0.01em] transition-colors duration-500 hover:text-white ${
                          i === active ? "text-white" : i < active ? "text-white/45" : "text-white/30"
                        }`}
                      >
                        {it.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Domain scenes — stacked, crossfaded by --xp */}
              <div className="relative min-h-0">
                {items.map((it, i) => {
                  const isActive = i === active;
                  const shown = it.clients.slice(0, MAX_HOME_CLIENTS);
                  const extra = it.clients.length - shown.length;
                  return (
                    <div
                      key={it.slug}
                      className="absolute inset-0 flex flex-col justify-start pt-1 lg:pt-2"
                      style={{
                        ...domainStyle(i),
                        "--u": `calc(var(--xp) - ${i})`,
                        pointerEvents: isActive ? "auto" : "none",
                        willChange: "opacity, transform",
                      } as CSSVars}
                      aria-hidden={!isActive}
                      inert={!isActive}
                    >
                      <div className="grid items-start gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(300px,400px)] xl:items-center xl:gap-20">
                      <div>
                      <h3
                        className="font-display text-[clamp(2.4rem,5vw,4.4rem)] leading-[1.0] tracking-[-0.028em] font-medium text-white"
                        style={titleStyle}
                      >
                        {it.name}
                      </h3>
                      <p
                        className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-white/65"
                        style={drev(-0.3, 0.16, 8)}
                      >
                        {it.short}
                      </p>

                      {it.clients.length > 0 ? (
                        <div className="mt-10">
                          <div
                            className="mono text-[10px] tracking-[0.3em] uppercase text-white/45"
                            style={drev(-0.22, 0.14, 6)}
                          >
                            {x.clientsLabel}
                          </div>
                          <ul className="mt-4 grid max-w-2xl gap-x-10 sm:grid-cols-2">
                            {shown.map((c, j) => (
                              <li
                                key={j}
                                className={`border-t border-white/10 py-3.5 ${j >= 4 ? "hidden sm:block" : ""}`}
                                style={drev(-0.34 + j * 0.04, 0.12, 10)}
                              >
                                <div className="text-[14.5px] leading-snug text-white/85">{c.org}</div>
                                <div className="mt-1 text-[12px] leading-snug text-white/45">{c.system}</div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p
                          className="mt-10 mono text-[11px] tracking-[0.22em] uppercase text-white/40"
                          style={drev(-0.18, 0.14, 8)}
                        >
                          {x.comingSoon}
                        </p>
                      )}

                      {/* Subpage link — diagonal arrow, matching the site's card affordance */}
                      <div className="mt-9" style={drev(-0.16, 0.12, 8)}>
                        <Link
                          href={`/${lang}/expertise/${it.slug}`}
                          className="group inline-flex items-center gap-3 text-[13px] tracking-[0.04em] text-[var(--brand-teal-bright)]"
                        >
                          <span className="border-b border-[var(--brand-teal-bright)]/30 pb-0.5 transition-colors duration-300 group-hover:border-[var(--brand-teal-bright)]">
                            {x.linkLabel}
                            {extra > 0 && <span className="text-white/45"> · +{extra}</span>}
                          </span>
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <path d="M7 17 17 7M9 7h8v8" />
                          </svg>
                        </Link>
                      </div>
                      </div>

                      {/* Domain artwork — abstract line-art in the process
                         section's visual language, one composition per field.
                         The container only fades the dashed meridian in; the
                         strokes draw themselves via draw()/fadeIn() below. */}
                      <div className="hidden xl:grid place-items-center" style={drev(-0.44, 0.1, 8)}>
                        <DomainArt slug={it.slug} />
                      </div>
                      </div>

                      {/* Below xl the art column has no room — echo it as a
                         quiet watermark so smaller screens keep the domain's
                         signature (draw-in still runs off the inherited --u) */}
                      <div
                        aria-hidden
                        className="pointer-events-none absolute bottom-1 right-0 w-36 opacity-20 sm:w-44 md:w-56 md:opacity-30 xl:hidden"
                      >
                        <DomainArt slug={it.slug} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile progress — four dashes, mirroring the process indicator */}
            <div aria-hidden className="mt-6 flex gap-3 lg:hidden">
              {items.map((it, i) => (
                <span
                  key={it.slug}
                  className={`block h-px transition-all duration-500 ${
                    i === active ? "w-10 bg-[var(--brand-teal-bright)]" : "w-5 bg-white/25"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ════ Static stacked variant (reduced-motion + no-JS — gated in CSS) ════ */}
      <section className="expertise-static relative overflow-hidden py-24 text-white">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
          <div className="flex items-center gap-3 text-[11px] font-medium tracking-[0.25em] uppercase text-[var(--brand-teal-bright)]">
            <EyebrowBars />
            {x.eyebrow}
          </div>
          <h2 className="mt-5 max-w-3xl text-[clamp(1.7rem,3.2vw,2.7rem)] leading-[1.05] tracking-[-0.02em] font-medium">
            {x.title}
          </h2>
          <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-white/65">{x.body}</p>

          <div className="mt-14 space-y-14">
            {items.map((it) => (
              <article key={it.slug} className="md:grid md:grid-cols-[minmax(0,1fr)_230px] md:items-center md:gap-14">
                <div>
                  <h3 className="font-display text-[clamp(1.8rem,3.4vw,2.6rem)] leading-[1.02] tracking-[-0.025em] font-medium">
                    {it.name}
                  </h3>
                  <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/65">{it.short}</p>
                  {it.clients.length > 0 ? (
                    <ul className="mt-6 grid max-w-3xl gap-x-10 sm:grid-cols-2">
                      {it.clients.map((c, j) => (
                        <li key={j} className="border-t border-white/10 py-3 text-[14.5px] leading-snug text-white/85">
                          {c.org}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-6 mono text-[11px] tracking-[0.22em] uppercase text-white/40">{x.comingSoon}</p>
                  )}
                  <div className="mt-6">
                    <Link
                      href={`/${lang}/expertise/${it.slug}`}
                      className="text-[13px] text-[var(--brand-teal-bright)] border-b border-[var(--brand-teal-bright)]/30 pb-0.5"
                    >
                      {x.linkLabel}
                    </Link>
                  </div>
                </div>
                {/* fully drawn here — --u is unset, so every draw()/fadeIn()
                   collapses to its resting state */}
                <div className="hidden md:block">
                  <DomainArt slug={it.slug} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─── Domain artwork ───
   One abstract line-art composition per field, in the same visual language as
   the process feature card (single stroke weight, teal on dark, slow ambient
   float via the svcart-* keyframes, one small brand-red accent each). Kept in
   code, not the dictionary — pure presentation. */

// SVG CSS transforms need an explicit view-box origin or they rotate/scale
// around a broken default.
const ART_CENTER = { transformBox: "view-box", transformOrigin: "110px 110px" } as const;

function DomainArt({ slug }: { slug: string }) {
  return (
    <svg
      viewBox="0 0 220 220"
      className="h-auto w-full max-w-[360px] text-[var(--brand-teal-bright)] drop-shadow-[0_0_18px_rgba(72,184,177,0.12)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {ART[slug] ?? null}
    </svg>
  );
}

/* Draw choreography: baseline → bars left-to-right → trend line → dots, all
   inside the scene's approach window (--u ≈ -0.44..0). L values overestimate
   each element's true length — overshoot only skews timing, never the final
   fully-drawn state. */
const ART: Record<string, React.ReactNode> = {
  // Finance — figures that reconcile: rising outlined bars under a trend line,
  // a dashed meridian arc behind, the peak marked in brand red.
  finance: (
    <>
      <circle cx="110" cy="110" r="92" strokeDasharray="2 10" opacity="0.35" />
      <g className="svcart-floaty" style={ART_CENTER}>
        <path d="M42 168h136" opacity="0.5" style={draw(140, -0.42)} />
        <rect x="56" y="132" width="18" height="36" rx="2" opacity="0.55" style={draw(115, -0.38)} />
        <rect x="90" y="112" width="18" height="56" rx="2" opacity="0.7" style={draw(155, -0.34)} />
        <rect x="124" y="88" width="18" height="80" rx="2" opacity="0.85" style={draw(205, -0.3)} />
        <rect x="158" y="60" width="18" height="108" rx="2" style={draw(260, -0.26)} />
        <path d="M58 118 92 98l34-22 36-26" opacity="0.6" style={draw(130, -0.22, 0.16)} />
        <g style={fadeIn(-0.1, 0.08)}>
          <circle cx="58" cy="118" r="2.2" fill="currentColor" stroke="none" />
          <circle cx="92" cy="98" r="2.2" fill="currentColor" stroke="none" />
          <circle cx="126" cy="76" r="2.2" fill="currentColor" stroke="none" />
          <circle className="svcart-blink" cx="162" cy="50" r="3" fill="var(--brand-red)" stroke="none" />
        </g>
      </g>
    </>
  ),
  // Human Resources — a constellation of people: central figure ringed by a
  // slow dashed orbit, two colleagues linked in.
  hr: (
    <>
      <circle cx="110" cy="104" r="86" strokeDasharray="2 10" opacity="0.35" />
      <g className="svcart-floaty" style={ART_CENTER}>
        <circle cx="110" cy="78" r="17" style={draw(112, -0.36)} />
        <path d="M78 132a32 32 0 0 1 64 0" style={draw(106, -0.3)} />
        <circle cx="110" cy="104" r="42" opacity="0.4" style={draw(270, -0.42, 0.18)} />
      </g>
      <g className="svcart-floaty" style={{ ...ART_CENTER, animationDelay: "0.7s" }}>
        <circle cx="46" cy="150" r="10" opacity="0.7" style={draw(66, -0.26, 0.12)} />
        <path d="M28 176a18 18 0 0 1 36 0" opacity="0.7" style={draw(60, -0.22, 0.12)} />
      </g>
      <g className="svcart-floaty" style={{ ...ART_CENTER, animationDelay: "1.3s" }}>
        <circle cx="174" cy="150" r="10" opacity="0.7" style={draw(66, -0.24, 0.12)} />
        <path d="M156 176a18 18 0 0 1 36 0" opacity="0.7" style={draw(60, -0.2, 0.12)} />
      </g>
      <path d="M74 128 58 141M146 128l16 13" opacity="0.5" style={draw(44, -0.16, 0.12)} />
      <g style={fadeIn(-0.08, 0.06)}>
        <circle className="svcart-blink" cx="110" cy="34" r="2.6" fill="var(--brand-red)" stroke="none" />
      </g>
    </>
  ),
  // Healthcare — shield-cross with a vital trace running beneath it. The trace
  // is a solid stroke drawn left-to-right (an ECG writing itself), not an
  // svcart-flow dash — the 3/8 dash pattern shreds the pulse shape.
  healthcare: (
    <>
      <circle cx="110" cy="110" r="92" strokeDasharray="2 10" opacity="0.35" />
      <g className="svcart-floaty" style={ART_CENTER}>
        <rect x="66" y="62" width="88" height="88" rx="18" opacity="0.85" style={draw(330, -0.42, 0.2)} />
        <path d="M110 88v36M92 106h36" style={draw(76, -0.24, 0.12)} />
      </g>
      <path d="M26 168h44l10-16 12 32 10-30 8 14h84" opacity="0.7" style={draw(258, -0.16, 0.14)} />
      <g style={fadeIn(-0.05, 0.04)}>
        <circle className="svcart-blink" cx="196" cy="168" r="2.8" fill="var(--brand-red)" stroke="none" />
      </g>
    </>
  ),
  // DMS & Workflow — documents cascading down into the archive directly below,
  // so the whole flow reads as one centered column: cascade → dashed drop →
  // archive tray, blink dot terminating the tray lid. Text lines sit in the
  // front doc's clear lower band so they never run along another doc's edge.
  dms: (
    <>
      <circle cx="110" cy="110" r="92" strokeDasharray="2 10" opacity="0.35" />
      <g className="svcart-floaty" style={ART_CENTER}>
        <path d="M70 32h34l12 12v44H70z" opacity="0.5" style={draw(205, -0.42, 0.12)} />
        <path d="M104 32v12h12" opacity="0.5" style={draw(26, -0.34, 0.08)} />
        <path d="M86 48h34l12 12v44H86z" opacity="0.75" style={draw(205, -0.38, 0.12)} />
        <path d="M120 48v12h12" opacity="0.75" style={draw(26, -0.3, 0.08)} />
        <path d="M102 64h34l12 12v44H102z" style={draw(205, -0.34, 0.12)} />
        <path d="M136 64v12h12" style={draw(26, -0.26, 0.08)} />
        <path d="M112 107h24M112 114h16" opacity="0.6" style={draw(45, -0.22, 0.1)} />
      </g>
      <g style={fadeIn(-0.18)}>
        <path className="svcart-flow" d="M120 124c0 14-4 25-10 36" opacity="0.7" />
      </g>
      <g className="svcart-floaty" style={{ ...ART_CENTER, animationDelay: "0.9s" }}>
        <path d="M86 164h48v26h-48z" opacity="0.85" style={draw(155, -0.16, 0.12)} />
        <path d="M82 164h56M104 174h12" opacity="0.6" style={draw(72, -0.12, 0.1)} />
      </g>
      <g style={fadeIn(-0.06, 0.05)}>
        <circle className="svcart-blink" cx="138" cy="164" r="2.6" fill="var(--brand-red)" stroke="none" />
      </g>
    </>
  ),
};
