"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Dict, Locale } from "@/lib/dictionaries";
import { attachStopSnap } from "@/lib/scrollSnap";
import { smoothScrollTo } from "@/components/providers/SmoothScroll";
import {
  DomainArt,
  EyebrowBars,
  Icon,
  Medallion,
  MOTION_QUERY,
  Starfield,
  tealPeriod,
  type CSSVars,
} from "./visuals";
import { ClientMark } from "./Clients";
import { CAP_ICONS } from "./expertiseMeta";

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
  finance: [0, 1, 6], // Tax Administration · Treasury · Port of Adria
  hr: [0, 1, 2], // HR Management Authority · Pension Fund · Employment Agency
  healthcare: [],
  dms: [0, 1], // Ministry of Defense · Military Intelligence Department
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
        // Settle an idle scroll onto a stop — stops sit at --xp 0..span, i.e.
        // progress i/span.
        const detachSnap = attachStopSnap(
          () => st.current,
          Array.from({ length: span + 1 }, (_, i) => i / span)
        );
        return () => {
          detachSnap();
          st.current = null;
        };
      });
    },
    { scope: outer }
  );

  // Rail navigation — map a domain index onto the pin's scroll span (offset by
  // the intro stop). Goes through smoothScrollTo, not window.scrollTo: while
  // Lenis is the active scroller it rewrites scrollTop every frame, so a
  // native scroll is reverted before it lands. ScrollTrigger's onUpdate keeps
  // --xp/active in sync either way.
  const jumpTo = useCallback(
    (i: number) => {
      const t = st.current;
      if (!t) return;
      smoothScrollTo(t.start + ((i + 1) / span) * (t.end - t.start));
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
          <Starfield count={85} seed={0x21c7} strength={0.6} bias={false} className="hidden sm:block" />
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
                 Each name is a real button that scrolls the pin to its stop.
                 Below it, the mock's quiet positioning card. */}
              <div className="hidden self-start lg:flex lg:flex-col gap-12">
                <div className="flex gap-5">
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
                <div className="flex max-w-[240px] flex-col gap-4 rounded-2xl border border-white/10 p-6">
                  <Medallion name="shieldCheck" size="sm" />
                  <p className="text-[12.5px] leading-relaxed text-white/55">{x.sideNote}</p>
                </div>
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
                      <div className="grid items-start gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(250px,330px)] xl:items-center xl:gap-14">
                      <div>
                      <div
                        className="mono text-[10px] tracking-[0.3em] uppercase text-white/45"
                        style={drev(-0.4, 0.14, 6)}
                      >
                        {it.name}
                      </div>
                      <h3
                        className="font-display mt-3 max-w-xl text-balance text-[clamp(1.8rem,3vw,2.6rem)] leading-[1.08] tracking-[-0.02em] font-medium text-white"
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

                      {/* Capability row — hairline-divided icon + label pairs
                         (per the mock). Equal grid columns instead of a wrap-
                         prone flex row: five items never fit one flex line at
                         in-between widths and the orphan carried a hanging
                         hairline. Hidden on small screens: the paragraph above
                         says the same in prose and the pin's height budget is
                         tight there. */}
                      <div className="mt-8 hidden max-w-xl grid-flow-col auto-cols-fr md:grid">
                        {it.capabilities.map((label, k) => (
                          <div
                            key={k}
                            className={`flex flex-col gap-2.5 pr-4 lg:pr-5 ${
                              k > 0 ? "border-l border-white/10 pl-4 lg:pl-5" : ""
                            }`}
                            style={drev(-0.3 + k * 0.02, 0.1, 8)}
                          >
                            <Icon
                              name={(CAP_ICONS[it.slug] ?? [])[k] ?? "layers"}
                              className="h-5 w-5 text-[var(--brand-teal-bright)]"
                            />
                            <span className="text-[12.5px] leading-snug text-white/75">{label}</span>
                          </div>
                        ))}
                      </div>
                      </div>

                      {/* Domain artwork — abstract line-art in the process
                         section's visual language, one composition per field.
                         The container only fades the dashed meridian in; the
                         strokes draw themselves via draw()/fadeIn() below. */}
                      <div
                        className="hidden xl:flex xl:flex-col xl:items-center xl:gap-5"
                        style={drev(-0.44, 0.1, 8)}
                      >
                        <DomainArt slug={it.slug} />
                        {/* the domain tagline sits under the instrument, as in the mock */}
                        <p className="max-w-[28ch] text-center text-[12.5px] leading-relaxed text-white/50">
                          {it.tagline}
                        </p>
                      </div>
                      </div>

                      {/* Projects — the domain's featured engagements as
                         monogram cards spanning the full scene width (per the
                         mock), headed by the label + subpage link. Below sm
                         the cards compress to badge + org rows and drop the
                         system line to fit the pin's height budget. */}
                      <div className="mt-8 lg:mt-10">
                        <div
                          className="flex flex-wrap items-center gap-x-5 gap-y-3"
                          style={drev(-0.26, 0.12, 8)}
                        >
                          <span className="mono text-[10px] tracking-[0.3em] uppercase text-white/45">
                            {x.projectsLabel}
                          </span>
                          <span aria-hidden className="hidden h-px flex-1 bg-white/10 sm:block" />
                          <Link
                            href={`/${lang}/expertise/${it.slug}`}
                            className="group inline-flex items-center gap-2.5 text-[12.5px] tracking-[0.04em] text-[var(--brand-teal-bright)]"
                          >
                            <span className="border-b border-[var(--brand-teal-bright)]/30 pb-0.5 transition-colors duration-300 group-hover:border-[var(--brand-teal-bright)]">
                              {x.allClientsIn.replace("{domain}", it.name)}
                            </span>
                            <svg
                              viewBox="0 0 24 24"
                              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                            >
                              <path d="M5 12h14m-6-7 7 7-7 7" />
                            </svg>
                          </Link>
                        </div>

                        {shown.length > 0 ? (
                          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
                            {shown.map((c, j) => (
                              <li
                                key={j}
                                className="flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 sm:flex-col sm:items-start sm:rounded-2xl sm:p-5"
                                style={drev(-0.24 + j * 0.04, 0.1, 10)}
                              >
                                <ClientMark org={c.org} index={j} />
                                <div>
                                  <div className="text-[13.5px] font-medium leading-snug text-white/90">
                                    {c.org}
                                  </div>
                                  <div className="mt-1 hidden text-[12.5px] leading-relaxed text-white/50 sm:block">
                                    {c.system}
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p
                            className="mt-6 mono text-[11px] tracking-[0.22em] uppercase text-white/40"
                            style={drev(-0.22, 0.12, 8)}
                          >
                            {x.comingSoon}
                          </p>
                        )}
                      </div>

                      {/* Below xl the art column has no room — echo it as a
                         quiet watermark so smaller screens keep the domain's
                         signature (draw-in still runs off the inherited --u) */}
                      {/* The watermark artwork is useful on wide layouts, but
                          becomes visual noise behind the mobile copy. */}
                      <div
                        aria-hidden
                        className="pointer-events-none absolute bottom-1 right-0 -z-10 hidden w-36 opacity-20 sm:w-44 md:w-56 md:opacity-30 xl:hidden"
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
            <div className="mt-3 hidden lg:flex">
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
      <section className="expertise-static relative overflow-hidden py-24 max-sm:py-16 text-white">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
          <div className="flex items-center gap-3 text-[11px] font-medium tracking-[0.25em] uppercase text-[var(--brand-teal-bright)]">
            <EyebrowBars />
            {x.eyebrow}
          </div>
          <h2 className="mt-5 max-w-3xl text-[clamp(1.7rem,3.2vw,2.7rem)] leading-[1.05] tracking-[-0.02em] font-medium">
            {x.title}
          </h2>
          <p className="mt-4 max-w-2xl max-sm:hidden text-[15.5px] leading-relaxed text-white/65">{x.body}</p>

          <div className="mt-14 max-sm:mt-9 space-y-14 max-sm:space-y-10">
            {items.map((it) => {
              const shown = (FEATURED[it.slug] ?? []).flatMap((k) => it.clients[k] ?? []);
              return (
              <article key={it.slug} className="md:grid md:grid-cols-[minmax(0,1fr)_230px] md:items-center md:gap-14">
                <div>
                  <div className="mono text-[10px] tracking-[0.3em] uppercase text-white/45">{it.name}</div>
                  <h3 className="font-display mt-3 max-w-2xl text-balance text-[clamp(1.7rem,3.2vw,2.4rem)] leading-[1.06] tracking-[-0.02em] font-medium">
                    {it.title}
                  </h3>
                  <p className="mt-3 max-w-2xl max-sm:line-clamp-2 text-[15px] leading-relaxed text-white/65">{it.short}</p>
                  {/* same single-row grid as the pinned variant (md+); plain
                     wrap with gaps below that, where columns would crush */}
                  <div className="mt-7 max-sm:mt-5 flex flex-wrap gap-6 max-sm:gap-4 md:grid md:max-w-xl md:grid-flow-col md:auto-cols-fr md:gap-0">
                    {it.capabilities.map((label, k) => (
                      <div
                        key={k}
                        className={`flex flex-col gap-2.5 md:pr-4 ${
                          k > 0 ? "md:border-l md:border-white/10 md:pl-4" : ""
                        }`}
                      >
                        <Icon
                          name={(CAP_ICONS[it.slug] ?? [])[k] ?? "layers"}
                          className="h-5 w-5 text-[var(--brand-teal-bright)]"
                        />
                        <span className="text-[12.5px] leading-snug text-white/75">{label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 max-sm:mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                    <span className="mono text-[10px] tracking-[0.3em] uppercase text-white/45">
                      {x.projectsLabel}
                    </span>
                    <Link
                      href={`/${lang}/expertise/${it.slug}`}
                      className="text-[12.5px] text-[var(--brand-teal-bright)] border-b border-[var(--brand-teal-bright)]/30 pb-0.5"
                    >
                      {x.allClientsIn.replace("{domain}", it.name)}
                    </Link>
                  </div>
                  {shown.length > 0 ? (
                    <ul className="mt-4 max-sm:hidden grid max-w-3xl gap-3 sm:grid-cols-2">
                      {shown.map((c, j) => (
                        <li
                          key={j}
                          className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                        >
                          <div className="flex items-center gap-3.5">
                            <ClientMark org={c.org} index={j} />
                            <span className="text-[13.5px] font-medium leading-snug text-white/90">{c.org}</span>
                          </div>
                          <p className="text-[12.5px] leading-relaxed text-white/50">{c.system}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-6 mono text-[11px] tracking-[0.22em] uppercase text-white/40">{x.comingSoon}</p>
                  )}
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
