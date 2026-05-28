"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Magnetic from "@/components/ui/Magnetic";
import type { Dict } from "@/lib/dictionaries";

const HeroScene = dynamic(() => import("@/components/three/HeroScene"), { ssr: false });

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function PinnedHero({ dict }: { dict: Dict }) {
  const outer = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const [tx, setTx] = useState(1284);
  const [activeScene, setActiveScene] = useState(0);
  const [phase, setPhase] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  // Parallax wrapper — receives CSS variables driven imperatively from a rAF loop.
  // Keeping cursor state out of React avoids a re-render of the entire hero on every frame.
  const parallax = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => setTx((v) => v + Math.floor(Math.random() * 7) + 1), 220);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const el = pin.current;
    const layer = parallax.current;
    if (!el || !layer) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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
      // Small px-space offset applied via CSS transform on the parallax wrapper
      layer.style.transform = `translate3d(${(-current.x * 14).toFixed(2)}px, ${(-current.y * 10).toFixed(2)}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  useGSAP(
    () => {
      // Skip pinning on small screens or when user prefers reduced motion —
      // both fall back to scene 0 displayed statically with no scroll-coupled work.
      const mq = window.matchMedia("(max-width: 900px)");
      const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mq.matches || rm.matches) return;

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
          {/* 3D process pipeline — centerpiece of stages 1..4. Camera dollies between
             four nodes laid out in 3D space and the active node pulses as you scroll. */}
          {!reducedMotion && (
            <div className="absolute inset-0 pointer-events-none">
              <HeroScene phase={phase} />
            </div>
          )}
          {/* 2D constellation backdrop — strong during the intro, fades back as the
             3D pipeline takes over to avoid competing with it. */}
          <div
            ref={parallax}
            className="absolute inset-0 will-change-transform"
            style={{ opacity: Math.max(0.2, 1 - phase * 0.55) }}
          >
            <Constellation phase={phase} />
          </div>
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

        {/* Scenes 1–4 — Process stages. Text card on the left; the 3D pipeline
           in the backdrop takes the right half of the frame. */}
        {modules.map((mod, i) => (
          <Scene key={i} opacity={sceneOpacity(phase, i + 1)} interactive={activeScene === i + 1}>
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center w-full">
              <div className="lg:col-span-5">
                <div className="mono text-[11px] tracking-[0.25em] uppercase text-[var(--brand-teal-bright)] flex items-center gap-3">
                  <span className="h-px w-8 bg-[var(--brand-teal-bright)]" />
                  {dict.platform.eyebrow} · <span className="text-white/45">stage 0{i + 1}</span>
                </div>
                <h2 className="mt-5 text-[clamp(2rem,4.6vw,4rem)] leading-[1.02] tracking-[-0.025em] font-medium text-white">
                  {mod.name}
                </h2>
                <p className="mt-5 max-w-md text-white/70 text-[15.5px] leading-relaxed">
                  <Typewriter text={mod.description} active={activeScene === i + 1} />
                </p>
                <Transmission stage={i} active={activeScene === i + 1} />
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
            <div className="relative mx-auto flex items-center justify-center">
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

// Stage stream — gentle wave curve connecting 4 nodes, animated dashes flow
// along it, and a teal droplet "packet" rides the curve at `progress`.
// Echoes the company name and the constellation road in the backdrop.
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

// Cubic bezier evaluation — the path is a chain of cubics with control points
// pulled along x only (so the y of each control matches its endpoint).
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
  progress,
}: {
  labels: { name: string }[];
  activeIndex: number;
  progress: number;
}) {
  const path = buildStreamPath();
  const packet = streamPoint(progress);
  const teal = "var(--brand-teal-bright)";

  return (
    <svg
      width={STREAM_W}
      height={STREAM_H + 36}
      viewBox={`0 0 ${STREAM_W} ${STREAM_H + 36}`}
      className="overflow-visible mono"
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

      {/* Progress fill — draws the first `progress` portion of the path */}
      <path
        d={path}
        stroke="url(#streamFill)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={`${Math.max(0, Math.min(1, progress))} 1`}
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

      {/* Traveling droplet — soft halo + bright core */}
      <circle cx={packet.x} cy={packet.y} r={14} fill="url(#packetGlow)" />
      <circle
        cx={packet.x}
        cy={packet.y}
        r={4}
        fill={teal}
        style={{ filter: "drop-shadow(0 0 8px var(--brand-teal-bright))" }}
      />
    </svg>
  );
}

function LogoLockup({ play }: { play: boolean }) {
  // Same asset as the navbar, rendered at its native 301×49 so it's pixel-sharp.
  // Teal corner brackets give it presence without upscaling.
  const k = play ? "play" : "idle";
  const accent = "var(--brand-teal-bright)";
  return (
    <div
      key={k}
      className="logo-hold relative inline-flex items-center justify-center"
      style={{ animationDelay: "0.2s", padding: "24px 36px" }}
    >
      {/* Corner brackets */}
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


// Per-stage typewriter — retypes the description char-by-char each time its scene
// becomes active. Full text is rendered invisibly behind the typed substring so
// the paragraph reserves its final height and there's no reflow.
function Typewriter({ text, active, speed = 22 }: { text: string; active: boolean; speed?: number }) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    if (!active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(text);
      return;
    }
    setShown("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, speed);
    return () => window.clearInterval(id);
  }, [active, text, speed]);

  return (
    <span className="relative block">
      <span className="invisible" aria-hidden>{text}</span>
      <span className="absolute inset-0">
        {shown}
        <span
          className="viz-caret inline-block w-[2px] h-[0.95em] align-[-0.12em] ml-[2px] bg-[var(--brand-teal-bright)]"
          aria-hidden
        />
      </span>
    </span>
  );
}

// Per-stage transmission block — small mono terminal log. Each op line fades
// in sequentially when the scene activates, ending with a teal "ok" tag.
const TRANSMISSION_LINES: readonly string[][] = [
  ["open channel · stakeholders", "map constraints", "write success criteria"],
  ["draft data model", "map integration surface", "sign off security boundary"],
  ["compile module", "red-team pass", "stage to acceptance"],
  ["deploy build", "attach monitoring", "on-call → infostream"],
];
function Transmission({ stage, active }: { stage: number; active: boolean }) {
  const lines = TRANSMISSION_LINES[stage] ?? [];
  const [revealed, setRevealed] = useState<number>(active ? lines.length : 0);

  useEffect(() => {
    if (!active) return;
    const target = TRANSMISSION_LINES[stage] ?? [];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(target.length);
      return;
    }
    setRevealed(0);
    const timers: number[] = [];
    target.forEach((_, i) => {
      timers.push(
        window.setTimeout(() => setRevealed((r) => Math.max(r, i + 1)), 220 + i * 280)
      );
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [active, stage]);

  return (
    <div className="mt-7 mono text-[11px] tracking-[0.08em] uppercase max-w-md">
      <div className="flex items-center gap-2 text-[var(--brand-teal-bright)] text-[10px] tracking-[0.22em]">
        <span className="bar-pulse inline-block w-[3px] h-3 bg-[var(--brand-teal-bright)]" />
        transmission
      </div>
      <div className="mt-3 space-y-1.5 border-l border-white/10 pl-3">
        {lines.map((text, idx) => {
          const shown = idx < revealed;
          return (
            <div
              key={idx}
              className="flex items-baseline gap-2 transition-all duration-300"
              style={{
                opacity: shown ? 1 : 0,
                transform: shown ? "translateY(0)" : "translateY(4px)",
              }}
            >
              <span className="text-white/30">&gt;</span>
              <span className="text-white/75">{text}</span>
              <span className="text-[var(--brand-teal-bright)] text-[10px]">· ok</span>
            </div>
          );
        })}
        <div className="flex items-baseline gap-2 text-white/35">
          <span>&gt;</span>
          <span
            className="viz-caret inline-block w-[7px] h-[0.9em] bg-[var(--brand-teal-bright)] align-[-0.1em]"
            aria-hidden
          />
        </div>
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
// Pronounced zigzag — alternates high/low so the road feels like a winding path,
// not a near-straight line. Each bubble is on a different vertical band than its neighbors.
const CLUSTER_Y = [300, 480, 200, 500, 220, 380];

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
