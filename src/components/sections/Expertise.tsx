"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Dict, Locale } from "@/lib/dictionaries";
import { EyebrowBars, MOTION_QUERY, Starfield, tealPeriod, type CSSVars } from "./visuals";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ─── Expertise — pinned domain showcase ───
   Five scroll stops — an intro beat (the section title + body over the empty
   sky) followed by the four domains (finance / HR / healthcare / DMS &
   workflow) — sharing the process section's animation language: one --xp
   variable (0..4, stop 0 = intro, stop i+1 = domain i) written per scrubbed
   frame, every reveal a pure CSS function of it — deterministic and replayed
   in reverse when scrolling back. No timers, no GSAP time-tweens (see
   reveal-animations guidance: scrubbed vars survive occluded tabs).

   Unlike the process scenes (decoration backed by an sr-only block), the
   active domain here is the real content — it carries a live link to the
   domain subpage, so the current scene stays in the accessibility tree and
   only inactive scenes are inert. */

// Which engagements a domain scene highlights as "Solutions delivered" —
// indices into it.clients. This is structure, not copy ("structure in code,
// copy in dict", as elsewhere); the full per-domain lists live in the Clients
// section and on the domain subpages.
const FEATURED: Record<string, number[]> = {
  finance: [0, 1, 3], // Tax Administration · Treasury · ERSTE Bank
  hr: [0, 1, 2], // HR Management Authority · Pension Fund · Employment Agency
  healthcare: [],
  dms: [0, 2], // Ministry of Defense · Military Intelligence Department
};

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
  // Active domain index; -1 = the intro beat.
  const [active, setActive] = useState(-1);

  const x = dict.expertise;
  const items = x.items;
  const last = items.length - 1;
  // Scroll units in the pin: intro → first domain is one unit, then one per
  // remaining domain. --xp runs [0, span]; domain i sits at stop i + 1.
  const span = items.length;

  useGSAP(
    () => {
      ScrollTrigger.config({ ignoreMobileResize: true });
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERY, () => {
        if (!pin.current) return;
        st.current = ScrollTrigger.create({
          trigger: pin.current,
          start: "top top",
          end: () => `+=${span * window.innerHeight * (window.innerWidth < 900 ? 0.9 : 1.2)}`,
          pin: pin.current,
          pinSpacing: true,
          scrub: 0.6,
          onUpdate: (self) => {
            const p = self.progress * span;
            pin.current?.style.setProperty("--xp", p.toFixed(4));
            setActive(Math.max(-1, Math.min(last, Math.round(p) - 1)));
          },
        });
        return () => {
          st.current = null;
        };
      });
    },
    { scope: outer }
  );

  // Rail navigation — map a domain index onto the pin's scroll span (offset by
  // the intro stop). Native smooth scrolling coexists with Lenis the same way
  // the navbar's scroll-to-top does; ScrollTrigger's onUpdate keeps
  // --xp/active in sync.
  const jumpTo = useCallback(
    (i: number) => {
      const t = st.current;
      if (!t) return;
      window.scrollTo({ top: t.start + ((i + 1) / span) * (t.end - t.start), behavior: "smooth" });
    },
    [span]
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
                opacity: `clamp(0, min(calc(var(--xp) - ${i}), calc(${i + 2} - var(--xp))), 1)`,
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
                    style={{ height: `calc(clamp(0, calc((var(--xp) - 1) / ${last}), 1) * 100%)` }}
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

              {/* Domain scenes — stacked, crossfaded by --xp. Stop 0 is the
                 intro beat: the section's framing title + body, previously
                 only rendered in the static variant. It is fully revealed the
                 moment the section scrolls into view (--u never goes negative
                 at stop 0) and hands off to the first domain via the same
                 sequential fade as every other stop. */}
              <div className="relative min-h-0">
                <div
                  className="absolute inset-0 flex flex-col justify-start pt-1 lg:pt-2"
                  style={{
                    ...domainStyle(0),
                    pointerEvents: "none",
                    willChange: "opacity, transform",
                  } as CSSVars}
                  aria-hidden={active !== -1}
                  inert={active !== -1}
                >
                  <h2 className="font-display max-w-3xl text-[clamp(2.4rem,5vw,4.4rem)] leading-[1.04] tracking-[-0.028em] font-medium text-white">
                    {tealPeriod(x.title)}
                  </h2>
                  <p className="mt-6 max-w-2xl text-[15.5px] leading-relaxed text-white/65">{x.body}</p>
                </div>
                {items.map((it, i) => {
                  const isActive = i === active;
                  const shown = (FEATURED[it.slug] ?? []).flatMap((k) => it.clients[k] ?? []);
                  const extra = it.clients.length - shown.length;
                  return (
                    <div
                      key={it.slug}
                      className="absolute inset-0 flex flex-col justify-start pt-1 lg:pt-2"
                      style={{
                        ...domainStyle(i + 1),
                        "--u": `calc(var(--xp) - ${i + 1})`,
                        pointerEvents: isActive ? "auto" : "none",
                        willChange: "opacity, transform",
                      } as CSSVars}
                      aria-hidden={!isActive}
                      inert={!isActive}
                    >
                      <div className="grid items-start gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(300px,400px)] xl:items-center xl:gap-20">
                      <div>
                      <div
                        className="mono text-[10px] tracking-[0.3em] uppercase text-white/45"
                        style={drev(-0.4, 0.14, 6)}
                      >
                        {it.name}
                      </div>
                      <h3
                        className="font-display mt-3 max-w-xl text-[clamp(1.9rem,3.4vw,3rem)] leading-[1.06] tracking-[-0.022em] font-medium text-white"
                        style={titleStyle}
                      >
                        {it.title}
                      </h3>
                      <p
                        className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/65"
                        style={drev(-0.3, 0.16, 8)}
                      >
                        {it.short}
                      </p>

                      {shown.length > 0 ? (
                        <div className="mt-8">
                          <div
                            className="mono text-[10px] tracking-[0.3em] uppercase text-white/45"
                            style={drev(-0.22, 0.14, 6)}
                          >
                            {x.solutionsLabel}
                          </div>
                          <ul className="mt-3 max-w-xl">
                            {shown.map((c, j) => (
                              <li
                                key={j}
                                className="border-t border-white/10 py-3 text-[14px] leading-snug text-white/85"
                                style={drev(-0.3 + j * 0.05, 0.12, 10)}
                              >
                                {c.org} <span className="text-white/40">— {c.system}</span>
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
                      <div className="mt-7" style={drev(-0.16, 0.12, 8)}>
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

            {/* Mobile progress — four dashes, mirroring the process indicator.
               Each is a real button (the rail is hidden below lg, so this is
               the only way to skip between stops on touch); generous padding
               gives the hairline a usable hit target. */}
            <div className="mt-3 flex lg:hidden">
              {items.map((it, i) => (
                <button
                  key={it.slug}
                  type="button"
                  onClick={() => jumpTo(i)}
                  aria-label={it.name}
                  aria-current={i === active ? "true" : undefined}
                  className="cursor-pointer py-3 pr-3"
                >
                  <span
                    className={`block h-px transition-all duration-500 ${
                      i === active ? "w-10 bg-[var(--brand-teal-bright)]" : "w-5 bg-white/25"
                    }`}
                  />
                </button>
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
            {items.map((it) => {
              const shown = (FEATURED[it.slug] ?? []).flatMap((k) => it.clients[k] ?? []);
              return (
              <article key={it.slug} className="md:grid md:grid-cols-[minmax(0,1fr)_230px] md:items-center md:gap-14">
                <div>
                  <div className="mono text-[10px] tracking-[0.3em] uppercase text-white/45">{it.name}</div>
                  <h3 className="font-display mt-3 text-[clamp(1.8rem,3.4vw,2.6rem)] leading-[1.02] tracking-[-0.025em] font-medium">
                    {it.title}
                  </h3>
                  <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/65">{it.short}</p>
                  {shown.length > 0 ? (
                    <ul className="mt-6 grid max-w-3xl gap-x-10 sm:grid-cols-2">
                      {shown.map((c, j) => (
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
              );
            })}
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

/* Draw choreography: outer structure → inner geometry → accents, all inside
   the scene's approach window (--u ≈ -0.44..0). L values overestimate each
   element's true length — overshoot only skews timing, never the final
   fully-drawn state.

   Every composition is built ON the circle itself — concentric geometry with
   a shared center at (110,110), nothing extending past the dashed ring — so
   the four read as variations of one instrument, not four unrelated icons. */
const ART: Record<string, React.ReactNode> = {
  // Finance — a precision dial: tick ring, two concentric circles, a rising
  // sweep arc and a needle pointing to the peak, marked in brand red.
  finance: (
    <>
      <circle cx="110" cy="110" r="92" strokeDasharray="2 10" opacity="0.35" />
      <g className="svcart-floaty" style={ART_CENTER}>
        <g style={fadeIn(-0.44, 0.12)}>
          {Array.from({ length: 36 }, (_, k) => {
            const a = (k * 10 * Math.PI) / 180;
            const s = Math.sin(a);
            const c = Math.cos(a);
            return (
              <line
                key={k}
                x1={(110 + 78 * s).toFixed(1)}
                y1={(110 - 78 * c).toFixed(1)}
                x2={(110 + 84 * s).toFixed(1)}
                y2={(110 - 84 * c).toFixed(1)}
                opacity="0.3"
              />
            );
          })}
        </g>
        <circle cx="110" cy="110" r="62" opacity="0.5" style={draw(390, -0.36, 0.16)} />
        <circle cx="110" cy="110" r="30" opacity="0.3" style={draw(190, -0.3, 0.12)} />
        <path d="M110 40A70 70 0 0 1 164 65" opacity="0.8" style={draw(65, -0.2, 0.12)} />
        <path d="M110 110 157 70" style={draw(64, -0.14, 0.1)} />
        <g style={fadeIn(-0.06, 0.05)}>
          <circle cx="110" cy="110" r="2.4" fill="currentColor" stroke="none" />
          <circle className="svcart-blink" cx="157" cy="70" r="3" fill="var(--brand-red)" stroke="none" />
        </g>
      </g>
    </>
  ),
  // Human Resources — a constellation: an irregular ring of nodes linked
  // around a hub, one node lit in brand red. Link endpoints are trimmed back
  // from each node center so strokes never cross the node circles.
  hr: (
    <>
      <circle cx="110" cy="110" r="92" strokeDasharray="2 10" opacity="0.35" />
      <g className="svcart-floaty" style={ART_CENTER}>
        <circle cx="110" cy="110" r="5.5" style={draw(36, -0.4, 0.1)} />
        <path
          d="M130 55 160 95M163 106 142 156M134 161 90 156M80 150 51 110M52 101 83 75M93 68 121 53"
          opacity="0.45"
          style={draw(360, -0.34, 0.18)}
        />
        <path d="M118 109 158 101M102 109 53 106" opacity="0.3" style={draw(100, -0.24, 0.12)} />
        <circle cx="164" cy="100" r="4" style={draw(26, -0.3, 0.1)} />
        <circle cx="140" cy="162" r="4" style={draw(26, -0.27, 0.1)} />
        <circle cx="84" cy="155" r="4" style={draw(26, -0.24, 0.1)} />
        <circle cx="47" cy="105" r="4" style={draw(26, -0.21, 0.1)} />
        <circle cx="88" cy="71" r="4" style={draw(26, -0.18, 0.1)} />
        <g style={fadeIn(-0.08, 0.06)}>
          <circle cx="110" cy="110" r="1.8" fill="currentColor" stroke="none" />
          <circle className="svcart-blink" cx="126" cy="50" r="3" fill="var(--brand-red)" stroke="none" />
        </g>
      </g>
    </>
  ),
  // Healthcare — concentric pulse ripples with one ECG trace written through
  // the shared center, terminating in brand red. The trace is a solid stroke
  // drawn left-to-right — an svcart-flow dash would shred the pulse shape.
  healthcare: (
    <>
      <circle cx="110" cy="110" r="92" strokeDasharray="2 10" opacity="0.35" />
      <g className="svcart-floaty" style={ART_CENTER}>
        <circle cx="110" cy="110" r="68" opacity="0.3" style={draw(430, -0.42, 0.16)} />
        <circle cx="110" cy="110" r="48" opacity="0.5" style={draw(305, -0.36, 0.14)} />
        <circle cx="110" cy="110" r="28" opacity="0.7" style={draw(180, -0.3, 0.12)} />
        <path
          d="M34 110h44l8-14 10 28 8-24 6 10h68"
          opacity="0.85"
          style={draw(250, -0.22, 0.18)}
        />
        <g style={fadeIn(-0.05, 0.04)}>
          <circle className="svcart-blink" cx="184" cy="110" r="2.8" fill="var(--brand-red)" stroke="none" />
        </g>
      </g>
    </>
  ),
  // DMS & Workflow — strata: the circle rendered purely as layered horizontal
  // chords, like archive layers in section; the middle layer carries the red
  // index mark. Chord widths are sqrt(72² − dy²) for the r=72 disc.
  dms: (
    <>
      <circle cx="110" cy="110" r="92" strokeDasharray="2 10" opacity="0.35" />
      <g className="svcart-floaty" style={ART_CENTER}>
        <path d="M70 50h80" opacity="0.35" style={draw(90, -0.42, 0.1)} />
        <path d="M54 65h112" opacity="0.45" style={draw(122, -0.385, 0.1)} />
        <path d="M45 80h130" opacity="0.55" style={draw(140, -0.35, 0.1)} />
        <path d="M40 95h140" opacity="0.7" style={draw(150, -0.315, 0.1)} />
        <path d="M38 110h144" style={draw(154, -0.28, 0.1)} />
        <path d="M40 125h140" opacity="0.7" style={draw(150, -0.245, 0.1)} />
        <path d="M45 140h130" opacity="0.55" style={draw(140, -0.21, 0.1)} />
        <path d="M54 155h112" opacity="0.45" style={draw(122, -0.175, 0.1)} />
        <path d="M70 170h80" opacity="0.35" style={draw(90, -0.14, 0.1)} />
        <g style={fadeIn(-0.06, 0.05)}>
          <circle className="svcart-blink" cx="188" cy="110" r="2.6" fill="var(--brand-red)" stroke="none" />
        </g>
      </g>
    </>
  ),
};
