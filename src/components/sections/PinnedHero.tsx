"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Magnetic from "@/components/ui/Magnetic";
import StageViz from "@/components/sections/StageViz";
import type { SceneState } from "@/components/three/DataFlowScene";
import type { Dict } from "@/lib/dictionaries";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const DataFlowScene = dynamic(() => import("@/components/three/DataFlowScene"), {
  ssr: false,
  loading: () => null,
});

export default function PinnedHero({ dict }: { dict: Dict }) {
  const outer = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const sceneStateRef = useRef<SceneState>({ phase: 0 });
  const [tx, setTx] = useState(1284);
  const [activeScene, setActiveScene] = useState(0);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTx((v) => v + Math.floor(Math.random() * 7) + 1), 220);
    return () => window.clearInterval(id);
  }, []);

  useGSAP(
    () => {
      // Skip pinning on small screens — just show scene 0 statically
      const mq = window.matchMedia("(max-width: 900px)");
      if (mq.matches) return;

      // 5 content scenes (0..4) + exit pull-back (4..5) = 5 transitions
      const stops = 5;
      // Pin length multiplier — higher = slower scroll between scenes (more time to read animations)
      const pinDuration = stops * window.innerHeight * 1.7;

      ScrollTrigger.create({
        trigger: outer.current,
        start: "top top",
        end: `+=${pinDuration}`,
        pin: pin.current,
        pinSpacing: true,
        scrub: 0.6,
        onUpdate: (self) => {
          const p = self.progress * stops; // 0..5
          sceneStateRef.current.phase = p;
          setPhase(p);
          setActiveScene(Math.max(0, Math.min(4, Math.round(p))));
        },
      });

      // Intro entry animation (runs once on mount)
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".hero-eyebrow", { opacity: 0, y: 14, duration: 0.7 })
        .from(".hero-title-word", { opacity: 0, y: 44, duration: 1.0, stagger: 0.07 }, "-=0.4")
        .from(".hero-body", { opacity: 0, y: 18, duration: 0.7 }, "-=0.6")
        .from(".hero-cta", { opacity: 0, y: 14, duration: 0.55, stagger: 0.08 }, "-=0.4")
        .from(".hero-meta-row", { opacity: 0, y: 10, duration: 0.5, stagger: 0.08 }, "-=0.5");
    },
    { scope: outer }
  );

  const titleWords = dict.hero.title.split(" ");
  const modules = dict.platform.items;

  // Exit fade — scene 4 content fades out 3.7 → 4.1 (well before exit text appears)
  const exitFade = phase <= 3.7 ? 1 : Math.max(0, 1 - (phase - 3.7) / 0.4);
  const contentOpacity = exitFade;
  // Stepper progress — 0 at scene 1 start, 1 at scene 4 (fills the connecting line)
  const stepProgress = Math.max(0, Math.min(1, (phase - 1) / 3));
  // Stepper visibility — only on stages 1..4 (fade in at 0.6, out at 4.1)
  const stepperOpacity = phase < 0.6
    ? Math.max(0, (phase - 0.3) / 0.3)
    : phase > 4
    ? Math.max(0, 1 - (phase - 4) / 0.3)
    : 1;
  // Exit overlay — fades in 4.05 → 4.5, holds at full through end so it's readable
  const exitOpacity = Math.max(0, Math.min(1, (phase - 4.05) / 0.45));
  // Backdrop darken — gentle wash to separate the closing message from the field
  const exitDarken = Math.max(0, Math.min(1, (phase - 4.2) / 0.6));

  return (
    <div id="platform" ref={outer} className="relative bg-[var(--bg-inset)]">
      <div
        ref={pin}
        className="relative h-[100svh] w-full overflow-hidden text-white"
      >
        {/* 3D backdrop */}
        <div className="absolute inset-0 z-0">
          <DataFlowScene stateRef={sceneStateRef} />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-inset)]/85 via-[var(--bg-inset)]/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[var(--bg-inset)]" />
          {/* Exit darken — fades the whole scene into black before unpin */}
          <div
            className="absolute inset-0 bg-[var(--bg-inset)] pointer-events-none transition-opacity"
            style={{ opacity: exitDarken * 0.75 }}
          />
        </div>

        {/* faint grid */}
        <div
          aria-hidden
          className="absolute inset-0 z-[1] opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />

        {/* corner ticks */}
        {["top-6 left-6", "top-6 right-6", "bottom-6 left-6", "bottom-6 right-6"].map((c, i) => (
          <span
            key={i}
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
        <div className="absolute top-1/2 right-6 lg:right-10 -translate-y-1/2 z-20 flex flex-col gap-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={`block h-px transition-all duration-500 ${
                i === activeScene ? "w-10 bg-[var(--brand-teal-bright)]" : "w-5 bg-white/25"
              }`}
            />
          ))}
        </div>

        {/* All content scenes — fade out together on exit */}
        <div className="absolute inset-0 z-10 pointer-events-none" style={{ opacity: contentOpacity }}>
        <div className="absolute inset-0 pointer-events-auto">
        {/* Scene 0 — Intro */}
        <Scene visible={activeScene === 0}>
          <div className="hero-eyebrow mono text-[11px] tracking-[0.25em] uppercase text-[var(--brand-teal-bright)] flex items-center gap-3">
            <span className="flex items-end gap-[3px] h-3">
              <span className="bar-pulse inline-block w-[3px] h-full bg-[var(--brand-teal-bright)]" style={{ animationDelay: "0s" }} />
              <span className="bar-pulse inline-block w-[3px] h-2 bg-[var(--brand-teal-bright)]" style={{ animationDelay: "0.15s" }} />
              <span className="bar-pulse inline-block w-[3px] h-full bg-[var(--brand-teal-bright)]" style={{ animationDelay: "0.3s" }} />
              <span className="bar-pulse inline-block w-[3px] h-1.5 bg-[var(--brand-teal-bright)]" style={{ animationDelay: "0.45s" }} />
            </span>
            {dict.hero.eyebrow}
          </div>
          <h1 className="mt-6 text-[clamp(2.2rem,5.2vw,4.8rem)] leading-[1.02] tracking-[-0.025em] font-medium text-white max-w-4xl">
            {titleWords.map((w, i) => (
              <span key={i} className="hero-title-word inline-block mr-[0.22em]">{w}</span>
            ))}
          </h1>
          <p className="hero-body mt-6 max-w-xl text-white/70 text-[16.5px] leading-relaxed">{dict.hero.body}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Magnetic>
              <a href="#clients" className="hero-cta mono text-[11px] tracking-[0.2em] uppercase px-5 py-3 rounded-full bg-[var(--brand-red)] text-white hover:bg-[var(--brand-red-deep)] transition-colors inline-block">
                {dict.hero.ctaPrimary}
              </a>
            </Magnetic>
            <Magnetic>
              <a href="#security" className="hero-cta mono text-[11px] tracking-[0.2em] uppercase px-5 py-3 rounded-full border border-white/25 text-white hover:bg-white/10 transition-colors inline-block">
                {dict.hero.ctaSecondary}
              </a>
            </Magnetic>
          </div>

          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 border border-white/10 rounded-md overflow-hidden max-w-3xl">
            {[
              { k: "nodes", v: "6" },
              { k: "edges", v: "9" },
              { k: "uptime", v: "99.99%" },
              { k: "tx/s", v: tx.toLocaleString() },
            ].map((m, i) => (
              <div key={i} className="hero-meta-row bg-[var(--bg-inset-elev)] px-4 py-3">
                <div className="mono text-[10px] tracking-[0.22em] uppercase text-white/40">{m.k}</div>
                <div className={`mono text-base mt-1 ${m.k === "tx/s" ? "text-[var(--brand-teal-bright)]" : "text-white/90"}`}>
                  {m.v}
                </div>
              </div>
            ))}
          </div>
        </Scene>

        {/* Scenes 1–4 — Process stages */}
        {modules.map((mod, i) => (
          <Scene key={i} visible={activeScene === i + 1}>
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center w-full">
              <div>
                <div className="mono text-[11px] tracking-[0.25em] uppercase text-[var(--brand-teal-bright)] flex items-center gap-3">
                  <span className="h-px w-8 bg-[var(--brand-teal-bright)]" />
                  {dict.platform.eyebrow} · {String(i + 1).padStart(2, "0")} / 04
                </div>
                <h2 className="mt-5 text-[clamp(2rem,4.6vw,4rem)] leading-[1.02] tracking-[-0.025em] font-medium text-white">
                  {mod.name}
                </h2>
                <p className="mt-5 max-w-md text-white/70 text-[15.5px] leading-relaxed">
                  {mod.description}
                </p>
                <div className="mt-7 flex items-center gap-3 mono text-[11px] tracking-[0.2em] uppercase text-white/45">
                  <span className="h-px w-10 bg-white/30" />
                  {["scope · constraints · risk", "design · review · sign-off", "engineer · harden · review", "deploy · monitor · support"][i]}
                </div>
              </div>
              <div className="hidden lg:block">
                <StageViz stage={i} active={activeScene === i + 1} />
              </div>
            </div>
          </Scene>
        ))}
        </div>
        </div>

        {/* Hexagon stepper — visible across all four stages, line fills with progress */}
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-10 z-30 pointer-events-none"
          style={{ opacity: stepperOpacity }}
        >
          <HexStepper
            labels={modules.map((m) => m.name)}
            activeIndex={Math.max(0, activeScene - 1)}
            progress={stepProgress}
          />
        </div>

        {/* Exit overlay — appears as camera pulls back */}
        <div
          className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
          style={{ opacity: exitOpacity }}
        >
          <div className="text-center px-6">
            {/* Logo lockup — hexagon network drawing in, then Infostream logo pops in the center */}
            <div className="relative mx-auto" style={{ width: 420, height: 260 }}>
              <LogoLockup play={exitOpacity > 0.4} />
            </div>
            <div className="mt-5 text-[clamp(1.6rem,3.6vw,2.6rem)] leading-[1.1] tracking-[-0.02em] font-medium text-white max-w-3xl mx-auto">
              Four stages. One accountable team. <span className="text-[var(--brand-teal-bright)]">Fifteen years of staying on the line.</span>
            </div>
            <div className="mt-7 mono text-[11px] tracking-[0.25em] uppercase text-white/45">
              ↓ scroll to see who&apos;s connected
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HexStepper({
  labels,
  activeIndex,
  progress,
}: {
  labels: { name: string }[];
  activeIndex: number;
  progress: number;
}) {
  const count = labels.length;
  const gap = 140;
  const totalW = (count - 1) * gap;
  const teal = "var(--brand-teal-bright)";
  return (
    <div className="relative mono" style={{ width: totalW + 80, height: 96 }}>
      {/* Connecting line (idle) */}
      <div
        className="absolute top-[22px] h-px bg-white/15"
        style={{ left: 40, width: totalW }}
      />
      {/* Connecting line (filled with progress — tracks scrub directly) */}
      <div
        className="absolute top-[22px] h-px bg-[var(--brand-teal-bright)]"
        style={{
          left: 40,
          width: totalW * progress,
          boxShadow: "0 0 8px var(--brand-teal-bright)",
        }}
      />
      {/* Hexagon nodes */}
      {labels.map((m, i) => {
        const cx = 40 + i * gap;
        const isActive = i === activeIndex;
        const isDone = i < activeIndex;
        const color = isActive || isDone ? teal : "rgba(255,255,255,0.35)";
        const fill = isActive ? "rgba(72,184,177,0.18)" : "transparent";
        return (
          <div
            key={i}
            className="absolute -translate-x-1/2 flex flex-col items-center"
            style={{ left: cx, top: 0 }}
          >
            <svg width="44" height="44" viewBox="0 0 44 44" style={{ overflow: "visible" }}>
              <polygon
                points="22,2 40,12 40,32 22,42 4,32 4,12"
                fill={fill}
                stroke={color}
                strokeWidth={isActive ? 1.6 : 1}
                style={{
                  transition: "all 0.4s ease",
                  filter: isActive ? "drop-shadow(0 0 6px var(--brand-teal-bright))" : "none",
                  transform: isActive ? "scale(1.08)" : "scale(1)",
                  transformOrigin: "center",
                }}
              />
              <text
                x="22"
                y="26"
                textAnchor="middle"
                fontSize="11"
                fill={color}
                style={{ fontFamily: "var(--font-mono-stack), monospace", letterSpacing: "0.05em" }}
              >
                {String(i + 1).padStart(2, "0")}
              </text>
            </svg>
            <div
              className="mt-2 text-[10px] tracking-[0.22em] uppercase whitespace-nowrap"
              style={{ color, transition: "color 0.4s" }}
            >
              {m.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LogoLockup({ play }: { play: boolean }) {
  // Clean Infostream mark — bars + wordmark on a soft glow. Holds at full opacity
  // (uses logo-hold which explicitly pins opacity:1 at 100%, no overshoot-then-shrink).
  const k = play ? "play" : "idle";
  return (
    <div
      key={k}
      className="logo-hold flex items-center justify-center gap-5 w-full h-full"
      style={{ animationDelay: "0.2s" }}
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(72,184,177,0.28), rgba(72,184,177,0) 70%)",
        }}
      />
      {/* Signal bars — same proportions as the door + navbar mark */}
      <svg width="84" height="76" viewBox="0 0 84 76" className="relative shrink-0" aria-hidden>
        <rect x="0"  y="38" width="11" height="36" rx="2" fill="var(--brand-teal-bright)" />
        <rect x="15" y="24" width="11" height="50" rx="2" fill="var(--brand-teal-bright)" />
        <rect x="30" y="2"  width="11" height="72" rx="2" fill="var(--brand-teal-bright)" />
        <rect x="45" y="16" width="11" height="58" rx="2" fill="var(--brand-teal-bright)" />
        <rect x="60" y="32" width="11" height="42" rx="2" fill="var(--brand-teal-bright)" />
      </svg>
      {/* Wordmark */}
      <div className="relative">
        <div
          className="text-white font-medium leading-none"
          style={{
            fontSize: 56,
            letterSpacing: "-0.02em",
            fontFamily: "var(--font-sans-stack), sans-serif",
          }}
        >
          infostream
        </div>
        <div
          className="mt-2 h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, var(--brand-teal-bright), rgba(72,184,177,0))",
            boxShadow: "0 0 8px var(--brand-teal-bright)",
          }}
        />
      </div>
    </div>
  );
}


function Scene({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`absolute inset-0 z-10 transition-opacity duration-500 ease-out ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="mx-auto max-w-[1280px] h-full px-6 lg:px-10 flex flex-col justify-center pt-24 pb-12">
        {children}
      </div>
    </div>
  );
}
