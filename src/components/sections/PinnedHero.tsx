"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type CSSProperties } from "react";
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
// variant displays iff this matches, so the pin always has its JS. The height
// floor sends landscape phones / very short windows to the static variant,
// where a 100svh pinned scene could never fit its content.
const MOTION_QUERY = "(prefers-reduced-motion: no-preference) and (min-height: 500px)";
// Desktop-only extras — currently just the cursor parallax, which is
// meaningless on touch devices.
const ENHANCED_QUERY = "(min-width: 900px) and (prefers-reduced-motion: no-preference) and (min-height: 500px)";

type StageItem = Dict["platform"]["items"][number];
type MetaLabels = Dict["platform"]["metaLabels"];

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
// as opacity + a small lift. lift=0 keeps the transform free for SVG nodes.
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
        const stops = 5; // scenes 0..4 + exit pull-back (4..5)

        ScrollTrigger.create({
          trigger: pin.current,
          start: "top top",
          // Phones get a shorter swipe per scene — 8.5 viewports of thumb
          // scrolling reads as broken; 6.5 keeps the choreography legible.
          end: () => `+=${stops * window.innerHeight * (window.innerWidth < 900 ? 1.3 : 1.7)}`,
          pin: pin.current,
          pinSpacing: true,
          scrub: 0.6,
          onUpdate: (self) => {
            const p = self.progress * stops; // 0..5
            // One CSS variable drives every scroll-coupled style below; the
            // imperative handles cover the SVG attributes CSS can't reach.
            pin.current?.style.setProperty("--ph", p.toFixed(4));
            phaseRef.current = p;
            constellation.current?.update(p);
            stepper.current?.update(p);
            // Discrete state — React only re-renders on scene boundaries.
            setActiveScene(Math.max(0, Math.min(4, Math.round(p))));
            setExitActive(p > 4.55);
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
  const modules = dict.platform.items;
  const labels = dict.platform.metaLabels;

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
                    <span key={i} className="hero-title-word inline-block mr-[0.22em]">{w}</span>
                  ))}
                </p>
                <p className="hero-body mt-6 max-w-xl text-white/70 text-[16.5px] leading-relaxed">{dict.hero.body}</p>

                {/* Audited figures — the same claims the Stats section substantiates */}
                <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/10 border border-white/10 rounded-md overflow-hidden max-w-2xl">
                  {dict.hero.meta.map((m, i) => (
                    <div key={i} className="hero-meta-row bg-[var(--bg-inset-elev)] px-4 py-3">
                      <div className="mono text-[10px] tracking-[0.22em] uppercase text-white/55">{m.k}</div>
                      <div className="mono text-base mt-1 text-white/90">{m.v}</div>
                    </div>
                  ))}
                </div>
              </Scene>

              {/* Scenes 1–4 — process stages. Visual layer is decorative; the
                 canonical, screen-reader-facing copy lives in the sr-only block
                 below (and in the static variant on small screens). */}
              {modules.map((mod, i) => (
                <Scene key={i} target={i + 1} interactive={false} decorative>
                  {/* pb biases the centered column upward, away from the stepper
                     band (the stepper is hidden below sm, so no bias needed there) */}
                  <div className="w-full sm:pb-8" style={{ "--u": `calc(var(--ph) - ${i + 1})` } as CSSVars}>
                    <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-start w-full">
                      <div className="lg:col-span-6">
                        <StageHeader index={i} eyebrow={dict.platform.eyebrow} stageLabel={dict.platform.stageLabel} total={modules.length} />
                        <div className="mt-3 text-[clamp(2rem,4.6vw,4rem)] leading-[1.02] tracking-[-0.025em] font-medium text-white">
                          {mod.name}
                        </div>
                        <p className="mt-4 max-w-md text-white/70 text-[15.5px] leading-relaxed" style={descStyle}>
                          {mod.description}
                        </p>
                        <StageDossier stage={i} doc={dict.platform.dossier[i]} meta={mod.meta} labels={labels} authLabel={dict.platform.authorisation} />
                      </div>
                    </div>
                  </div>
                </Scene>
              ))}
            </div>
          </div>

          {/* Stream stepper — visible across all four stages. Hidden on phones:
             scaled to a phone width its labels drop below legibility. */}
          <div
            aria-hidden
            className="process-stepper absolute left-1/2 -translate-x-1/2 bottom-10 z-30 pointer-events-none w-[88vw] max-w-[760px] hidden sm:block"
            style={{ opacity: "clamp(0, min(calc((var(--ph) - 0.3) / 0.3), calc((4.75 - var(--ph)) / 0.3)), 1)" }}
          >
            <HexStepper
              labels={modules.map((m) => ({ name: m.name }))}
              activeIndex={Math.max(0, activeScene - 1)}
              handleRef={stepper}
            />
          </div>

          {/* Exit overlay — Infostream lockup on the dark backdrop */}
          <div
            aria-hidden
            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
            style={{ opacity: "clamp(0, calc((var(--ph) - 4.6) / 0.3), 1)" }}
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

        {/* Canonical process content for assistive tech — the animated scenes
           above are aria-hidden decoration. Hidden with the pinned variant, so
           small screens never get duplicate content. */}
        <div className="sr-only">
          <h1>{dict.hero.title}</h1>
          <p>{dict.hero.body}</p>
          <h2>{dict.platform.title}</h2>
          <p>{dict.platform.body}</p>
          {modules.map((mod, i) => (
            <section key={i}>
              <h3>{mod.name}</h3>
              <p>{mod.description}</p>
              <dl>
                <dt>{labels.deliverable}</dt>
                <dd>{mod.meta.deliverable}</dd>
                <dt>{labels.signoff}</dt>
                <dd>{mod.meta.signoff}</dd>
                <dt>{labels.owner}</dt>
                <dd>{mod.meta.owner}</dd>
              </dl>
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
            {dict.hero.title}
          </h1>
          <p className="mt-6 max-w-xl text-white/70 text-[16.5px] leading-relaxed">{dict.hero.body}</p>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/10 border border-white/10 rounded-md overflow-hidden max-w-2xl">
            {dict.hero.meta.map((m, i) => (
              <div key={i} className="bg-[var(--bg-inset-elev)] px-4 py-3">
                <div className="mono text-[10px] tracking-[0.22em] uppercase text-white/55">{m.k}</div>
                <div className="mono text-base mt-1 text-white/90">{m.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Process stages, stacked. --u: 1 renders every dossier fully settled. */}
        <div className="relative mx-auto max-w-[1280px] px-6 pb-20">
          <div className="mono text-[10px] tracking-[0.28em] uppercase text-white/55">{dict.platform.eyebrow}</div>
          <h2 className="mt-3 text-[clamp(1.8rem,6vw,2.6rem)] leading-[1.05] tracking-[-0.02em] font-medium text-white">
            {dict.platform.title}
          </h2>
          <p className="mt-4 max-w-xl text-white/70 text-[15.5px] leading-relaxed">{dict.platform.body}</p>

          <div className="mt-12 space-y-14">
            {modules.map((mod, i) => (
              <article key={i} style={{ "--u": 1 } as CSSVars}>
                <StageHeader index={i} eyebrow={dict.platform.eyebrow} stageLabel={dict.platform.stageLabel} total={modules.length} />
                <h3 className="mt-3 text-[clamp(1.6rem,5.5vw,2.2rem)] leading-[1.05] tracking-[-0.02em] font-medium text-white">
                  {mod.name}
                </h3>
                <p className="mt-3 max-w-md text-white/70 text-[15px] leading-relaxed">{mod.description}</p>
                <StageDossier stage={i} doc={dict.platform.dossier[i]} meta={mod.meta} labels={labels} authLabel={dict.platform.authorisation} />
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
  children,
}: {
  target: number;
  interactive: boolean;
  decorative?: boolean;
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
      <div className="mx-auto max-w-[1280px] h-full px-6 lg:px-10 flex flex-col justify-center pt-20 pb-8 md:pt-24 md:pb-12">
        {children}
      </div>
    </div>
  );
}

// ─── Stage header ───
function StageHeader({ index, eyebrow, stageLabel, total }: { index: number; eyebrow: string; stageLabel: string; total: number }) {
  const num = String(index + 1).padStart(2, "0");
  const tot = String(total).padStart(2, "0");
  return (
    <div className="flex items-end gap-5">
      <div className="leading-none">
        <div className="mono text-[10px] tracking-[0.28em] uppercase text-white/55">
          {eyebrow} / {stageLabel}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className="font-medium text-[clamp(2.2rem,3.6vw,3.2rem)] leading-none tracking-[-0.04em] text-transparent"
            style={{ WebkitTextStroke: "1px var(--brand-teal-bright)" }}
          >
            {num}
          </span>
          <span className="mono text-[11px] tracking-[0.22em] text-white/50">/ {tot}</span>
        </div>
      </div>
      <span className="hidden sm:block flex-1 h-px bg-gradient-to-r from-[var(--brand-teal-bright)]/40 to-transparent mb-2" />
    </div>
  );
}

/* ─────────── Stage dossier ───────────
   Each stage's panel is the artifact that stage actually produces — one case
   file per stage, advancing through the same engagement (IS-ENG-26/041). Rows
   reveal as the scroll approaches the stage's center; the sign-off stamp lands
   just past it. Stage 3 cites stage 2, stage 2 cites stage 1 — and the
   operations log never gets a closing stamp. */
// File references stay constant across locales — the rest of the dossier copy
// lives in the dictionaries (platform.dossier) so both languages read whole.
const FILE_REFS = ["IS-ENG-26/041-D", "IS-ENG-26/041-A", "IS-ENG-26/041-B", "IS-ENG-26/041-O"];

type DossierDoc = Dict["platform"]["dossier"][number];

function StageDossier({
  stage,
  doc,
  meta,
  labels,
  authLabel,
}: {
  stage: number;
  doc: DossierDoc;
  meta: StageItem["meta"];
  labels: MetaLabels;
  authLabel: string;
}) {
  const hasStamp = !!doc.stamp;
  const hasOpen = !!doc.open;
  // The 60svh term keeps the card inside short pinned viewports; the 19rem
  // floor stops it collapsing on landscape phones / very short windows.
  return (
    <div className="mt-6" style={{ width: "min(100%, 30rem, max(19rem, 60svh))" }}>
      {/* Minimal data card — one hairline-bordered surface, no folder tab / corner
         ticks / printed texture. The card frame itself is reveal-gated so no empty
         rectangle ghosts in during the scene crossfade. */}
      <div
        className="relative rounded-2xl border border-white/10 px-6 py-5 sm:px-7"
        style={{
          ...rev(-0.46, 0.14, 8),
          background: "linear-gradient(180deg, rgba(17,23,38,0.82), rgba(11,15,25,0.82))",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 60px -34px rgba(0,0,0,0.85)",
        }}
      >
        {/* Reference line — stage tab + case-file id, both kept quiet */}
        <div className="flex items-center justify-between" style={rev(-0.4, 0.1, 0)} aria-hidden>
          <span className="mono text-[10px] tracking-[0.28em] uppercase text-[var(--brand-teal-bright)]/85">{doc.tab}</span>
          <span className="mono text-[9px] tracking-[0.2em] uppercase text-white/35">{FILE_REFS[stage]}</span>
        </div>

        {/* Headline — the document this stage produces. A short teal rule replaces
           the old folder-tab as the card's accent. */}
        <div className="mt-4" style={rev(-0.34, 0.12, 6)}>
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-4 w-px shrink-0 bg-[var(--brand-teal-bright)]/70" />
            <div className="text-[clamp(1.05rem,1.5vw,1.35rem)] leading-tight tracking-[-0.01em] font-medium text-white">
              {doc.title}
            </div>
          </div>
          <div className="mt-1.5 pl-[15px] mono text-[9.5px] tracking-[0.18em] uppercase text-white/40" aria-hidden>
            {doc.basis}
          </div>
        </div>

        {/* Architecture schematic — only the spec stage carries one. Its own
           per-shape reveal handles the fade, so no wrapper rev here. */}
        {stage === 1 && (
          <div className="mt-5">
            <SpecSchematic />
          </div>
        )}

        {/* Facts — airy key/value list, revealed row by row on approach */}
        <dl className="mt-6 space-y-3">
          {doc.rows.map((r, i) => {
            const start = -0.26 + i * 0.06;
            return (
              <div key={r.k} className="flex items-baseline gap-4" style={rev(start, 0.08, 4)}>
                <dt className="mono text-[9.5px] tracking-[0.2em] uppercase text-white/40 w-[108px] shrink-0">{r.k}</dt>
                <dd className="flex-1 mono text-[12px] tracking-[0.02em] leading-snug text-white/80">{r.v}</dd>
                {r.tick && (
                  <span className="mono text-[11px] leading-none text-[var(--brand-teal-bright)]" style={rev(start + 0.04, 0.05, 0)} aria-hidden>
                    ✓
                  </span>
                )}
              </div>
            );
          })}

          {/* Red-team gate (Build) — flips AWAITING → PASSED on approach */}
          {doc.gateK && (
            <div
              className="flex items-baseline gap-4"
              style={{ ...rev(-0.04, 0.08, 4), "--g": "clamp(0, calc((var(--u) - 0.02) / 0.05), 1)" } as CSSVars}
            >
              <dt className="mono text-[9.5px] tracking-[0.2em] uppercase text-white/40 w-[108px] shrink-0">{doc.gateK}</dt>
              <dd className="relative flex-1 mono text-[12px] tracking-[0.02em] leading-snug">
                {/* The settled state is the passed value — the pre state is
                   animation-only, so it never reads as a contradiction. */}
                <span aria-hidden className="text-white/55" style={{ opacity: "calc(1 - var(--g))" }}>{doc.gatePre}</span>
                <span className="absolute inset-0 text-[var(--brand-teal-bright)]" style={{ opacity: "var(--g)" }}>{doc.gatePost}</span>
              </dd>
            </div>
          )}
        </dl>

        {/* Signature line — hairline divider, authorisation, and the stage's
           status chip (a quiet pill that replaces the old rotated ink stamp). */}
        <div className="mt-6 h-px bg-white/10" style={rev(-0.06, 0.1, 0)} aria-hidden />
        <div className="mt-4" style={rev(-0.02, 0.12, 4)}>
          {/* Label + status chip share the top line; sign-off/owner get the full
             card width below so neither truncates against the chip. */}
          <div className="flex items-center justify-between gap-3">
            <div className="mono text-[8.5px] tracking-[0.28em] uppercase text-white/30">{authLabel}</div>
            {(hasStamp || hasOpen) && (
              hasStamp ? (
                <span className="inline-flex items-center gap-1.5 mono text-[9px] tracking-[0.2em] uppercase text-[var(--brand-teal-bright)] border border-[var(--brand-teal-bright)]/35 rounded-full px-3 py-1 whitespace-nowrap">
                  <span aria-hidden>✓</span>
                  {doc.stamp}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 mono text-[9px] tracking-[0.2em] uppercase text-[var(--signal-ok)] border border-[var(--signal-ok)]/35 rounded-full px-3 py-1 whitespace-nowrap">
                  <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-[var(--signal-ok)] viz-pulse" />
                  {doc.open}
                </span>
              )
            )}
          </div>
          <dl className="mt-2.5 grid grid-cols-2 gap-x-6">
            {[
              [labels.signoff, meta.signoff],
              [labels.owner, meta.owner],
            ].map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="mono text-[8.5px] tracking-[0.2em] uppercase text-white/40">{k}</dt>
                <dd className="mono text-[10.5px] tracking-[0.04em] text-white/85 mt-1 truncate">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

// Architecture mini-schematic — the signed drawing inside the spec document.
function SpecSchematic() {
  const boxes = [
    { x: 8, label: "CITIZENS" },
    { x: 106, label: "GATEWAY" },
    { x: 204, label: "SERVICE" },
    { x: 302, label: "LEDGER" },
  ];
  return (
    <svg viewBox="0 0 392 56" className="relative z-[2] w-full h-auto mt-2" aria-hidden>
      <defs>
        <marker id="specArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--brand-teal-soft)" />
        </marker>
      </defs>
      {boxes.map((b, i) => (
        <g key={b.label} style={rev(-0.3 + i * 0.04, 0.06, 4)}>
          <rect x={b.x} y={12} width={82} height={32} fill="rgba(72,184,177,0.07)" stroke="var(--brand-teal-soft)" strokeWidth="1" />
          <text
            x={b.x + 41}
            y={31.5}
            textAnchor="middle"
            fill="rgba(255,255,255,0.85)"
            fontSize="9"
            fontFamily="var(--font-mono-stack), ui-monospace, monospace"
            letterSpacing="0.16em"
          >
            {b.label}
          </text>
        </g>
      ))}
      {[90, 188, 286].map((x, i) => (
        <path
          key={x}
          d={`M${x},28 L${x + 16},28`}
          stroke="var(--brand-teal-soft)"
          strokeWidth="1.2"
          fill="none"
          markerEnd="url(#specArrow)"
          style={rev(-0.26 + i * 0.04, 0.05, 0)}
        />
      ))}
    </svg>
  );
}

/* ─────────── Stream stepper ───────────
   Gentle wave curve connecting the 4 stage nodes; dashes flow along it and a
   teal droplet rides the curve. Continuous progress (fill + droplet) is written
   imperatively through `handle` by the ScrollTrigger; React only re-renders the
   node/label states on scene changes. */
const STREAM_W = 760;
const STREAM_H = 72;
const STREAM_NODES_X = [40, 280, 480, 720];
const STREAM_NODES_Y = [38, 22, 50, 32];

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
        const progress = Math.max(0, Math.min(1, (phase - 1) / 3));
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
              fontSize="9"
              fill={labelMain}
              style={{
                fontFamily: "var(--font-mono-stack), monospace",
                letterSpacing: "0.22em",
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
