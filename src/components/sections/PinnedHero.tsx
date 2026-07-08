"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import CanvasErrorBoundary from "@/components/three/CanvasErrorBoundary";
import { seededRng } from "@/lib/rng";
import type { Dict } from "@/lib/dictionaries";

const HeroScene = dynamic(() => import("@/components/three/HeroScene"), {
  ssr: false,
  loading: () => null,
});

// Warm the heavy three.js chunk as early as the client bundle evaluates, instead
// of waiting for the motionOk effect to commit and mount <HeroScene/>. That chunk
// plus its three.js graph (~3 MB) otherwise gets fetched — and, under `next dev`,
// compiled on demand — exactly when the user first scrolls, which is the cold-start
// jank window where the process-section animation stutters before settling. Same
// literal path as the dynamic() import above so the bundler maps both to the one
// chunk; client-only (three touches browser globals), fire-and-forget (the real
// mount re-imports the same already-resolved module, so a failure here is harmless).
if (typeof window !== "undefined") {
  void import("@/components/three/HeroScene");
}

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Must be the exact string the CSS gate in globals.css uses — the pinned
// variant displays iff this matches, so the pin always has its JS. All screen
// widths get the pinned experience; below 1024px the stages render a compacted
// form (secondary blocks hidden, long copy clamped — see the phone compaction
// block in globals.css) so each scene fits the 100svh pin without clipping.
// The height floor sends very short windows to the static variant.
const MOTION_QUERY = "(prefers-reduced-motion: no-preference) and (min-height: 500px)";
// Desktop-only extras — currently just the cursor parallax, which is
// meaningless on touch devices.
const ENHANCED_QUERY = "(min-width: 900px) and (prefers-reduced-motion: no-preference) and (min-height: 500px)";

// ─── Per-scene abstract art (mirror dict.services.items order) ───
// Not literal icons: each service gets an abstract geometric composition in a
// 160×160 stroke space — thin concentric forms, orbits, lattices — with slow
// ambient motion driven by the svcart-* CSS keyframes in globals.css. Rotating
// or scaling parts carry inline transform-box: view-box + a px transform-origin
// (SVG CSS transforms default to a broken origin otherwise). Kept in code (not
// the dictionary) because the art is presentation, not copy.
const CENTER = { transformBox: "view-box", transformOrigin: "80px 80px" } as const;
const SERVICE_ART: ReactNode[] = [
  // Software development — recursion: nested rounded squares counter-rotating
  <>
    <rect className="svcart-spin" style={CENTER} x="25" y="25" width="110" height="110" rx="20" opacity="0.3" />
    <g transform="rotate(15 80 80)">
      <rect className="svcart-spin-rev" style={CENTER} x="42" y="42" width="76" height="76" rx="15" opacity="0.55" />
    </g>
    <g transform="rotate(30 80 80)">
      <rect className="svcart-spin" style={{ ...CENTER, animationDuration: "16s" }} x="58" y="58" width="44" height="44" rx="10" />
    </g>
    <circle className="svcart-blink" cx="80" cy="80" r="3" fill="currentColor" stroke="none" />
  </>,
  // Oracle APEX — the stack: floating isometric planes on a data axis
  <>
    <path className="svcart-flow" d="M80 16v128" opacity="0.35" />
    <g className="svcart-floaty" style={CENTER}>
      <path d="M80 28L128 50L80 72L32 50Z" opacity="0.35" />
    </g>
    <g className="svcart-floaty" style={{ ...CENTER, animationDelay: "0.7s" }}>
      <path d="M80 58L128 80L80 102L32 80Z" opacity="0.6" />
    </g>
    <g className="svcart-floaty" style={{ ...CENTER, animationDelay: "1.4s" }}>
      <path d="M80 88L128 110L80 132L32 110Z" />
    </g>
    <circle className="svcart-blink" cx="80" cy="28" r="2.5" fill="currentColor" stroke="none" />
  </>,
  // Digital transformation — signal: dashed ring resolving into a solid core
  <>
    <g className="svcart-spin" style={CENTER}>
      <circle cx="80" cy="80" r="58" strokeDasharray="4 10" opacity="0.4" />
      <circle cx="80" cy="22" r="2.5" fill="currentColor" stroke="none" />
    </g>
    <circle className="svcart-flow" cx="80" cy="80" r="40" opacity="0.55" />
    <circle className="svcart-breathe" style={CENTER} cx="80" cy="80" r="22" />
    <circle className="svcart-blink" cx="80" cy="80" r="3" fill="currentColor" stroke="none" />
  </>,
  // IT infrastructure — lattice: layered horizontals swept by a signal line
  <>
    <path d="M25 40h110" opacity="0.3" />
    <path d="M25 60h110" opacity="0.5" />
    <path d="M25 80h110" opacity="0.7" />
    <path d="M25 100h110" opacity="0.5" />
    <path d="M25 120h110" opacity="0.3" />
    <path d="M52 32v96M80 32v96M108 32v96" opacity="0.12" />
    <circle className="svcart-blink" cx="52" cy="60" r="2.5" fill="currentColor" stroke="none" />
    <circle className="svcart-blink" style={{ animationDelay: "0.9s" }} cx="108" cy="80" r="2.5" fill="currentColor" stroke="none" />
    <circle className="svcart-blink" style={{ animationDelay: "1.7s" }} cx="80" cy="100" r="2.5" fill="currentColor" stroke="none" />
    <path className="svcart-beam svcart-sweep" d="M25 34v92" />
  </>,
  // System integrations — orbit: satellites circling a pulsing hub
  <>
    <path d="M95 80l-7.5 13h-15L65 80l7.5-13h15z" />
    <path className="svcart-ring" style={CENTER} d="M95 80l-7.5 13h-15L65 80l7.5-13h15z" />
    <circle cx="80" cy="80" r="38" opacity="0.35" />
    <circle cx="80" cy="80" r="58" opacity="0.2" />
    <g className="svcart-spin" style={{ ...CENTER, animationDuration: "14s" }}>
      <circle cx="80" cy="22" r="3.5" fill="currentColor" stroke="none" />
      <circle cx="80" cy="138" r="2" fill="currentColor" stroke="none" opacity="0.6" />
    </g>
    <g className="svcart-spin-rev" style={{ ...CENTER, animationDuration: "9s" }}>
      <circle cx="80" cy="42" r="3" fill="currentColor" stroke="none" />
    </g>
  </>,
  // AI — neuron: a breathing core feeding six synapses on a slow outer ring
  <>
    <circle className="svcart-spin" style={CENTER} cx="80" cy="80" r="62" strokeDasharray="4 10" opacity="0.25" />
    <path className="svcart-flow" d="M89 80h39M84.5 87.8l19.5 33.8M75.5 87.8l-19.5 33.8M71 80H32M75.5 72.2L56 38.4M84.5 72.2l19.5-33.8" opacity="0.6" />
    <circle className="svcart-breathe" style={CENTER} cx="80" cy="80" r="10" />
    <circle cx="80" cy="80" r="3" fill="currentColor" stroke="none" />
    <circle className="svcart-blink" cx="128" cy="80" r="3" fill="currentColor" stroke="none" />
    <circle className="svcart-blink" style={{ animationDelay: "0.4s" }} cx="104" cy="121.6" r="3" fill="currentColor" stroke="none" />
    <circle className="svcart-blink" style={{ animationDelay: "0.8s" }} cx="56" cy="121.6" r="3" fill="currentColor" stroke="none" />
    <circle className="svcart-blink" style={{ animationDelay: "1.2s" }} cx="32" cy="80" r="3" fill="currentColor" stroke="none" />
    <circle className="svcart-blink" style={{ animationDelay: "1.6s" }} cx="56" cy="38.4" r="3" fill="currentColor" stroke="none" />
    <circle className="svcart-blink" style={{ animationDelay: "2s" }} cx="104" cy="38.4" r="3" fill="currentColor" stroke="none" />
  </>,
];

// Hero intro metric chips — one line-art glyph per chip, in dictionary order
// (Years of experience · Delivery · Platforms · Development · Innovation). Icon
// choice is presentation, so it lives in code rather than the translatable copy.
const HERO_META_ICONS: IconName[] = ["clock", "infinity", "database", "code", "network"];

// CSSProperties widened to accept custom properties (--vars).
type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

/* ── Scroll-driven reveal helpers ──
   The pinned container carries a --ph CSS variable (0..5) written once per
   scrubbed frame by ScrollTrigger. Each stage wrapper derives --u = --ph - stage
   (so --u is 0 exactly when that stage is centered). Every entrance below is a
   pure function of those variables — deterministic, replays in reverse when
   scrolling back, and needs no timers. The static variant sets --u: 1 so
   everything renders in its final, settled state. */

// Maps --u onto a 0..1 reveal var --r starting at `start` over `len`, applied
// as opacity + a small lift. lift=0 keeps the transform free for SVG nodes /
// elements that carry their own transform (e.g. the rotated stamp).
const rev = (start: number, len = 0.1, lift = 6): CSSVars => ({
  "--r": `clamp(0, calc((var(--u) - ${start}) / ${len}), 1)`,
  opacity: "var(--r)",
  transform: lift ? `translateY(calc((1 - var(--r)) * ${lift}px))` : undefined,
});

// Trapezoid opacity around `target`: full within ±0.35, crossing 0.5 exactly at
// the midpoint between adjacent scenes — a true crossfade, so transitions hand
// off without the old fade-through-black moment.
const sceneStyle = (target: number): CSSVars => ({
  "--so": `clamp(0, min(calc((var(--ph) - ${target - 0.65}) / 0.3), calc((${target + 0.65} - var(--ph)) / 0.3)), 1)`,
  opacity: "var(--so)",
  // Directional drift: the outgoing scene slides up while the incoming one
  // rises from below, so adjacent scenes never superimpose at the same y
  // during the crossfade — the 50/50 moment reads as travel, not ghosting.
  transform: `translateY(clamp(-20px, calc((var(--ph) - ${target}) * -24px), 20px))`,
});

// Stage description — clip-path wipe (top to bottom) in place of the old
// timer-driven typewriter, so the text is always exactly as revealed as the
// scroll position says it should be.
const descStyle: CSSVars = {
  "--r": "clamp(0, calc((var(--u) + 0.42) / 0.22), 1)",
  clipPath: "inset(0 0 calc((1 - var(--r)) * 100%) 0)",
  opacity: "calc(0.25 + 0.75 * var(--r))",
};

type PhaseHandle = { update: (phase: number) => void };

export default function PinnedHero({ dict }: { dict: Dict }) {
  const outer = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const parallax = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(0);
  const constellation = useRef<PhaseHandle | null>(null);
  const stepper = useRef<PhaseHandle | null>(null);
  const [activeScene, setActiveScene] = useState(0);
  const [exitActive, setExitActive] = useState(false);
  // True while the pinned variant is the one displayed — gates the WebGL
  // canvas so the hidden static variant never pays for it.
  const [motionOk, setMotionOk] = useState(false);
  // Desktop only — gates the cursor-parallax rAF loop.
  const [enhanced, setEnhanced] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia(MOTION_QUERY);
    const desktop = window.matchMedia(ENHANCED_QUERY);
    const apply = () => {
      setMotionOk(motion.matches);
      setEnhanced(desktop.matches);
    };
    apply();
    motion.addEventListener("change", apply);
    desktop.addEventListener("change", apply);
    return () => {
      motion.removeEventListener("change", apply);
      desktop.removeEventListener("change", apply);
    };
  }, []);

  // Cursor parallax on the constellation layer — imperative rAF loop, kept out
  // of React state so it never re-renders the tree.
  useEffect(() => {
    if (!enhanced) return;
    const el = pin.current;
    const layer = parallax.current;
    if (!el || !layer) return;
    let raf = 0;
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      target.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    const tick = () => {
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      layer.style.transform = `translate3d(${(-current.x * 14).toFixed(2)}px, ${(-current.y * 10).toFixed(2)}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
      // Clear the residual parallax offset so a later non-enhanced layout
      // doesn't keep the last cursor-driven translate.
      layer.style.transform = "";
    };
  }, [enhanced]);

  useGSAP(
    () => {
      // Pins recalculate badly when the mobile URL bar shows/hides — ignore
      // those height-only resizes (standard ScrollTrigger mobile practice).
      ScrollTrigger.config({ ignoreMobileResize: true });
      const mm = gsap.matchMedia();
      // Mirrors the CSS gate: the trigger exists exactly while the pinned
      // variant is displayed, and gsap.matchMedia reverts it if that changes.
      mm.add(MOTION_QUERY, () => {
        if (!pin.current) return;
        const stops = 7; // intro (0) + six service scenes (1..6) + exit pull-back (6..7)

        ScrollTrigger.create({
          trigger: pin.current,
          start: "top top",
          // Phones get a shorter swipe per scene — a long thumb-scroll per
          // stop reads as broken; services scenes are light, so the per-stop
          // distance is shorter than the old four-stage choreography used.
          end: () => `+=${stops * window.innerHeight * (window.innerWidth < 900 ? 1.0 : 1.35)}`,
          pin: pin.current,
          pinSpacing: true,
          scrub: 0.6,
          onUpdate: (self) => {
            const p = self.progress * stops; // 0..7
            // One CSS variable drives every scroll-coupled style below; the
            // imperative handles cover the SVG attributes CSS can't reach.
            pin.current?.style.setProperty("--ph", p.toFixed(4));
            // The 3D pipeline now has six nodes (one per service scene), so it
            // takes the raw phase; the 2D constellation pan was authored for
            // the original 0..5 domain, so it gets a scaled copy.
            phaseRef.current = p;
            constellation.current?.update(p * (5 / stops));
            stepper.current?.update(p);
            // Discrete state — React only re-renders on scene boundaries.
            setActiveScene(Math.max(0, Math.min(6, Math.round(p))));
            setExitActive(p > 6.55);
          },
        });

        // Intro entry animation (runs once per activation)
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from(".hero-eyebrow", { opacity: 0, y: 14, duration: 0.7 })
          .from(".hero-title-word", { opacity: 0, y: 44, duration: 1.0, stagger: 0.07 }, "-=0.4")
          .from(".hero-body", { opacity: 0, y: 18, duration: 0.7 }, "-=0.6")
          .from(".hero-meta-row", { opacity: 0, y: 10, duration: 0.5, stagger: 0.08 }, "-=0.5");
      });
    },
    { scope: outer }
  );

  const titleWords = dict.hero.title.split(" ");
  const services = dict.services.items;

  return (
    <div id="platform" ref={outer} className="relative bg-[var(--bg-inset)]">
      {/* ════ Pinned scroll-scrubbed variant (all motion-OK visitors — gated in CSS) ════ */}
      <div className="process-pinned">
        <div
          ref={pin}
          className="relative h-[100svh] w-full overflow-hidden text-white"
          style={{ "--ph": 0 } as CSSVars}
        >
          {/* Dark backdrop + constellation network. The SVG viewBox pans toward
             the next cluster as --ph advances (the "dive" between bubbles). */}
          <div className="absolute inset-0 z-0 overflow-hidden bg-[var(--bg-inset)]">
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 90% 70% at 50% 45%, #19223a 0%, #0d111c 70%, #07090f 100%)",
              }}
            />
            {/* 3D process pipeline — mounted whenever the pinned variant is
               live, phones included, at the same full treatment as desktop. */}
            {motionOk && (
              <div className="absolute inset-0 pointer-events-none">
                <CanvasErrorBoundary>
                  <HeroScene phaseRef={phaseRef} />
                </CanvasErrorBoundary>
              </div>
            )}
            {/* 2D constellation backdrop — strong during the intro, fades back as
               the 3D pipeline takes over. */}
            <div
              ref={parallax}
              className="absolute inset-0 will-change-transform"
              style={{ opacity: "clamp(0.2, calc(1 - var(--ph) * 0.55), 1)" }}
            >
              {/* Full strength on every screen size — the "planets" are the
                 backdrop's identity, same on a phone as on a desktop. */}
              <div className="absolute inset-0">
                <Constellation handleRef={constellation} />
              </div>
            </div>
            {/* Left-side wash so the constellation never fights the text column */}
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-inset)] from-15% via-[var(--bg-inset)]/55 via-45% to-transparent" />
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[var(--bg-inset)] to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[var(--bg-inset)]" />
            {/* Exit darken — fades the scene before unpin */}
            <div
              className="absolute inset-0 bg-[var(--bg-inset)] pointer-events-none"
              style={{ opacity: "calc(clamp(0, calc((var(--ph) - 6.55) / 0.4), 1) * 0.75)" }}
            />
          </div>

          {/* corner ticks */}
          {["top-6 left-6", "top-6 right-6", "bottom-6 left-6", "bottom-6 right-6"].map((c, i) => (
            <span
              key={i}
              aria-hidden
              className={`absolute ${c} h-3 w-3 z-10`}
              style={{
                borderTopWidth: c.includes("top") ? 1 : 0,
                borderBottomWidth: c.includes("bottom") ? 1 : 0,
                borderLeftWidth: c.includes("left") ? 1 : 0,
                borderRightWidth: c.includes("right") ? 1 : 0,
                borderColor: "rgba(255,255,255,0.3)",
              }}
            />
          ))}

          {/* Scene progress indicator */}
          <div aria-hidden className="absolute top-1/2 right-6 lg:right-10 -translate-y-1/2 z-20 flex flex-col gap-3">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <span
                key={i}
                className={`block h-px transition-all duration-500 ${
                  i === activeScene ? "w-10 bg-[var(--brand-teal-bright)]" : "w-5 bg-white/25"
                }`}
              />
            ))}
          </div>

          {/* All content scenes — wrapper fades everything out together on exit. */}
          <div
            className="absolute inset-0 z-10 pointer-events-none"
            style={{ opacity: "clamp(0, calc((6.78 - var(--ph)) / 0.33), 1)" }}
          >
            <div className="absolute inset-0 pointer-events-auto">
              {/* Scene 0 — Intro */}
              <Scene target={0} interactive={activeScene === 0}>
                <div className="hero-eyebrow mono text-[11px] tracking-[0.25em] uppercase text-[var(--brand-teal-bright)] flex items-center gap-3">
                  <EyebrowBars />
                  {dict.hero.eyebrow}
                </div>
                {/* Visual title only — the document's h1 lives in the sr-only
                   block below so it never drops out of the accessibility tree
                   when this scene goes inert mid-scroll. */}
                <p aria-hidden className="mt-6 text-[clamp(2.2rem,5.2vw,4.8rem)] leading-[1.02] tracking-[-0.025em] font-medium text-white max-w-4xl">
                  {titleWords.map((w, i) => (
                    <span key={i} className="hero-title-word inline-block mr-[0.22em]">
                      {i === titleWords.length - 1 ? tealPeriod(w) : w}
                    </span>
                  ))}
                </p>
                <p className="hero-body mt-6 max-w-xl text-white/70 text-[16.5px] leading-relaxed">{dict.hero.body}</p>

                {/* Capability chips — what we do, what we build on */}
                <div className="hero-meta-grid mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-white/10 border border-white/10 rounded-lg overflow-hidden max-w-4xl">
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
              </Scene>

              {/* Scenes 1–6 — the services, one per scene, riding the same
                 scroll choreography the process stages used. Visual layer is
                 decorative; the canonical, screen-reader-facing copy lives in
                 the sr-only block below (and in the static variant). */}
              {services.map((svc, i) => (
                <Scene key={i} target={i + 1} interactive={false} decorative>
                  <div className="w-full max-w-[1040px]" style={{ "--u": `calc(var(--ph) - ${i + 1})` } as CSSVars}>
                    <div className="grid items-center gap-10 md:grid-cols-[1fr_auto]">
                      <div>
                        <div
                          className="mono text-[11px] tracking-[0.25em] uppercase text-[var(--brand-teal-bright)]"
                          style={rev(-0.42, 0.12, 6)}
                        >
                          {dict.services.eyebrow}
                        </div>
                        <div className="mt-5">
                          <StageHeading index={i} total={services.length} name={svc.k} description={svc.v} />
                        </div>
                      </div>
                      {/* Instrument panel — the abstract composition sits on a
                         blueprint grid with HUD corner brackets and a status
                         caption strip. The layers reveal staggered (frame →
                         grid → brackets → art → caption) so the panel reads as
                         assembling while the scene arrives; each layer is a
                         rev() of the same --u, so it replays in reverse. */}
                      <div
                        className="hidden md:block relative h-72 w-64 lg:h-80 lg:w-72 shrink-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.01]"
                        style={rev(-0.36, 0.14, 12)}
                      >
                        {/* blueprint grid */}
                        <div
                          aria-hidden
                          className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(120%_90%_at_50%_40%,black_40%,transparent_100%)]"
                          style={rev(-0.3, 0.14, 0)}
                        />
                        {/* corner brackets */}
                        <div aria-hidden style={rev(-0.24, 0.1, 0)}>
                          <div className="absolute left-3 top-3 h-3 w-3 border-l border-t border-[var(--brand-teal-bright)]/45" />
                          <div className="absolute right-3 top-3 h-3 w-3 border-r border-t border-[var(--brand-teal-bright)]/45" />
                          <div className="absolute left-3 bottom-12 h-3 w-3 border-l border-b border-[var(--brand-teal-bright)]/45" />
                          <div className="absolute right-3 bottom-12 h-3 w-3 border-r border-b border-[var(--brand-teal-bright)]/45" />
                        </div>
                        {/* art */}
                        <div
                          className="absolute inset-x-0 top-0 bottom-9 grid place-items-center text-[var(--brand-teal-bright)]"
                          style={rev(-0.2, 0.18, 14)}
                        >
                          <svg
                            viewBox="0 0 160 160"
                            className="h-44 w-44 lg:h-52 lg:w-52 drop-shadow-[0_0_18px_rgba(72,184,177,0.14)]"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            {SERVICE_ART[i]}
                          </svg>
                        </div>
                        {/* caption strip */}
                        <div
                          className="absolute inset-x-0 bottom-0 flex items-center gap-2.5 border-t border-white/[0.08] bg-white/[0.02] px-4 py-2.5 mono text-[9.5px] tracking-[0.2em] uppercase"
                          style={rev(-0.08, 0.12, 8)}
                        >
                          <span aria-hidden className="svcart-blink h-1.5 w-1.5 rounded-full bg-[var(--brand-teal-bright)]" />
                          <span className="text-white/35">sys.{String(i + 1).padStart(2, "0")}</span>
                          <span className="ml-auto truncate text-white/60">{svc.k}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Scene>
              ))}
            </div>
          </div>

          {/* Stream stepper — visible across all six service scenes. Hidden on
             phones: scaled to a phone width its labels drop below legibility. */}
          <div
            aria-hidden
            className="process-stepper absolute left-1/2 -translate-x-1/2 bottom-10 z-30 pointer-events-none w-[92vw] max-w-[1040px] hidden sm:block"
            style={{ opacity: "clamp(0, min(calc((var(--ph) - 0.3) / 0.3), calc((6.75 - var(--ph)) / 0.3)), 1)" }}
          >
            <HexStepper
              labels={services.map((s) => ({ name: s.k }))}
              activeIndex={Math.max(0, activeScene - 1)}
              handleRef={stepper}
            />
          </div>

          {/* Exit overlay — Infostream lockup on the dark backdrop */}
          <div
            aria-hidden
            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
            style={{ opacity: "clamp(0, calc((var(--ph) - 6.6) / 0.3), 1)" }}
          >
            <div className="text-center px-6">
              <div className="relative mx-auto flex items-center justify-center">
                {/* Mount only once the exit actually begins so the lockup plays
                   its entrance exactly once, here. */}
                {exitActive && <LogoLockup />}
              </div>
              <div className="mt-7 text-[clamp(1.6rem,3.6vw,2.6rem)] leading-[1.1] tracking-[-0.02em] font-medium text-white max-w-3xl mx-auto">
                {dict.hero.exitTitle} <span className="text-[var(--brand-teal-bright)]">{dict.hero.exitAccent}</span>
              </div>
              <div className="mt-7 mono text-[11px] tracking-[0.25em] uppercase text-white/55">
                ↓ {dict.hero.exitScrollHint}
              </div>
            </div>
          </div>
        </div>

        {/* Canonical services content for assistive tech — the animated scenes
           above are aria-hidden decoration. Hidden with the pinned variant, so
           small screens never get duplicate content. */}
        <div className="sr-only">
          <h1>{dict.hero.title}</h1>
          <p>{dict.hero.body}</p>
          <h2>{dict.services.title}</h2>
          <p>{dict.services.body}</p>
          {services.map((svc, i) => (
            <section key={i}>
              <h3>{svc.k}</h3>
              <p>{svc.v}</p>
            </section>
          ))}
        </div>
      </div>

      {/* ════ Static stacked variant (reduced-motion + no-JS fallback — gated in CSS) ════ */}
      <section className="process-static relative overflow-hidden text-white">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 120% 60% at 50% 0%, #19223a 0%, #0d111c 60%, #0d111c 100%)",
          }}
        />

        {/* Hero */}
        <div className="relative mx-auto max-w-[1280px] px-6 pt-32 pb-16">
          <div className="mono text-[11px] tracking-[0.25em] uppercase text-[var(--brand-teal-bright)] flex items-center gap-3">
            <EyebrowBars />
            {dict.hero.eyebrow}
          </div>
          <h1 className="mt-6 text-[clamp(2.2rem,5.2vw,4.8rem)] leading-[1.02] tracking-[-0.025em] font-medium text-white max-w-4xl">
            {tealPeriod(dict.hero.title)}
          </h1>
          <p className="mt-6 max-w-xl text-white/70 text-[16.5px] leading-relaxed">{dict.hero.body}</p>
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-white/10 border border-white/10 rounded-lg overflow-hidden max-w-4xl">
            {dict.hero.meta.map((m, i) => (
              <div key={i} className="bg-[var(--bg-inset-elev)] px-4 py-3.5 flex items-center gap-3">
                <Medallion name={HERO_META_ICONS[i] ?? "infinity"} size="sm" />
                <div className="min-w-0">
                  <div className="mono text-[9.5px] tracking-[0.2em] uppercase text-white/55 leading-tight">{m.k}</div>
                  <div className="mono text-[15px] mt-1 text-white/90 leading-tight">{m.v}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Services, stacked. --u: 1 renders every block fully settled. */}
        <div className="relative mx-auto max-w-[1280px] px-6 pb-20">
          <div className="mono text-[10px] tracking-[0.28em] uppercase text-white/55">{dict.services.eyebrow}</div>
          <h2 className="mt-3 text-[clamp(1.8rem,6vw,2.6rem)] leading-[1.05] tracking-[-0.02em] font-medium text-white">
            {dict.services.title}
          </h2>
          <p className="mt-4 max-w-xl text-white/70 text-[15.5px] leading-relaxed">{dict.services.body}</p>

          <div className="mt-12 space-y-14">
            {services.map((svc, i) => (
              <article key={i} style={{ "--u": 1 } as CSSVars}>
                <StageHeading index={i} total={services.length} name={svc.k} description={svc.v} heading />
              </article>
            ))}
          </div>

          <p className="mt-16 text-[clamp(1.3rem,4.5vw,1.8rem)] leading-[1.15] tracking-[-0.02em] font-medium text-white max-w-2xl">
            {dict.hero.exitTitle} <span className="text-[var(--brand-teal-bright)]">{dict.hero.exitAccent}</span>
          </p>
        </div>
      </section>
    </div>
  );
}

// Colours a title's trailing full stop teal — the one accent glyph in the hero
// headline, matching the homepage mockup. Returns the word untouched if it has
// no closing punctuation.
function tealPeriod(text: string): ReactNode {
  const m = text.match(/^([\s\S]*?)([.!?]+)$/);
  if (!m) return text;
  return (
    <>
      {m[1]}
      <span className="text-[var(--brand-teal-bright)]">{m[2]}</span>
    </>
  );
}

// Pulsing signal bars used in the hero eyebrow (both variants).
function EyebrowBars() {
  return (
    <span aria-hidden className="flex items-end gap-[3px] h-3">
      <span className="bar-pulse inline-block w-[3px] h-full bg-[var(--brand-teal-bright)]" style={{ animationDelay: "0s" }} />
      <span className="bar-pulse inline-block w-[3px] h-2 bg-[var(--brand-teal-bright)]" style={{ animationDelay: "0.15s" }} />
      <span className="bar-pulse inline-block w-[3px] h-full bg-[var(--brand-teal-bright)]" style={{ animationDelay: "0.3s" }} />
      <span className="bar-pulse inline-block w-[3px] h-1.5 bg-[var(--brand-teal-bright)]" style={{ animationDelay: "0.45s" }} />
    </span>
  );
}

function Scene({
  target,
  interactive,
  decorative = false,
  align = "center",
  children,
}: {
  target: number;
  interactive: boolean;
  decorative?: boolean;
  align?: "center" | "top";
  children: React.ReactNode;
}) {
  // Opacity/lift are CSS functions of --ph; React only flips the discrete
  // interaction state. Non-interactive layers are inert so nothing hidden can
  // be tabbed into or read mid-animation.
  return (
    <div
      className="absolute inset-0 z-10"
      style={{
        ...sceneStyle(target),
        pointerEvents: interactive ? "auto" : "none",
        willChange: "opacity, transform",
      }}
      aria-hidden={decorative || !interactive}
      inert={!interactive}
    >
      <div
        className={`mx-auto max-w-[1280px] h-full px-6 lg:px-10 flex flex-col ${
          align === "top"
            ? "process-scene-top justify-start pt-24 md:pt-28 pb-32"
            : "justify-center pt-20 pb-8 md:pt-24 md:pb-12"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Stage heading: hollow stage number + title + description ───
// `heading` renders the title as a real <h3> (static variant, where this is the
// canonical, visible content); the pinned variant leaves it a <div> because that
// scene is aria-hidden decoration and the real headings live in the sr-only block.
function StageHeading({
  index,
  total,
  name,
  description,
  heading = false,
}: {
  index: number;
  total: number;
  name: string;
  description: string;
  heading?: boolean;
}) {
  const num = String(index + 1).padStart(2, "0");
  const tot = String(total).padStart(2, "0");
  const Title = heading ? "h3" : "div";
  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="flex items-baseline gap-2 leading-none shrink-0">
          <span
            className="font-medium text-[clamp(2rem,3.4vw,3rem)] leading-none tracking-[-0.04em] text-transparent"
            style={{ WebkitTextStroke: "1px var(--brand-teal-bright)" }}
          >
            {num}
          </span>
          <span className="mono text-[11px] tracking-[0.22em] text-white/45">/ {tot}</span>
        </div>
        <span
          aria-hidden
          className="hidden sm:block flex-1 h-px mb-2 bg-gradient-to-r from-[var(--brand-teal-bright)]/55 to-transparent"
          style={{ boxShadow: "0 0 6px -2px var(--brand-teal-bright)" }}
        />
      </div>
      <Title className="mt-3 text-[clamp(1.9rem,4.2vw,3.4rem)] leading-[1.02] tracking-[-0.025em] font-medium text-white">
        {name}
      </Title>
      <p className="process-stage-desc mt-3 max-w-xl text-white/65 text-[14.5px] leading-relaxed" style={descStyle}>
        {description}
      </p>
    </div>
  );
}

// ─── Circular line-art icon medallion ───
function Medallion({
  name,
  size = "md",
  tone = "teal",
}: {
  name: IconName;
  size?: "sm" | "md";
  tone?: "teal" | "danger" | "warn";
}) {
  const dim = size === "sm" ? "w-9 h-9" : "w-11 h-11";
  const ic = size === "sm" ? "w-4 h-4" : "w-[18px] h-[18px]";
  const tint =
    tone === "danger"
      ? "border-[var(--brand-red)]/50 text-[var(--brand-red)]"
      : tone === "warn"
      ? "border-[var(--brand-teal-bright)]/35 text-[var(--brand-red)]"
      : "border-[var(--brand-teal-bright)]/35 text-[var(--brand-teal-bright)]";
  return (
    <span className={`relative grid place-items-center rounded-full border shrink-0 ${tint} ${dim}`}>
      <Icon name={name} className={ic} />
    </span>
  );
}

/* ─── Line-art icon set ───
   No emoji, single consistent stroke weight — one icon family across the section. */
type IconName =
  | "target"
  | "targetAccent"
  | "fileText"
  | "alertTriangle"
  | "shieldCheck"
  | "shield"
  | "users"
  | "list"
  | "eye"
  | "shapes"
  | "blueprint"
  | "rocket"
  | "box"
  | "clipboardCheck"
  | "activity"
  | "monitor"
  | "barChart"
  | "radar"
  | "trendingUp"
  | "info"
  | "check"
  | "infinity"
  | "clock"
  | "database"
  | "code"
  | "network";

const ICONS: Record<IconName, ReactNode> = {
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <line x1="12" y1="1.5" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22.5" />
      <line x1="1.5" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22.5" y2="12" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  // Same crosshair, but the bullseye is painted brand-red — the small pop of
  // colour on the Discovery "Business goals" outcome (per fo.png).
  targetAccent: (
    <>
      <circle cx="12" cy="12" r="8" />
      <line x1="12" y1="1.5" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22.5" />
      <line x1="1.5" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22.5" y2="12" />
      <circle cx="12" cy="12" r="2.2" fill="var(--brand-red)" stroke="none" />
    </>
  ),
  fileText: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </>
  ),
  alertTriangle: (
    <>
      <path d="M10.3 3.7 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
      <line x1="12" y1="9" x2="12" y2="13.5" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  shieldCheck: (
    <>
      <path d="M12 2 4 5v6c0 5 3.4 8.2 8 10 4.6-1.8 8-5 8-10V5z" />
      <path d="m8.5 12 2.5 2.5 4.5-4.5" />
    </>
  ),
  shield: <path d="M12 2 4 5v6c0 5 3.4 8.2 8 10 4.6-1.8 8-5 8-10V5z" />,
  users: (
    <>
      <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" />
      <circle cx="10" cy="8" r="3.2" />
      <path d="M19.5 20v-1.5a3.5 3.5 0 0 0-2.6-3.4" />
      <path d="M15.5 5.2a3.2 3.2 0 0 1 0 6" />
    </>
  ),
  list: (
    <>
      <line x1="8.5" y1="6.5" x2="20" y2="6.5" />
      <line x1="8.5" y1="12" x2="20" y2="12" />
      <line x1="8.5" y1="17.5" x2="20" y2="17.5" />
      <circle cx="4.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="17.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  shapes: (
    <>
      <circle cx="17" cy="17" r="3.2" />
      <rect x="4" y="13" width="7" height="7" rx="1" />
      <path d="M8.5 3.5 12.5 10.5H4.5Z" />
    </>
  ),
  // Blueprint / plan sheet — a framed drawing with two component squares, an
  // accent circle and dimension lines (the Architecture "Design" card).
  blueprint: (
    <>
      <rect x="4" y="3.5" width="16" height="17" rx="1.5" />
      <rect x="7" y="7" width="4" height="3.8" rx="0.5" />
      <rect x="7" y="13.5" width="4" height="3.5" rx="0.5" />
      <circle cx="16" cy="9" r="1.8" />
      <line x1="13.6" y1="14" x2="17.5" y2="14" />
      <line x1="13.6" y1="16.5" x2="17.5" y2="16.5" />
    </>
  ),
  rocket: (
    <>
      <path d="M5 14c-1.5 1-2 5-2 5s4-.5 5-2c.8-1 .7-2.3-.2-3a2 2 0 0 0-2.8 0Z" />
      <path d="M12.5 14.5 9.5 11.5c.5-2 1.5-4 3-5.5C15 3.5 18.5 3 21 3c0 2.5-.5 6-3 8.5-1.5 1.5-3.5 2.5-5.5 3Z" />
      <path d="M9.5 11.5 6 11s.5-2.5 2-3.5" />
      <path d="M12.5 14.5 13 18s2.5-.5 3.5-2" />
    </>
  ),
  box: (
    <>
      <path d="M20.5 8 12 3.5 3.5 8v8L12 20.5 20.5 16Z" />
      <path d="m3.5 8 8.5 4.5 8.5-4.5" />
      <line x1="12" y1="20.5" x2="12" y2="12.5" />
    </>
  ),
  clipboardCheck: (
    <>
      <rect x="8" y="3" width="8" height="4" rx="1" />
      <path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </>
  ),
  activity: <path d="M3 12h3l2.5-6 4 13 3-9 1.5 2h4" />,
  // Monitor with a heartbeat trace inside the screen (the Operate "Monitoring"
  // row) — a screen frame + pulse line + stand, not a bare ECG polyline.
  monitor: (
    <>
      <rect x="2.5" y="4" width="19" height="12.5" rx="1.5" />
      <path d="M6 10.2h2.2l1.4-3 2 5.4 1.5-2.4h3.4" />
      <line x1="9.5" y1="20.5" x2="14.5" y2="20.5" />
      <line x1="12" y1="16.5" x2="12" y2="20.5" />
    </>
  ),
  barChart: (
    <>
      <line x1="4" y1="21" x2="20" y2="21" />
      <line x1="7.5" y1="21" x2="7.5" y2="13" />
      <line x1="12" y1="21" x2="12" y2="8" />
      <line x1="16.5" y1="21" x2="16.5" y2="4" />
    </>
  ),
  radar: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="12" x2="19" y2="7" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  trendingUp: (
    <>
      <polyline points="3 17 9 11 13 15 21 7" />
      <polyline points="15 7 21 7 21 13" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16" />
      <circle cx="12" cy="8" r="0.7" fill="currentColor" stroke="none" />
    </>
  ),
  check: <polyline points="4 12 9 17 20 6" />,
  infinity: (
    <path d="M7 9a3 3 0 1 0 0 6c1.7 0 3-1.4 5-3 2 1.6 3.3 3 5 3a3 3 0 1 0 0-6c-1.7 0-3 1.4-5 3-2-1.6-3.3-3-5-3Z" />
  ),
  // Clock — years of experience.
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  // Stacked-disk database — the platforms we build on.
  database: (
    <>
      <ellipse cx="12" cy="5.5" rx="7" ry="2.5" />
      <path d="M5 5.5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" />
      <path d="M5 11.5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" />
    </>
  ),
  // Angle brackets + slash — software development.
  code: (
    <>
      <polyline points="8 8 4 12 8 16" />
      <polyline points="16 8 20 12 16 16" />
      <line x1="13.5" y1="6" x2="10.5" y2="18" />
    </>
  ),
  // Connected nodes — AI / innovation.
  network: (
    <>
      <circle cx="12" cy="12" r="2.2" />
      <circle cx="5" cy="6" r="1.8" />
      <circle cx="19" cy="7" r="1.8" />
      <circle cx="17" cy="18" r="1.8" />
      <line x1="10.3" y1="10.7" x2="6.4" y2="7.2" />
      <line x1="13.9" y1="11" x2="17.3" y2="8.2" />
      <line x1="13.2" y1="13.7" x2="16" y2="16.5" />
    </>
  ),
};

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {ICONS[name]}
    </svg>
  );
}

/* ─────────── Stream stepper ───────────
   Gentle wave curve connecting the 4 stage nodes; dashes flow along it and a
   teal droplet rides the curve. Continuous progress (fill + droplet) is written
   imperatively through `handle` by the ScrollTrigger; React only re-renders the
   node/label states on scene changes. */
const STREAM_W = 1040;
const STREAM_H = 72;
const STREAM_NODES_X = [90, 270, 450, 630, 810, 990];
const STREAM_NODES_Y = [38, 22, 50, 28, 46, 32];

function buildStreamPath(): string {
  const pts = STREAM_NODES_X.map((x, i) => [x, STREAM_NODES_Y[i]] as [number, number]);
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const cx1 = x1 + (x2 - x1) * 0.5;
    const cx2 = x2 - (x2 - x1) * 0.5;
    d += ` C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`;
  }
  return d;
}

// Cubic bezier evaluation — control points are pulled along x only.
function streamPoint(progress: number): { x: number; y: number } {
  const segs = STREAM_NODES_X.length - 1;
  const clamped = Math.max(0, Math.min(1, progress));
  const segIdx = Math.min(segs - 1, Math.floor(clamped * segs));
  const t = clamped * segs - segIdx;
  const mt = 1 - t;
  const p0x = STREAM_NODES_X[segIdx], p0y = STREAM_NODES_Y[segIdx];
  const p3x = STREAM_NODES_X[segIdx + 1], p3y = STREAM_NODES_Y[segIdx + 1];
  const c1x = p0x + (p3x - p0x) * 0.5, c1y = p0y;
  const c2x = p3x - (p3x - p0x) * 0.5, c2y = p3y;
  const x = mt * mt * mt * p0x + 3 * mt * mt * t * c1x + 3 * mt * t * t * c2x + t * t * t * p3x;
  const y = mt * mt * mt * p0y + 3 * mt * mt * t * c1y + 3 * mt * t * t * c2y + t * t * t * p3y;
  return { x, y };
}

function HexStepper({
  labels,
  activeIndex,
  handleRef,
}: {
  labels: { name: string }[];
  activeIndex: number;
  handleRef: React.MutableRefObject<PhaseHandle | null>;
}) {
  const fillRef = useRef<SVGPathElement>(null);
  const dropRef = useRef<SVGCircleElement>(null);
  const glowRef = useRef<SVGCircleElement>(null);
  const path = buildStreamPath();
  const start = streamPoint(0);
  const teal = "var(--brand-teal-bright)";

  useEffect(() => {
    handleRef.current = {
      update(phase: number) {
        const progress = Math.max(0, Math.min(1, (phase - 1) / (STREAM_NODES_X.length - 1)));
        fillRef.current?.setAttribute("stroke-dasharray", `${progress} 1`);
        const pt = streamPoint(progress);
        const cx = pt.x.toFixed(1), cy = pt.y.toFixed(1);
        glowRef.current?.setAttribute("cx", cx);
        glowRef.current?.setAttribute("cy", cy);
        dropRef.current?.setAttribute("cx", cx);
        dropRef.current?.setAttribute("cy", cy);
      },
    };
    return () => { handleRef.current = null; };
  }, [handleRef]);

  return (
    <svg
      width={STREAM_W}
      height={STREAM_H + 36}
      viewBox={`0 0 ${STREAM_W} ${STREAM_H + 36}`}
      className="mono w-full h-auto"
      aria-hidden
    >
      <defs>
        <linearGradient id="streamFill" x1="0%" x2="100%">
          <stop offset="0%" stopColor="rgba(72,184,177,0.2)" />
          <stop offset="60%" stopColor="var(--brand-teal-bright)" />
          <stop offset="100%" stopColor="var(--brand-teal-bright)" />
        </linearGradient>
        <radialGradient id="packetGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(72,184,177,0.55)" />
          <stop offset="100%" stopColor="rgba(72,184,177,0)" />
        </radialGradient>
      </defs>

      {/* Idle stream — thin white wash */}
      <path d={path} stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* Flowing dashes — always animating, gives the water-flow feel */}
      <path
        d={path}
        stroke={teal}
        strokeWidth="1"
        fill="none"
        strokeDasharray="3 11"
        opacity="0.45"
        style={{ animation: "roadFlow 6s linear infinite" }}
      />

      {/* Progress fill — dasharray written imperatively on scroll */}
      <path
        ref={fillRef}
        d={path}
        stroke="url(#streamFill)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="0 1"
        style={{ filter: "drop-shadow(0 0 6px var(--brand-teal-bright))" }}
      />

      {/* Nodes */}
      {STREAM_NODES_X.map((nx, i) => {
        const ny = STREAM_NODES_Y[i];
        const isActive = i === activeIndex;
        const isDone = i < activeIndex;
        const color = isActive || isDone ? teal : "rgba(255,255,255,0.45)";
        const labelMain = isActive
          ? "rgba(255,255,255,0.95)"
          : isDone
          ? "rgba(255,255,255,0.55)"
          : "rgba(255,255,255,0.35)";
        return (
          <g key={i}>
            {isActive && (
              <circle cx={nx} cy={ny} r={13} fill="none" stroke={teal} strokeWidth="1" opacity="0.5" />
            )}
            <circle
              cx={nx}
              cy={ny}
              r={isActive ? 5 : 3.5}
              fill={color}
              style={{ filter: isActive ? "drop-shadow(0 0 6px var(--brand-teal-bright))" : "none" }}
            />
            <text
              x={nx}
              y={STREAM_H + 22}
              textAnchor="middle"
              fontSize="8.5"
              fill={labelMain}
              style={{
                fontFamily: "var(--font-mono-stack), monospace",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              {labels[i].name}
            </text>
          </g>
        );
      })}

      {/* Traveling droplet — soft halo + bright core, positioned imperatively */}
      <circle ref={glowRef} cx={start.x} cy={start.y} r={14} fill="url(#packetGlow)" />
      <circle
        ref={dropRef}
        cx={start.x}
        cy={start.y}
        r={4}
        fill={teal}
        style={{ filter: "drop-shadow(0 0 8px var(--brand-teal-bright))" }}
      />
    </svg>
  );
}

function LogoLockup() {
  // Same asset as the navbar, rendered at its native 301×49 so it's pixel-sharp.
  const accent = "var(--brand-teal-bright)";
  return (
    <div
      className="logo-hold relative inline-flex items-center justify-center"
      style={{ animationDelay: "0.2s", padding: "24px 36px" }}
    >
      {[
        { top: 0, left: 0, borderTop: 1, borderLeft: 1 },
        { top: 0, right: 0, borderTop: 1, borderRight: 1 },
        { bottom: 0, left: 0, borderBottom: 1, borderLeft: 1 },
        { bottom: 0, right: 0, borderBottom: 1, borderRight: 1 },
      ].map((style, idx) => (
        <span
          key={idx}
          aria-hidden
          className="absolute h-3 w-3"
          style={{
            ...style,
            borderColor: accent,
            borderTopWidth: style.borderTop ? 1 : 0,
            borderBottomWidth: style.borderBottom ? 1 : 0,
            borderLeftWidth: style.borderLeft ? 1 : 0,
            borderRightWidth: style.borderRight ? 1 : 0,
            borderStyle: "solid",
          }}
        />
      ))}
      <Image
        src="/infostream-logo.webp"
        alt="Infostream"
        width={301}
        height={49}
        priority
      />
    </div>
  );
}

/* ─────────── Constellation backdrop ───────────
   Wide virtual canvas with 6 clusters of dots+lines (one per scene). The
   viewBox pans toward the cluster matching the scroll phase. All per-frame
   updates (pan, zoom, cluster fades, bubble activation) are written through
   `handle` directly to the DOM — React renders this SVG exactly once. */
type CNode = { x: number; y: number; r: number; red: boolean };
type CCluster = { nodes: CNode[]; edges: [number, number][] };

function buildCluster(seed: number, cx: number, cy: number, count: number, spread: number): CCluster {
  const rand = seededRng(seed);
  const nodes: CNode[] = [];
  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2;
    const dist = (0.15 + rand() * 0.95) * spread;
    nodes.push({
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist * 0.7,
      r: 2 + rand() * 2.5,
      red: rand() < 0.22,
    });
  }
  const edges: [number, number][] = [];
  const seen = new Set<string>();
  for (let i = 0; i < nodes.length; i++) {
    const others = nodes
      .map((n, j) => ({ j, d: Math.hypot(n.x - nodes[i].x, n.y - nodes[i].y) }))
      .filter((o) => o.j !== i)
      .sort((a, b) => a.d - b.d);
    const link = (j: number) => {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) return;
      seen.add(key);
      edges.push([i, j]);
    };
    link(others[0].j);
    if (rand() < 0.55) link(others[1].j);
    if (rand() < 0.2) link(others[2].j);
  }
  return { nodes, edges };
}

const CLUSTER_X = [400, 1200, 2000, 2800, 3600, 4400]; // phase 0..5
// Pronounced zigzag — each bubble sits on a different vertical band.
const CLUSTER_Y = [300, 480, 200, 500, 220, 380];
const VIEW_W = 1800;
const VIEW_H = 900;
const BUBBLE_R = 38;

function buildRoadPath(): string {
  const pts = CLUSTER_X.map((x, i) => [x, CLUSTER_Y[i]] as [number, number]);
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const cx1 = x1 + (x2 - x1) * 0.45;
    const cx2 = x2 - (x2 - x1) * 0.45;
    d += ` C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`;
  }
  return d;
}

function clusterOpacityAt(ci: number, cx: number): number {
  const dx = (CLUSTER_X[ci] - cx) / 1200;
  return Math.max(0.18, 1 - Math.abs(dx) * 0.55);
}

function bubbleActivationAt(i: number, phase: number): number {
  const d = Math.abs(phase - i);
  const a = Math.max(0, 1 - d / 0.35);
  return a * a * (3 - 2 * a);
}

function Constellation({ handleRef }: { handleRef: React.MutableRefObject<PhaseHandle | null> }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const clusterRefs = useRef<(SVGGElement | null)[]>([]);
  const bubbleRefs = useRef<(SVGGElement | null)[]>([]);
  const clusters = useConstellationClusters();
  const road = useRoadPath();

  useEffect(() => {
    handleRef.current = {
      update(phase: number) {
        const svg = svgRef.current;
        if (!svg) return;
        const lo = Math.max(0, Math.min(4, Math.floor(phase)));
        const hi = Math.min(5, lo + 1);
        const f = phase - lo;
        const fs = f * f * (3 - 2 * f); // smoothstep camera motion
        const cx = CLUSTER_X[lo] + (CLUSTER_X[hi] - CLUSTER_X[lo]) * fs;
        const cy = CLUSTER_Y[lo] + (CLUSTER_Y[hi] - CLUSTER_Y[lo]) * fs;
        const zoom = 1 + Math.sin(f * Math.PI) * 0.18;
        const vw = VIEW_W * zoom;
        const vh = VIEW_H * zoom;
        // Active bubble sits ~70% from the left, clear of the text column.
        svg.setAttribute("viewBox", `${cx - vw * 0.7} ${cy - vh / 2} ${vw} ${vh}`);
        clusterRefs.current.forEach((g, ci) => {
          if (g) g.style.opacity = String(clusterOpacityAt(ci, cx));
        });
        bubbleRefs.current.forEach((g, i) => {
          if (!g) return;
          const ea = bubbleActivationAt(i, phase);
          g.style.opacity = String(ea);
          g.style.transform = `scale(${(1 + ea * 0.45).toFixed(3)})`;
        });
      },
    };
    return () => { handleRef.current = null; };
  }, [handleRef]);

  // Initial attributes match phase 0 so the first paint (and any pre-scroll
  // frame) is already correct without a JS pass.
  const initLeft = CLUSTER_X[0] - VIEW_W * 0.7;
  const initTop = CLUSTER_Y[0] - VIEW_H / 2;

  return (
    <svg
      ref={svgRef}
      viewBox={`${initLeft} ${initTop} ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full"
      aria-hidden
    >
      <defs>
        <radialGradient id="bubbleFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(72,184,177,0.35)" />
          <stop offset="100%" stopColor="rgba(72,184,177,0)" />
        </radialGradient>
        <radialGradient id="bubbleFillActive" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(72,184,177,0.55)" />
          <stop offset="60%" stopColor="rgba(72,184,177,0.15)" />
          <stop offset="100%" stopColor="rgba(72,184,177,0)" />
        </radialGradient>
      </defs>

      {/* The road — continuous path connecting all bubbles */}
      <path d={road} fill="none" stroke="rgba(72,184,177,0.18)" strokeWidth="1.5" />
      <path
        d={road}
        fill="none"
        stroke="var(--brand-teal-bright)"
        strokeWidth="1.2"
        strokeDasharray="6 14"
        opacity="0.55"
        style={{ animation: "roadFlow 8s linear infinite" }}
      />

      {/* Satellite dots + intra-cluster edges */}
      {clusters.map((cl, ci) => (
        <g
          key={ci}
          ref={(el) => { clusterRefs.current[ci] = el; }}
          style={{ opacity: clusterOpacityAt(ci, CLUSTER_X[0]) }}
        >
          {cl.edges.map(([a, b], i) => (
            <line
              key={`e-${ci}-${i}`}
              x1={cl.nodes[a].x}
              y1={cl.nodes[a].y}
              x2={cl.nodes[b].x}
              y2={cl.nodes[b].y}
              stroke="rgba(72,184,177,0.35)"
              strokeWidth="0.6"
            />
          ))}
          {cl.nodes.map((n, i) => (
            <circle
              key={`n-${ci}-${i}`}
              cx={n.x}
              cy={n.y}
              r={n.r}
              fill={n.red ? "var(--brand-red)" : "var(--brand-teal-bright)"}
              opacity={n.red ? 0.85 : 0.7}
            />
          ))}
        </g>
      ))}

      {/* Process bubbles — a static base plus an "active" overlay whose
         opacity/scale are driven imperatively as the camera arrives. */}
      {CLUSTER_X.map((bx, i) => {
        const by = CLUSTER_Y[i];
        const initEa = bubbleActivationAt(i, 0);
        return (
          <g key={`b-${i}`}>
            <circle cx={bx} cy={by} r={BUBBLE_R} fill="url(#bubbleFill)" />
            <circle cx={bx} cy={by} r={BUBBLE_R} fill="none" stroke="var(--brand-teal-bright)" strokeWidth="1" opacity="0.55" />
            <g
              ref={(el) => { bubbleRefs.current[i] = el; }}
              style={{
                opacity: initEa,
                transform: `scale(${1 + initEa * 0.45})`,
                transformBox: "fill-box",
                transformOrigin: "center",
              }}
            >
              <circle cx={bx} cy={by} r={BUBBLE_R} fill="url(#bubbleFillActive)" />
              <circle
                cx={bx}
                cy={by}
                r={BUBBLE_R}
                fill="none"
                stroke="var(--brand-teal-bright)"
                strokeWidth="1.6"
                opacity="0.9"
                style={{ filter: "drop-shadow(0 0 12px var(--brand-teal-bright))" }}
              />
              <circle cx={bx} cy={by} r={BUBBLE_R + 14} fill="none" stroke="var(--brand-teal-bright)" strokeWidth="1" opacity="0.5" />
              <circle cx={bx} cy={by - BUBBLE_R - 8} r="3" fill="var(--brand-red)" />
            </g>
          </g>
        );
      })}
    </svg>
  );
}

let _clusterCache: CCluster[] | null = null;
function useConstellationClusters(): CCluster[] {
  if (_clusterCache) return _clusterCache;
  _clusterCache = CLUSTER_X.map((x, i) =>
    buildCluster(0x9e37 + i * 7919, x, CLUSTER_Y[i], 9 + (i % 3), 260)
  );
  return _clusterCache;
}

let _roadCache: string | null = null;
function useRoadPath(): string {
  if (_roadCache) return _roadCache;
  _roadCache = buildRoadPath();
  return _roadCache;
}
