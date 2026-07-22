"use client";

import type { Dict } from "@/lib/dictionaries";
import { EyebrowBars, Starfield, tealPeriod } from "./visuals";

// Warm the heavy three.js chunk as early as the client bundle evaluates. The
// hero itself no longer mounts a canvas (the planets belong to the process
// section — duplicating them here made the two sections read as the same
// scene), but the process pin further down the page does, and under `next dev`
// that ~3 MB graph otherwise compiles on demand exactly when the user first
// scrolls into it — the cold-start jank window. Same literal path as
// PinnedProcess's dynamic() import so the bundler maps both to the one chunk;
// fire-and-forget (a failure here is harmless — the real mount re-imports).
if (typeof window !== "undefined") {
  void import("@/components/three/HeroScene");
}

// The intro is pure CSS (`.hero-rise` in globals.css), not a GSAP timeline:
// it starts with the first painted frame — before the JS bundle hydrates —
// so slow devices never stare at an empty starfield, and a frozen/occluded
// tab can't strand it mid-fade the way rAF-driven time-tweens are.
export default function Hero({ dict }: { dict: Dict }) {
  const titleWords = dict.hero.title.split(" ");

  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-[var(--bg-inset)] text-white">
      {/* Quiet dark backdrop — deliberately free of the planets/orbits, which
         are the process section's visual identity further down the page. A
         seeded starfield and two soft brand glows keep it from reading flat. */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 50% 45%, #19223a 0%, #0d111c 70%, #07090f 100%)",
          }}
        />
        {/* soft teal key glow (upper right) + faint red counter-glow (lower left) */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 45% 40% at 78% 22%, rgba(72,184,177,0.10) 0%, transparent 70%), radial-gradient(ellipse 40% 35% at 12% 88%, rgba(216,65,58,0.05) 0%, transparent 70%)",
          }}
        />
        <Starfield />
        {/* Signature instrument — one large dashed ring in the DomainArt
           language (same 2/10 dash, hairline stroke, one red accent),
           positioned right and cropped by the viewport edge. Foreshadows the
           four domain instruments below without duplicating the 3D planets.
           Authored at natural size (viewBox ≈ render size) so the dash pattern
           lands at the same px scale as the expertise art. Rotation rides the
           existing svcart-spin keyframes — reduced-motion already stops them. */}
        <div
          aria-hidden
          className="absolute top-1/2 right-[-12%] hidden -translate-y-1/2 lg:block"
          style={{ width: "min(82vh, 880px)", height: "min(82vh, 880px)" }}
        >
          <svg
            viewBox="0 0 900 900"
            className="h-full w-full text-[var(--brand-teal-bright)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <g
              className="svcart-spin"
              style={{ transformBox: "view-box", transformOrigin: "450px 450px", animationDuration: "300s" }}
            >
              <circle cx="450" cy="450" r="430" strokeDasharray="2 10" opacity="0.3" />
              <circle cx="450" cy="450" r="300" opacity="0.08" />
              {/* four quiet nodes riding the outer ring — one per domain */}
              <circle
                cx="696.7"
                cy="97.8"
                r="3.5"
                fill="currentColor"
                stroke="none"
                opacity="0.9"
                style={{ filter: "drop-shadow(0 0 6px var(--brand-teal-bright))" }}
              />
              <circle cx="726.5" cy="779.4" r="3" fill="currentColor" stroke="none" opacity="0.55" />
              <circle cx="120.6" cy="726.5" r="3" fill="currentColor" stroke="none" opacity="0.55" />
              <circle cx="173.5" cy="120.6" r="3" fill="currentColor" stroke="none" opacity="0.55" />
              {/* the single brand-red accent, on the inner orbit */}
              <circle cx="160.2" cy="527.7" r="2.6" fill="var(--brand-red)" stroke="none" opacity="0.8" />
            </g>
          </svg>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[var(--bg-inset)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-[1280px] flex-col justify-center px-6 pt-20 pb-8 md:pt-24 md:pb-12 lg:px-10">
        <div className="hero-rise text-[11px] font-medium tracking-[0.25em] uppercase text-[var(--brand-teal-bright)] flex items-center gap-3">
          <EyebrowBars />
          {dict.hero.eyebrow}
        </div>
        <h1 className="font-display mt-6 text-[clamp(2.2rem,5.2vw,4.8rem)] leading-[1.02] tracking-[-0.025em] font-medium text-white max-w-4xl">
          {titleWords.map((w, i) => (
            <span
              key={i}
              className="hero-rise inline-block mr-[0.22em]"
              style={{ animationDelay: `${0.1 + i * 0.055}s` }}
            >
              {i === titleWords.length - 1 ? tealPeriod(w) : w}
            </span>
          ))}
        </h1>
        <p
          className="hero-rise mt-6 max-w-xl text-white/70 text-[16.5px] leading-relaxed"
          style={{ animationDelay: "0.45s" }}
        >
          {dict.hero.body}
        </p>

        {/* Primary action — same red-pill affordance as the navbar CTA */}
        <div className="hero-rise mt-9" style={{ animationDelay: "0.52s" }}>
          <a
            href="#contact"
            className="inline-block text-[14px] font-medium px-6 py-3 rounded-xl bg-[var(--brand-red)] text-white hover:bg-[var(--brand-red-deep)] transition-colors duration-200"
            style={{ boxShadow: "0 1px 4px rgba(214,59,59,0.25)" }}
          >
            {dict.hero.cta}
          </a>
        </div>

        {/* Key facts — hairline key/value rows in the expertise client-list
           register, no boxes or icons */}
        <div className="mt-14 grid max-w-3xl grid-cols-2 gap-x-10 gap-y-7 sm:grid-cols-4">
          {dict.hero.meta.map((m, i) => (
            <div
              key={i}
              className="hero-rise border-t border-white/15 pt-3.5"
              style={{ animationDelay: `${0.62 + i * 0.07}s` }}
            >
              <div className="mono text-[9.5px] tracking-[0.2em] uppercase text-white/50 leading-tight">{m.k}</div>
              <div className="mono text-[15px] mt-1.5 text-white/90 leading-tight">{m.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll affordance — a mono whisper and a hairline the teal sweep runs
         down, hinting at the pinned journey below the fold */}
      <div
        aria-hidden
        className="hero-rise absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2.5"
        style={{ animationDelay: "1.1s" }}
      >
        <span className="mono text-[9px] tracking-[0.32em] uppercase text-white/40">
          {dict.hero.scrollHint}
        </span>
        <span className="scroll-cue" />
      </div>
    </section>
  );
}
