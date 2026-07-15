"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import CanvasErrorBoundary from "@/components/three/CanvasErrorBoundary";
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

// ─── Per-scene presentation config (mirror dict.services.items order) ───
// Icon names for each process's four cards (cards[0..3]); the card layout per
// scene is hard-coded by index in ProcessSceneBody below. Kept in code (not
// the dictionary) because icons and layout are presentation, not copy.
const PROCESS_CARD_ICONS: IconName[][] = [
  // Software development — custom dev · agile delivery · scalable arch · partnership
  ["code", "refresh", "layers", "handshake"],
  // Digital transformation — assess · digitize · automate · optimize
  ["search", "fileText", "gear", "trendingUp"],
  // Technology consulting — assessment · planning · architecture · agile
  ["search", "target", "cubes", "users"],
  // System integration — apps · APIs · data sync · legacy
  ["puzzle", "code", "database", "server"],
];

// Abstract line-art composition inside the Software Development feature card —
// a floating app panel feeding a lattice of build blocks, with the same slow
// ambient motion (svcart-* keyframes in globals.css) the old panels used.
// Rotating/floating parts carry inline transform-box: view-box + a px origin
// (SVG CSS transforms default to a broken origin otherwise).
const CENTER = { transformBox: "view-box", transformOrigin: "80px 80px" } as const;
const FEATURE_ART: ReactNode = (
  <>
    <g className="svcart-floaty" style={CENTER}>
      <rect x="44" y="20" width="72" height="52" rx="6" opacity="0.8" />
      <path d="M53 34h26M53 44h38M53 54h32" opacity="0.45" />
      <circle className="svcart-blink" cx="107" cy="32" r="2.5" fill="currentColor" stroke="none" />
    </g>
    <path className="svcart-flow" d="M80 76v22M58 92l-18 20M102 92l18 20" opacity="0.5" />
    <g className="svcart-floaty" style={{ ...CENTER, animationDelay: "0.6s" }}>
      <path d="M80 102l13 7.5v15L80 132l-13-7.5v-15z" />
    </g>
    <g className="svcart-floaty" style={{ ...CENTER, animationDelay: "1.1s" }}>
      <path d="M36 116l10 6v12l-10 6-10-6v-12z" opacity="0.55" />
    </g>
    <g className="svcart-floaty" style={{ ...CENTER, animationDelay: "1.6s" }}>
      <path d="M124 116l10 6v12l-10 6-10-6v-12z" opacity="0.55" />
    </g>
  </>
);

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
  const phaseRef = useRef(0);
  const stepper = useRef<PhaseHandle | null>(null);
  const [activeScene, setActiveScene] = useState(0);
  // True while the pinned variant is the one displayed — gates the WebGL
  // canvas so the hidden static variant never pays for it.
  const [motionOk, setMotionOk] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia(MOTION_QUERY);
    const apply = () => setMotionOk(motion.matches);
    apply();
    motion.addEventListener("change", apply);
    return () => motion.removeEventListener("change", apply);
  }, []);

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
        const stops = 5; // intro (0) + four process scenes (1..4) + exit pull-back (4..5)

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
            const p = self.progress * stops; // 0..5
            // One CSS variable drives every scroll-coupled style below; the
            // imperative handles cover the SVG attributes CSS can't reach.
            pin.current?.style.setProperty("--ph", p.toFixed(4));
            // The 3D pipeline has four planets (one per process scene).
            phaseRef.current = p;
            stepper.current?.update(p);
            // Discrete state — React only re-renders on scene boundaries.
            setActiveScene(Math.max(0, Math.min(4, Math.round(p))));
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
            {/* Giant planetary orbit arcs sweeping in from the corners, with
               satellite dots slowly riding them (per the mockups). */}
            <OrbitArcs />
            {/* 3D process pipeline — mounted whenever the pinned variant is
               live, phones included, at the same full treatment as desktop. */}
            {motionOk && (
              <div className="absolute inset-0 pointer-events-none">
                <CanvasErrorBoundary>
                  <HeroScene phaseRef={phaseRef} />
                </CanvasErrorBoundary>
              </div>
            )}
            {/* Left-side wash so the backdrop never fights the text column */}
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-inset)] from-15% via-[var(--bg-inset)]/55 via-45% to-transparent" />
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[var(--bg-inset)] to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[var(--bg-inset)]" />
            {/* Exit darken — fades the scene before unpin */}
            <div
              className="absolute inset-0 bg-[var(--bg-inset)] pointer-events-none"
              style={{ opacity: "calc(clamp(0, calc((var(--ph) - 4.55) / 0.4), 1) * 0.75)" }}
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
            {[0, 1, 2, 3, 4].map((i) => (
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
            style={{ opacity: "clamp(0, calc((4.78 - var(--ph)) / 0.33), 1)" }}
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

              {/* Scenes 1–4 — the processes, one per scene, each with its own
                 card layout from the mockups. Visual layer is decorative; the
                 canonical, screen-reader-facing copy lives in the sr-only
                 block below (and in the static variant). */}
              {services.map((svc, i) => (
                <Scene key={i} target={i + 1} interactive={false} decorative>
                  <div className="w-full" style={{ "--u": `calc(var(--ph) - ${i + 1})` } as CSSVars}>
                    <ProcessSceneBody index={i} total={services.length} eyebrow={dict.services.eyebrow} svc={svc} />
                  </div>
                </Scene>
              ))}
            </div>
          </div>

          {/* Process timeline — visible across all four process scenes. Hidden
             on phones: scaled to a phone width its labels drop below legibility. */}
          <div
            aria-hidden
            className="process-stepper absolute left-1/2 -translate-x-1/2 bottom-10 z-30 pointer-events-none w-[92vw] max-w-[1040px] hidden sm:block"
            style={{ opacity: "clamp(0, min(calc((var(--ph) - 0.3) / 0.3), calc((4.75 - var(--ph)) / 0.3)), 1)" }}
          >
            <ProcessTimeline
              labels={services.map((s) => ({ name: s.k }))}
              activeIndex={Math.max(0, activeScene - 1)}
              handleRef={stepper}
            />
          </div>

          {/* Exit overlay — #FollowTheStream brand lockup on the dark backdrop */}
          <div
            aria-hidden
            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
            style={{ opacity: "clamp(0, calc((var(--ph) - 4.6) / 0.3), 1)" }}
          >
            <div className="text-center px-6">
              <FollowTheStream tag={dict.hero.exitTag} />
              <div className="mt-8 mono text-[11px] tracking-[0.25em] uppercase text-white/55">
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
              {svc.cards.map((c, j) => (
                <section key={j}>
                  <h4>{c.k}</h4>
                  <p>{c.v}</p>
                </section>
              ))}
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
                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                  {svc.cards.map((c, j) => (
                    <div key={j} className={`${CARD_SHELL} p-5`}>
                      <div className="flex items-center gap-4">
                        <Medallion name={PROCESS_CARD_ICONS[i]?.[j] ?? "shapes"} size="sm" />
                        <h4 className="text-[14px] font-medium uppercase tracking-[0.08em] text-white">{c.k}</h4>
                      </div>
                      <p className="mt-3 text-[13.5px] leading-relaxed text-white/60">{c.v}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-16">
            <FollowTheStream tag={dict.hero.exitTag} />
          </div>
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
// #FollowTheStream brand lockup — the logo's equalizer-bar mark scaled up to
// headline size, with a two-tone wordmark treatment (teal hash, white body,
// brand-red "Stream") so the exit tag reads as company branding, not copy.
function FollowTheStream({ tag }: { tag: string }) {
  const hash = tag.startsWith("#") ? "#" : "";
  const rest = hash ? tag.slice(1) : tag;
  const idx = rest.lastIndexOf("Stream");
  const head = idx === -1 ? rest : rest.slice(0, idx);
  const tail = idx === -1 ? "" : rest.slice(idx);
  const bars = [
    { h: "56%", d: "0s", c: "var(--brand-red)" },
    { h: "100%", d: "0.15s", c: "var(--brand-red)" },
    { h: "40%", d: "0.3s", c: "var(--brand-teal-bright)" },
    { h: "76%", d: "0.45s", c: "var(--brand-red)" },
  ];
  return (
    <div className="inline-flex items-center justify-center gap-[0.32em] text-[clamp(2.4rem,6vw,4.6rem)] leading-none tracking-[-0.03em] font-semibold">
      <span aria-hidden className="flex items-end gap-[0.085em] h-[0.74em]">
        {bars.map((b, i) => (
          <span
            key={i}
            className="bar-pulse inline-block w-[0.095em] rounded-[1px]"
            style={{ height: b.h, background: b.c, animationDelay: b.d }}
          />
        ))}
      </span>
      <span>
        <span className="text-[var(--brand-teal-bright)]">{hash}</span>
        <span className="text-white">{head}</span>
        <span className="text-[var(--brand-red)]">{tail}</span>
      </span>
    </div>
  );
}

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
          className="hidden sm:block flex-1 h-px mb-2 bg-gradient-to-r from-[var(--brand-teal-bright)]/55 to-[var(--brand-teal-bright)]/20"
          style={{ boxShadow: "0 0 6px -2px var(--brand-teal-bright)" }}
        />
        <span
          aria-hidden
          className="hidden sm:block h-1.5 w-1.5 -ml-3 mb-[5px] rounded-full bg-[var(--brand-teal-bright)]"
          style={{ boxShadow: "0 0 8px var(--brand-teal-bright)" }}
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

/* ─── Per-process scene bodies ───
   Four distinct card layouts, one per process, matching the mockups:
   0 — feature card + column of three mini cards
   1 — four numbered step cards in a row, chevrons between
   2 — four wide icon rows
   3 — 2×2 grid with ghost numbers
   Card blocks are hidden below md (the pin can't scroll internally, so phones
   show heading + description only — full copy stays in the sr-only block and
   the static variant). Each card is a rev() of the scene's --u, so the stagger
   replays in reverse when scrolling back. */

type ProcessItem = Dict["services"]["items"][number];
type ProcessCard = ProcessItem["cards"][number];

const CARD_SHELL =
  "rounded-2xl border border-white/10 bg-[#0d1728] shadow-[0_14px_40px_rgba(0,0,0,0.4)]";

// Teal accent dash under card titles — every mock card carries one.
function TitleDash() {
  return <span aria-hidden className="mt-2 block h-[2px] w-7 rounded-full bg-[var(--brand-teal-bright)]" />;
}

// Rounded-square icon tile (the feature/mini cards' icon treatment).
function IconTile({ name }: { name: IconName }) {
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[var(--brand-teal-bright)]/40 text-[var(--brand-teal-bright)]">
      <Icon name={name} className="h-5 w-5" />
    </span>
  );
}

function ProcessSceneBody({
  index,
  total,
  eyebrow,
  svc,
}: {
  index: number;
  total: number;
  eyebrow: string;
  svc: ProcessItem;
}) {
  const icons = PROCESS_CARD_ICONS[index] ?? [];
  const left = (
    <div>
      <div
        className="mono text-[11px] tracking-[0.25em] uppercase text-[var(--brand-teal-bright)]"
        style={rev(-0.42, 0.12, 6)}
      >
        {eyebrow}
      </div>
      <div className="mt-5">
        <StageHeading index={index} total={total} name={svc.k} description={svc.v} />
      </div>
    </div>
  );

  if (index === 0) {
    const [feature, ...side] = svc.cards;
    return (
      <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.9fr_1.05fr]">
        {left}
        <div className={`hidden lg:block ${CARD_SHELL} p-7`} style={rev(-0.32, 0.16, 14)}>
          <IconTile name={icons[0]} />
          <div className="mt-5 text-[16px] font-medium uppercase tracking-[0.08em] text-white">{feature.k}</div>
          <TitleDash />
          <p className="mt-4 text-[13px] leading-relaxed text-white/60">{feature.v}</p>
          <div className="mt-4 grid place-items-center text-[var(--brand-teal-bright)]" style={rev(-0.12, 0.16, 10)}>
            <svg
              viewBox="0 0 160 160"
              className="h-36 w-36 xl:h-44 xl:w-44 drop-shadow-[0_0_18px_rgba(72,184,177,0.14)]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              {FEATURE_ART}
            </svg>
          </div>
        </div>
        <div className="hidden md:flex flex-col gap-4">
          {side.map((c, j) => (
            <div key={j} className={`${CARD_SHELL} p-5`} style={rev(-0.26 + j * 0.09, 0.14, 12)}>
              <div className="flex items-center gap-4">
                <IconTile name={icons[j + 1]} />
                <div className="text-[14px] font-medium uppercase tracking-[0.08em] text-white">{c.k}</div>
              </div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-white/60">{c.v}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (index === 1) {
    return (
      <div className="grid items-center gap-8 lg:gap-10 lg:grid-cols-[minmax(260px,330px)_1fr]">
        {left}
        <div className="hidden md:grid grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-5">
          {svc.cards.map((c, j) => (
            <div key={j} className={`relative ${CARD_SHELL} p-5`} style={rev(-0.28 + j * 0.08, 0.14, 12)}>
              <div
                className="mono text-[22px] leading-none text-transparent"
                style={{ WebkitTextStroke: "1px var(--brand-teal-bright)" }}
              >
                {String(j + 1).padStart(2, "0")}
              </div>
              <div className="mt-4">
                <Medallion name={icons[j]} />
              </div>
              <div className="mt-4 text-[13.5px] font-medium uppercase tracking-[0.08em] text-white">{c.k}</div>
              <TitleDash />
              <p className="mt-3 text-[12.5px] leading-relaxed text-white/60">{c.v}</p>
              {j < svc.cards.length - 1 && (
                <span
                  aria-hidden
                  className="absolute top-1/2 -right-[22px] hidden xl:block -translate-y-1/2 text-[var(--brand-teal-bright)]/70"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 5 16 12 9 19" />
                  </svg>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (index === 2) {
    return (
      <div className="grid items-center gap-8 lg:gap-12 lg:grid-cols-[minmax(260px,350px)_1fr]">
        {left}
        <div className="hidden md:flex flex-col gap-4">
          {svc.cards.map((c, j) => (
            <div key={j} className={`${CARD_SHELL} flex items-center gap-6 px-6 py-4`} style={rev(-0.28 + j * 0.08, 0.14, 12)}>
              <Medallion name={icons[j]} size="lg" />
              <span aria-hidden className="hidden lg:block h-12 w-px shrink-0 bg-white/10" />
              <div className="min-w-0">
                <div className="text-[14.5px] font-medium uppercase tracking-[0.08em] text-white">{c.k}</div>
                <TitleDash />
                <p className="mt-2.5 max-w-xl text-[12.5px] leading-relaxed text-white/60">{c.v}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid items-center gap-8 lg:gap-12 lg:grid-cols-[minmax(260px,350px)_1fr]">
      {left}
      <div className="hidden md:grid grid-cols-2 gap-4 lg:gap-5">
        {svc.cards.map((c: ProcessCard, j: number) => (
          <div key={j} className={`relative overflow-hidden ${CARD_SHELL} p-6`} style={rev(-0.28 + j * 0.08, 0.14, 12)}>
            <span aria-hidden className="absolute right-5 top-4 mono text-[32px] leading-none text-white/[0.08]">
              {String(j + 1).padStart(2, "0")}
            </span>
            <Medallion name={icons[j]} />
            <div className="mt-4 pr-10 text-[14px] font-medium uppercase tracking-[0.08em] text-white">{c.k}</div>
            <TitleDash />
            <p className="mt-3 text-[12.5px] leading-relaxed text-white/60">{c.v}</p>
          </div>
        ))}
      </div>
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
  size?: "sm" | "md" | "lg";
  tone?: "teal" | "danger" | "warn";
}) {
  const dim = size === "sm" ? "w-9 h-9" : size === "lg" ? "w-16 h-16" : "w-11 h-11";
  const ic = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-7 h-7" : "w-[18px] h-[18px]";
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
  | "network"
  | "refresh"
  | "layers"
  | "handshake"
  | "search"
  | "gear"
  | "cubes"
  | "puzzle"
  | "server";

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
  // Circular arrows — agile / iterative delivery.
  refresh: (
    <>
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </>
  ),
  // Stacked planes — scalable architecture.
  layers: (
    <>
      <path d="M12 2.5 2.5 7.5 12 12.5l9.5-5L12 2.5Z" />
      <path d="m2.5 12 9.5 5 9.5-5" />
      <path d="m2.5 16.5 9.5 5 9.5-5" />
    </>
  ),
  // Clasped hands — long-term partnership.
  handshake: (
    <>
      <path d="m11 17 2 2a1 1 0 1 0 3-3" />
      <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" />
      <path d="m21 3 1 11h-2" />
      <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" />
      <path d="M3 4h8" />
    </>
  ),
  // Magnifier — assess / technology assessment.
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <line x1="16.2" y1="16.2" x2="21" y2="21" />
    </>
  ),
  // Cog — automation.
  gear: (
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  // Three isometric blocks — solution architecture.
  cubes: (
    <>
      <path d="M12 2.5 15.8 4.7v4.4L12 11.3 8.2 9.1V4.7Z" />
      <path d="M7.3 12.2 11.1 14.4v4.4l-3.8 2.2-3.8-2.2v-4.4Z" />
      <path d="M16.7 12.2l3.8 2.2v4.4l-3.8 2.2-3.8-2.2v-4.4Z" />
    </>
  ),
  // Puzzle piece — application integration.
  puzzle: (
    <path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z" />
  ),
  // Rack units — legacy systems / modernization.
  server: (
    <>
      <rect x="2.5" y="3" width="19" height="7.5" rx="1.5" />
      <rect x="2.5" y="13.5" width="19" height="7.5" rx="1.5" />
      <line x1="6.5" y1="6.75" x2="6.51" y2="6.75" />
      <line x1="6.5" y1="17.25" x2="6.51" y2="17.25" />
      <line x1="10" y1="6.75" x2="13" y2="6.75" />
      <line x1="10" y1="17.25" x2="13" y2="17.25" />
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

/* ─────────── Process timeline ───────────
   Straight rail connecting the 4 process nodes (per the mockups): numbered
   labels below, an outlined ring on the active node, and a teal droplet riding
   the rail. Continuous progress (fill + droplet) is written imperatively
   through `handle` by the ScrollTrigger; React only re-renders the node/label
   states on scene changes. */
const STREAM_W = 1040;
const STREAM_H = 64;
const STREAM_NODES_X = [150, 397, 643, 890];
const STREAM_Y = 16;

function streamPoint(progress: number): { x: number; y: number } {
  const x0 = STREAM_NODES_X[0];
  const x1 = STREAM_NODES_X[STREAM_NODES_X.length - 1];
  const clamped = Math.max(0, Math.min(1, progress));
  return { x: x0 + (x1 - x0) * clamped, y: STREAM_Y };
}

function ProcessTimeline({
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
  const spanPath = `M ${STREAM_NODES_X[0]} ${STREAM_Y} H ${STREAM_NODES_X[STREAM_NODES_X.length - 1]}`;
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
      height={STREAM_H}
      viewBox={`0 0 ${STREAM_W} ${STREAM_H}`}
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

      {/* Idle rail — thin white wash, extended past the end nodes */}
      <path d={`M 30 ${STREAM_Y} H ${STREAM_W - 30}`} stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* Progress fill — dasharray written imperatively on scroll */}
      <path
        ref={fillRef}
        d={spanPath}
        stroke="url(#streamFill)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="0 1"
        style={{ filter: "drop-shadow(0 0 6px var(--brand-teal-bright))" }}
      />

      {/* Nodes + numbered labels */}
      {STREAM_NODES_X.map((nx, i) => {
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
              <circle cx={nx} cy={STREAM_Y} r={10} fill="none" stroke={teal} strokeWidth="1.2" opacity="0.7" />
            )}
            <circle
              cx={nx}
              cy={STREAM_Y}
              r={isActive ? 4.5 : 3.5}
              fill={color}
              style={{ filter: isActive ? "drop-shadow(0 0 6px var(--brand-teal-bright))" : "none" }}
            />
            <text
              x={nx}
              y={STREAM_Y + 32}
              textAnchor="middle"
              style={{
                fontFamily: "var(--font-mono-stack), monospace",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              <tspan fontSize="15" fill={isActive ? teal : "rgba(255,255,255,0.28)"}>
                {String(i + 1).padStart(2, "0")}
              </tspan>
              <tspan dx="9" dy="-1" fontSize="8.5" fill={labelMain}>
                {labels[i].name}
              </tspan>
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

/* ─────────── Orbit arcs backdrop ───────────
   Two enormous orbit circles centred far off-canvas (top-right and
   bottom-left) so only their arcs sweep across the frame, each carrying a few
   glowing satellite dots. The whole ring rotates very slowly (svcart-spin with
   a multi-minute duration), so the dots creep along their orbits like planets.
   Pure static SVG — rendered once, animated entirely in CSS. */
function OrbitArcs() {
  const glow = { filter: "drop-shadow(0 0 6px var(--brand-teal-bright))" };
  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      {/* top-right system — dots at r840: 180°→(940,120), 150°→(1053,540); r620: 190°→(1169,12) */}
      <g className="svcart-spin" style={{ ...CENTER, transformOrigin: "1780px 120px", animationDuration: "260s" }}>
        <circle cx="1780" cy="120" r="840" fill="none" stroke="rgba(72,184,177,0.28)" strokeWidth="1.2" />
        <circle cx="1780" cy="120" r="620" fill="none" stroke="rgba(72,184,177,0.18)" strokeWidth="1" strokeDasharray="2 10" />
        <circle cx="940" cy="120" r="4.5" fill="var(--brand-teal-bright)" style={glow} />
        <circle cx="1053" cy="540" r="3" fill="var(--brand-red)" opacity="0.9" />
        <circle cx="1169" cy="12" r="3.5" fill="var(--brand-teal-bright)" opacity="0.85" style={glow} />
      </g>
      {/* bottom-left system — dots at r720: 0°→(540,760), -45°→(329,251) */}
      <g className="svcart-spin-rev" style={{ ...CENTER, transformOrigin: "-180px 760px", animationDuration: "320s" }}>
        <circle cx="-180" cy="760" r="720" fill="none" stroke="rgba(72,184,177,0.24)" strokeWidth="1.2" />
        <circle cx="540" cy="760" r="4" fill="var(--brand-teal-bright)" style={glow} />
        <circle cx="329" cy="251" r="3" fill="var(--brand-teal-bright)" opacity="0.8" style={glow} />
      </g>
    </svg>
  );
}
