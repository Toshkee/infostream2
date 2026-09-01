"use client";

import type { Dict } from "@/lib/dictionaries";
import { EyebrowBars, Starfield, tealPeriod } from "./visuals";

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
         seeded starfield and one soft brand glow keep it from reading flat. */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 50% 45%, #19223a 0%, #0d111c 70%, #07090f 100%)",
          }}
        />
        {/* One restrained brand glow keeps depth without adding another accent. */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 45% 40% at 78% 22%, rgba(72,184,177,0.07) 0%, transparent 70%)",
          }}
        />
        {/* The mobile hero stays a plain gradient so the first paint is cheap;
            desktop keeps the restrained dust field. */}
        <Starfield className="hidden sm:block" />
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
        <div className="mt-14 max-sm:hidden grid max-w-3xl grid-cols-2 gap-x-10 gap-y-7 sm:grid-cols-4">
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
    </section>
  );
}
