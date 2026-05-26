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

  // Exit fade — scene 4 holds until 4.45 so the user can read it, then fades out by 4.75
  const exitFade = phase <= 4.45 ? 1 : Math.max(0, 1 - (phase - 4.45) / 0.3);
  const contentOpacity = exitFade;
  // Stepper progress — 0 at scene 1 start, 1 at scene 4 (fills the connecting line)
  const stepProgress = Math.max(0, Math.min(1, (phase - 1) / 3));
  // Stepper visibility — fades out alongside scene 4 content
  const stepperOpacity = phase < 0.6
    ? Math.max(0, (phase - 0.3) / 0.3)
    : phase > 4.45
    ? Math.max(0, 1 - (phase - 4.45) / 0.3)
    : 1;
  // Exit overlay — fades in 4.6 → 4.9 (after scene 4 has had time on screen)
  const exitOpacity = Math.max(0, Math.min(1, (phase - 4.6) / 0.3));
  // Backdrop darken — gentle wash to separate the closing message from the field
  const exitDarken = Math.max(0, Math.min(1, (phase - 4.55) / 0.4));

  return (
    <div id="platform" ref={outer} className="relative bg-[var(--bg-inset)]">
      <div
        ref={pin}
        className="relative h-[100svh] w-full overflow-hidden text-white"
      >
        {/* Dark backdrop + constellation network on top.
           As phase advances 0→4, the SVG viewBox pans toward the next cluster
           (the "dive" between bubbles). */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-[var(--bg-inset)]">
          {/* Deep radial vignette for depth */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 90% 70% at 50% 45%, #19223a 0%, #0d111c 70%, #07090f 100%)",
            }}
          />
          {/* Constellation lines + dots */}
          <Constellation phase={phase} />
          {/* Left-side wash — stronger now so the constellation behind text fades out and doesn't fight content */}
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-inset)] from-15% via-[var(--bg-inset)]/55 via-45% to-transparent" />
          {/* Top + bottom soft edges */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[var(--bg-inset)] to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[var(--bg-inset)]" />
          {/* Exit darken — fades the scene before unpin */}
          <div
            className="absolute inset-0 bg-[var(--bg-inset)] pointer-events-none"
            style={{ opacity: exitDarken * 0.75 }}
          />
        </div>

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

        {/* All content scenes — fade out together on exit. Each scene's own opacity
           is a smooth bell around its target phase (no snap between layers). */}
        <div className="absolute inset-0 z-10 pointer-events-none" style={{ opacity: contentOpacity }}>
        <div className="absolute inset-0 pointer-events-auto">
        {/* Scene 0 — Intro */}
        <Scene opacity={sceneOpacity(phase, 0)} interactive={activeScene === 0}>
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
          <Scene key={i} opacity={sceneOpacity(phase, i + 1)} interactive={activeScene === i + 1}>
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
            labels={modules.map((m) => ({ name: m.name }))}
            activeIndex={Math.max(0, activeScene - 1)}
            progress={stepProgress}
          />
        </div>

        {/* Exit overlay — Infostream lockup on the dark backdrop */}
        <div
          className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
          style={{ opacity: exitOpacity }}
        >
          <div className="text-center px-6">
            <div className="relative mx-auto" style={{ width: 480, height: 140 }}>
              <LogoLockup play={exitOpacity > 0.4} />
            </div>
            <div className="mt-7 text-[clamp(1.6rem,3.6vw,2.6rem)] leading-[1.1] tracking-[-0.02em] font-medium text-white max-w-3xl mx-auto">
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
  // Exact Infostream mark: teal signal-bars on left + RED "infostream" wordmark on right
  // (matches infostream.webp reference — wordmark is brand-red, not white).
  const k = play ? "play" : "idle";
  return (
    <div
      key={k}
      className="logo-hold relative flex items-center justify-center gap-5 w-full h-full"
      style={{ animationDelay: "0.2s" }}
    >
      {/* Signal bars — teal, ascending then descending peak in the middle */}
      <svg width="78" height="72" viewBox="0 0 78 72" className="relative shrink-0" aria-hidden>
        <rect x="0"  y="40" width="10" height="32" rx="1.5" fill="var(--brand-teal)" />
        <rect x="14" y="24" width="10" height="48" rx="1.5" fill="var(--brand-teal)" />
        <rect x="28" y="4"  width="10" height="68" rx="1.5" fill="var(--brand-teal)" />
        <rect x="42" y="14" width="10" height="58" rx="1.5" fill="var(--brand-teal)" />
        <rect x="56" y="30" width="10" height="42" rx="1.5" fill="var(--brand-teal)" />
      </svg>
      {/* Wordmark — brand red, matches the real logo. No halo/background. */}
      <div
        className="relative font-semibold leading-none"
        style={{
          fontSize: 58,
          letterSpacing: "-0.025em",
          color: "var(--brand-red)",
          fontFamily: "var(--font-sans-stack), sans-serif",
        }}
      >
        infostream
      </div>
    </div>
  );
}


function Scene({
  opacity,
  interactive,
  children,
}: {
  opacity: number;
  interactive: boolean;
  children: React.ReactNode;
}) {
  // Continuous opacity driven by phase distance — no snap between scenes.
  // Below the activation threshold the layer is taken out of hit-testing.
  const hidden = opacity < 0.02;
  return (
    <div
      className="absolute inset-0 z-10"
      style={{
        opacity,
        pointerEvents: interactive && !hidden ? "auto" : "none",
        // Soft lift as a scene approaches its target — gives a parallax sense
        transform: `translateY(${(1 - opacity) * 10}px)`,
        willChange: "opacity, transform",
      }}
      aria-hidden={hidden}
    >
      <div className="mx-auto max-w-[1280px] h-full px-6 lg:px-10 flex flex-col justify-center pt-24 pb-12">
        {children}
      </div>
    </div>
  );
}

// Smooth bell around `target` phase. Tighter half-width = scene only appears
// when you're close to arrival. 0.4 means scenes start cross-fading at ~half
// way and the previous one is mostly gone by 70% of the transition.
function sceneOpacity(phase: number, target: number): number {
  const d = Math.abs(phase - target);
  const half = 0.4;
  if (d >= half) return 0;
  const t = 1 - d / half;
  return t * t * (3 - 2 * t); // smoothstep
}

/* ─────────── Constellation backdrop ───────────
   Wide virtual canvas with 6 clusters of dots+lines (one per scene).
   The SVG viewBox pans toward the cluster matching `phase`, so scrolling
   feels like flying between bubbles. Generated once with a seeded RNG. */
function seededRand(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type CNode = { x: number; y: number; r: number; red: boolean };
type CCluster = { nodes: CNode[]; edges: [number, number][] };

function buildCluster(seed: number, cx: number, cy: number, count: number, spread: number): CCluster {
  const rand = seededRand(seed);
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
  // Edges: connect each node to its 1–2 nearest neighbors
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
const CLUSTER_Y = [320, 240, 380, 260, 360, 300];

// Smooth Catmull-Rom-ish path through all bubble centers — the "road"
function buildRoadPath(): string {
  const pts = CLUSTER_X.map((x, i) => [x, CLUSTER_Y[i]] as [number, number]);
  // Cubic bezier with control points offset along x for smooth S-curve
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

function Constellation({ phase }: { phase: number }) {
  const clusters = useConstellationClusters();
  const road = useRoadPath();
  const lo = Math.max(0, Math.min(4, Math.floor(phase)));
  const hi = Math.min(5, lo + 1);
  const f = phase - lo;
  const fs = f * f * (3 - 2 * f); // smoothstep for camera motion
  const cx = CLUSTER_X[lo] + (CLUSTER_X[hi] - CLUSTER_X[lo]) * fs;
  const cy = CLUSTER_Y[lo] + (CLUSTER_Y[hi] - CLUSTER_Y[lo]) * fs;
  const zoom = 1 + Math.sin(f * Math.PI) * 0.18;
  const vw = 1800 * zoom;
  const vh = 900 * zoom;
  // Bias the viewBox so the active bubble sits ~70% from the left of the screen
  // (right side, behind the StageViz card). This keeps it out of the text column.
  const bubbleScreenX = 0.7;
  const viewLeft = cx - vw * bubbleScreenX;
  const viewTop = cy - vh / 2;

  return (
    <svg
      viewBox={`${viewLeft} ${viewTop} ${vw} ${vh}`}
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

      {/* The road — full continuous path connecting all bubbles */}
      <path
        d={road}
        fill="none"
        stroke="rgba(72,184,177,0.18)"
        strokeWidth="1.5"
      />
      {/* Flowing dashes along the road (animated) */}
      <path
        d={road}
        fill="none"
        stroke="var(--brand-teal-bright)"
        strokeWidth="1.2"
        strokeDasharray="6 14"
        opacity="0.55"
        style={{ animation: "roadFlow 8s linear infinite" }}
      />

      {/* Satellite dots + intra-cluster edges (constellation accent) */}
      {clusters.map((cl, ci) => {
        const dx = (CLUSTER_X[ci] - cx) / 1200;
        const distOpacity = Math.max(0.18, 1 - Math.abs(dx) * 0.55);
        return (
          <g key={ci} style={{ opacity: distOpacity }}>
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
        );
      })}

      {/* Process bubbles — one per phase stop. The bubble nearest the current
         phase "pops" (scales + glows). */}
      {CLUSTER_X.map((bx, i) => {
        const by = CLUSTER_Y[i];
        // Activation strength — 1.0 when phase exactly matches this stop, 0 when far away
        const d = Math.abs(phase - i);
        // Tighter window so the bubble only pops as you arrive at this stop,
        // not several scenes ahead.
        const active = Math.max(0, 1 - d / 0.35);
        const easedActive = active * active * (3 - 2 * active);
        const baseR = 38;
        const r = baseR + easedActive * 28; // grows when active
        const ringR = r + 10 + easedActive * 14;
        return (
          <g key={`b-${i}`}>
            {/* Outer pulse ring (only when active) */}
            {easedActive > 0.05 && (
              <circle
                cx={bx}
                cy={by}
                r={ringR}
                fill="none"
                stroke="var(--brand-teal-bright)"
                strokeWidth="1"
                opacity={easedActive * 0.6}
              />
            )}
            {/* Bubble body */}
            <circle
              cx={bx}
              cy={by}
              r={r}
              fill={`url(#${easedActive > 0.5 ? "bubbleFillActive" : "bubbleFill"})`}
            />
            {/* Bubble border */}
            <circle
              cx={bx}
              cy={by}
              r={r}
              fill="none"
              stroke="var(--brand-teal-bright)"
              strokeWidth={1 + easedActive * 0.8}
              opacity={0.55 + easedActive * 0.4}
              style={{
                filter: easedActive > 0.4 ? "drop-shadow(0 0 12px var(--brand-teal-bright))" : "none",
              }}
            />
            {/* Traveling marker — small dot above the bubble when fully active */}
            {easedActive > 0.7 && (
              <circle cx={bx} cy={by - r - 4} r="3" fill="var(--brand-red)" opacity={easedActive} />
            )}
          </g>
        );
      })}
    </svg>
  );
}

let _clusterCache: CCluster[] | null = null;
function useConstellationClusters(): CCluster[] {
  if (_clusterCache) return _clusterCache;
  // Smaller satellite halo around each bubble (the bubble itself is drawn over them)
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
