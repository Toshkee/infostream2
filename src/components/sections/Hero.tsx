"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { Dict } from "@/lib/dictionaries";
import { EyebrowBars, Medallion, Starfield, tealPeriod, type IconName } from "./visuals";

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

gsap.registerPlugin(useGSAP);

// Hero metric chips — one line-art glyph per chip, in dictionary order
// (Years of experience · Delivery · Platforms · Development · Innovation). Icon
// choice is presentation, so it lives in code rather than the translatable copy.
const HERO_META_ICONS: IconName[] = ["clock", "infinity", "database", "code", "network"];

export default function Hero({ dict }: { dict: Dict }) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".hero-eyebrow", { opacity: 0, y: 14, duration: 0.7 })
        .from(".hero-title-word", { opacity: 0, y: 44, duration: 1.0, stagger: 0.07 }, "-=0.4")
        .from(".hero-body", { opacity: 0, y: 18, duration: 0.7 }, "-=0.6")
        .from(".hero-meta-row", { opacity: 0, y: 10, duration: 0.5, stagger: 0.08 }, "-=0.5");
    },
    { scope: ref }
  );

  const titleWords = dict.hero.title.split(" ");

  return (
    <section ref={ref} className="relative min-h-[100svh] overflow-hidden bg-[var(--bg-inset)] text-white">
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
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[var(--bg-inset)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-[1280px] flex-col justify-center px-6 pt-20 pb-8 md:pt-24 md:pb-12 lg:px-10">
        <div className="hero-eyebrow text-[11px] font-medium tracking-[0.25em] uppercase text-[var(--brand-teal-bright)] flex items-center gap-3">
          <EyebrowBars />
          {dict.hero.eyebrow}
        </div>
        <h1 className="font-display mt-6 text-[clamp(2.2rem,5.2vw,4.8rem)] leading-[1.02] tracking-[-0.025em] font-medium text-white max-w-4xl">
          {titleWords.map((w, i) => (
            <span key={i} className="hero-title-word inline-block mr-[0.22em]">
              {i === titleWords.length - 1 ? tealPeriod(w) : w}
            </span>
          ))}
        </h1>
        <p className="hero-body mt-6 max-w-xl text-white/70 text-[16.5px] leading-relaxed">{dict.hero.body}</p>

        {/* Capability chips — what we do, what we build on */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-white/10 border border-white/10 rounded-lg overflow-hidden max-w-4xl">
          {dict.hero.meta.map((m, i) => (
            <div key={i} className="hero-meta-row bg-[var(--bg-inset-elev)] px-4 py-3.5 flex items-center gap-3">
              <Medallion name={HERO_META_ICONS[i] ?? "infinity"} size="sm" />
              <div className="min-w-0">
                <div className="mono text-[9.5px] tracking-[0.2em] uppercase text-white/55 leading-tight">{m.k}</div>
                <div className="mono text-[15px] mt-1 text-white/90 leading-tight">{m.v}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
