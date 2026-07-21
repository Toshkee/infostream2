"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import CanvasErrorBoundary from "@/components/three/CanvasErrorBoundary";
import type { Dict } from "@/lib/dictionaries";
import {
  CARD_SHELL,
  CENTER,
  FollowTheStream,
  Icon,
  Medallion,
  MOTION_QUERY,
  OrbitArcs,
  rev,
  type CSSVars,
  type IconName,
} from "./visuals";

const HeroScene = dynamic(() => import("@/components/three/HeroScene"), {
  ssr: false,
  loading: () => null,
});

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* The four process scenes were originally stops 1..4 of the single hero pin,
   with 0 the intro and 4..5 the exit pull-back. The intro now lives in
   <Hero/> (its own section), but the 3D camera path and every scene formula
   still speak that phase language — so this pin drives --ph over
   [PH_START, 5]: a short approach out of the wide shot into planet 1, then
   the four scenes, then the exit. Keeping the numbering avoids re-deriving
   the camera rig and the planet activations (see HeroScene.tsx: planet count
   must match scene count or the camera parks inside the dust cloud). */
const PH_START = 0.65;
const PH_END = 5;

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

/* ── Scroll-driven reveal helpers ──
   The pinned container carries a --ph CSS variable (PH_START..5) written once
   per scrubbed frame by ScrollTrigger. Each stage wrapper derives
   --u = --ph - stage (so --u is 0 exactly when that stage is centered). Every
   entrance below is a pure function of those variables — deterministic,
   replays in reverse when scrolling back, and needs no timers. The static
   variant sets --u: 1 so everything renders in its final, settled state. */

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

export default function PinnedProcess({ dict }: { dict: Dict }) {
  const outer = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(PH_START);
  const stepper = useRef<PhaseHandle | null>(null);
  const [activeScene, setActiveScene] = useState(1);
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
        const span = PH_END - PH_START; // four scenes + approach + exit pull-back

        ScrollTrigger.create({
          trigger: pin.current,
          start: "top top",
          // Phones get a shorter swipe per scene — a long thumb-scroll per
          // stop reads as broken; services scenes are light, so the per-stop
          // distance is shorter than the old four-stage choreography used.
          end: () => `+=${span * window.innerHeight * (window.innerWidth < 900 ? 1.0 : 1.35)}`,
          pin: pin.current,
          pinSpacing: true,
          scrub: 0.6,
          onUpdate: (self) => {
            const p = PH_START + self.progress * span;
            // One CSS variable drives every scroll-coupled style below; the
            // imperative handles cover the SVG attributes CSS can't reach.
            pin.current?.style.setProperty("--ph", p.toFixed(4));
            // The 3D pipeline has four planets (one per process scene).
            phaseRef.current = p;
            stepper.current?.update(p);
            // Discrete state — React only re-renders on scene boundaries.
            setActiveScene(Math.max(1, Math.min(4, Math.round(p))));
          },
        });
      });
    },
    { scope: outer }
  );

  const services = dict.services.items;

  return (
    <div id="platform" ref={outer} className="relative bg-[var(--bg-inset)]">
      {/* With scripting disabled the pinned variant would be a dead 100svh pin
         with its scenes stuck at opacity 0 (their opacity rides the JS-written
         --ph var), so force the static variant for no-JS clients. */}
      <noscript>
        <style>{`.process-pinned{display:none !important}.process-static{display:block !important}`}</style>
      </noscript>
      {/* ════ Pinned scroll-scrubbed variant (all motion-OK visitors — gated in CSS) ════ */}
      <div className="process-pinned">
        <div
          ref={pin}
          className="relative h-[100svh] w-full overflow-hidden text-white"
          style={{ "--ph": PH_START } as CSSVars}
        >
          {/* Dark backdrop + constellation network. */}
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

          {/* Scene progress indicator — one dash per process scene */}
          <div aria-hidden className="absolute top-1/2 right-6 lg:right-10 -translate-y-1/2 z-20 flex flex-col gap-3">
            {[1, 2, 3, 4].map((i) => (
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
              {/* Scenes 1–4 — the processes, one per scene, each with its own
                 card layout from the mockups. Visual layer is decorative; the
                 canonical, screen-reader-facing copy lives in the sr-only
                 block below (and in the static variant). */}
              {services.map((svc, i) => (
                <Scene key={i} target={i + 1}>
                  <div className="w-full" style={{ "--u": `calc(var(--ph) - ${i + 1})` } as CSSVars}>
                    <ProcessSceneBody index={i} eyebrow={dict.services.eyebrow} svc={svc} />
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

        {/* Services, stacked. --u: 1 renders every block fully settled. */}
        <div className="relative mx-auto max-w-[1280px] px-6 pt-24 pb-20">
          <div className="text-[10px] font-medium tracking-[0.28em] uppercase text-white/55">{dict.services.eyebrow}</div>
          <h2 className="mt-3 text-[clamp(1.8rem,6vw,2.6rem)] leading-[1.05] tracking-[-0.02em] font-medium text-white">
            {dict.services.title}
          </h2>
          <p className="mt-4 max-w-xl text-white/70 text-[15.5px] leading-relaxed">{dict.services.body}</p>

          <div className="mt-12 space-y-14">
            {services.map((svc, i) => (
              <article key={i} style={{ "--u": 1 } as CSSVars}>
                <StageHeading name={svc.k} description={svc.v} heading />
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

function Scene({ target, children }: { target: number; children: React.ReactNode }) {
  // Opacity/lift are CSS functions of --ph. The scenes are decoration (the
  // canonical copy lives in the sr-only block), so every layer stays inert —
  // nothing hidden can be tabbed into or read mid-animation.
  return (
    <div
      className="absolute inset-0 z-10"
      style={{
        ...sceneStyle(target),
        pointerEvents: "none",
        willChange: "opacity, transform",
      }}
      aria-hidden
      inert
    >
      <div className="mx-auto max-w-[1280px] h-full px-6 lg:px-10 flex flex-col justify-center pt-20 pb-8 md:pt-24 md:pb-12">
        {children}
      </div>
    </div>
  );
}

// ─── Stage heading: title + description ───
// `heading` renders the title as a real <h3> (static variant, where this is the
// canonical, visible content); the pinned variant leaves it a <div> because that
// scene is aria-hidden decoration and the real headings live in the sr-only block.
function StageHeading({
  name,
  description,
  heading = false,
}: {
  name: string;
  description: string;
  heading?: boolean;
}) {
  const Title = heading ? "h3" : "div";
  return (
    <div>
      {/* 3rem cap (not 3.4): the pinned scenes park this next to a ~330px
         column and "Transformation" must fit the track without sliding under
         the cards — measured against Author's advance widths. */}
      <Title className="font-display text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.02] tracking-[-0.025em] font-medium text-white">
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
  eyebrow,
  svc,
}: {
  index: number;
  eyebrow: string;
  svc: ProcessItem;
}) {
  const icons = PROCESS_CARD_ICONS[index] ?? [];
  const left = (
    <div>
      <div
        className="text-[11px] font-medium tracking-[0.25em] uppercase text-[var(--brand-teal-bright)]"
        style={rev(-0.42, 0.12, 6)}
      >
        {eyebrow}
      </div>
      <div className="mt-5">
        <StageHeading name={svc.k} description={svc.v} />
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
      <div className="grid items-center gap-8 lg:gap-10 lg:grid-cols-[minmax(260px,350px)_1fr]">
        {left}
        <div className="hidden md:grid grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-5">
          {svc.cards.map((c, j) => (
            <div key={j} className={`relative ${CARD_SHELL} p-5`} style={rev(-0.28 + j * 0.08, 0.14, 12)}>
              <Medallion name={icons[j]} />
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
            <Medallion name={icons[j]} />
            <div className="mt-4 text-[14px] font-medium uppercase tracking-[0.08em] text-white">{c.k}</div>
            <TitleDash />
            <p className="mt-3 text-[12.5px] leading-relaxed text-white/60">{c.v}</p>
          </div>
        ))}
      </div>
    </div>
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
              y={STREAM_Y + 30}
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
