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

  // Fake live throughput ticker. Gated on reduced-motion and viewport visibility
  // so it doesn't re-render the whole hero tree forever while scrolled off-screen.
  useEffect(() => {
    if (reducedMotion) return;
    const el = outer.current;
    let visible = true;
    const io = el
      ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: "300px" })
      : null;
    if (el && io) io.observe(el);
    const id = window.setInterval(() => {
      if (visible) setTx((v) => v + Math.floor(Math.random() * 7) + 1);
    }, 220);
    return () => {
      window.clearInterval(id);
      io?.disconnect();
    };
  }, [reducedMotion]);

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
              { k: "tx/s", v: tx.toLocaleString("en-US") },
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
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-start w-full">
              <div className="lg:col-span-6">
                <StageHeader index={i} eyebrow={dict.platform.eyebrow} total={modules.length} />
                <h2 className="mt-4 text-[clamp(2rem,4.6vw,4rem)] leading-[1.02] tracking-[-0.025em] font-medium text-white">
                  {mod.name}
                </h2>
                <p className="mt-5 max-w-md text-white/70 text-[15.5px] leading-relaxed">
                  <Typewriter text={mod.description} active={activeScene === i + 1} />
                </p>
                <StageDiagram stage={i} active={activeScene === i + 1} />
                <StageMeta stage={i} active={activeScene === i + 1} />
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
              {/* Mount only once the exit actually begins, so the logo plays its
                 entrance a single time here — not pre-played (hidden) at page
                 load and then restarted, which read as a double appearance. */}
              {exitOpacity > 0.02 && <LogoLockup />}
            </div>
            <div className="mt-7 text-[clamp(1.6rem,3.6vw,2.6rem)] leading-[1.1] tracking-[-0.02em] font-medium text-white max-w-3xl mx-auto">
              {dict.hero.exitTitle} <span className="text-[var(--brand-teal-bright)]">{dict.hero.exitAccent}</span>
            </div>
            <div className="mt-7 mono text-[11px] tracking-[0.25em] uppercase text-white/45">
              ↓ {dict.hero.exitScrollHint}
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

function LogoLockup() {
  // Same asset as the navbar, rendered at its native 301×49 so it's pixel-sharp.
  // Teal corner brackets give it presence without upscaling.
  const accent = "var(--brand-teal-bright)";
  return (
    <div
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
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [shown, setShown] = useState(active && reduce ? text : "");
  // Reset the typed text on each activation edge during render (the React-blessed
  // "adjust state while rendering" pattern) rather than synchronously inside an
  // effect — the effect below only schedules async updates from a timer.
  const [prevActive, setPrevActive] = useState(active);
  if (active !== prevActive) {
    setPrevActive(active);
    setShown(active && reduce ? text : "");
  }

  useEffect(() => {
    if (!active || reduce) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, speed);
    return () => window.clearInterval(id);
  }, [active, text, speed, reduce]);

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

// ─── Stage header ───
// Eyebrow + giant stage numeral + total-count indicator. Replaces the plain
// "PROCESS · stage 02" line with something that anchors the card visually.
function StageHeader({ index, eyebrow, total }: { index: number; eyebrow: string; total: number }) {
  const num = String(index + 1).padStart(2, "0");
  const tot = String(total).padStart(2, "0");
  return (
    <div className="flex items-end gap-5">
      <div className="leading-none">
        <div className="mono text-[10px] tracking-[0.28em] uppercase text-white/45">
          {eyebrow} / stage
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className="font-medium text-[clamp(2.2rem,3.6vw,3.2rem)] leading-none tracking-[-0.04em] text-transparent"
            style={{ WebkitTextStroke: "1px var(--brand-teal-bright)" }}
          >
            {num}
          </span>
          <span className="mono text-[11px] tracking-[0.22em] text-white/35">/ {tot}</span>
        </div>
      </div>
      <span className="hidden sm:block flex-1 h-px bg-gradient-to-r from-[var(--brand-teal-bright)]/40 to-transparent mb-2" />
    </div>
  );
}

// ─── Stage meta footer ───
// Three short mono columns under the diagram — anchors the card with editorial
// "spec-sheet" detail (deliverable, sign-off, owner) rather than a "· ok" repeat.
const STAGE_META: { k: string; v: string }[][] = [
  [
    { k: "deliverable", v: "brief.md" },
    { k: "sign-off",    v: "stakeholders" },
    { k: "owner",       v: "lead architect" },
  ],
  [
    { k: "deliverable", v: "system-context" },
    { k: "sign-off",    v: "cto · security" },
    { k: "owner",       v: "2× architects" },
  ],
  [
    { k: "deliverable", v: "release candidate" },
    { k: "sign-off",    v: "internal red team" },
    { k: "owner",       v: "engineering" },
  ],
  [
    { k: "deliverable", v: "runbook + on-call" },
    { k: "sign-off",    v: "infostream sre" },
    { k: "owner",       v: "24 / 7 rotation" },
  ],
];
function StageMeta({ stage, active }: { stage: number; active: boolean }) {
  const items = STAGE_META[stage] ?? [];
  return (
    <div className="mt-7 grid grid-cols-3 gap-px bg-white/10 border-y border-white/10 max-w-md">
      {items.map((m, i) => (
        <div
          key={m.k}
          className="bg-[var(--bg-inset)]/60 px-3 py-2.5 viz-fade"
          style={{ animationDelay: active ? `${1.5 + i * 0.08}s` : "0s" }}
        >
          <div className="mono text-[8.5px] tracking-[0.22em] uppercase text-white/35">{m.k}</div>
          <div className="mono text-[10.5px] tracking-[0.14em] uppercase text-white/85 mt-1">{m.v}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Stage diagram ───
// Inline animated mini-diagram. Each stage gets its own visualization that
// draws / pops / fades into view via the existing viz-* CSS animations.
function StageDiagram({ stage, active }: { stage: number; active: boolean }) {
  // Replay the diagram animation each time the scene (re)activates. Bump the
  // remount key on the active false→true edge during render — no setState inside
  // an effect (which would cascade renders).
  const [prevActive, setPrevActive] = useState(active);
  const [runId, setRunId] = useState(0);
  if (active !== prevActive) {
    setPrevActive(active);
    if (active) setRunId((r) => r + 1);
  }
  const Inner = [DiscoveryDiagram, ArchitectureDiagram, BuildDiagram, OperateDiagram][stage] ?? DiscoveryDiagram;
  return (
    <div className="mt-7 max-w-md">
      <div
        className="viz-panel relative w-full rounded-md border border-white/10 overflow-hidden"
        style={{
          background: "linear-gradient(180deg, rgba(19,26,42,0.55), rgba(13,17,28,0.55))",
          boxShadow: "inset 0 0 40px -20px rgba(72,184,177,0.18)",
          aspectRatio: "16 / 9",
        }}
      >
        {/* corner ticks */}
        {[[6,6],[null,6],[6,null],[null,null]].map((c, i) => (
          <span
            key={i}
            aria-hidden
            className="absolute h-1.5 w-1.5 border-[var(--brand-teal-bright)]/60"
            style={{
              top: c[1] === 6 ? 6 : undefined,
              bottom: c[1] === null ? 6 : undefined,
              left: c[0] === 6 ? 6 : undefined,
              right: c[0] === null ? 6 : undefined,
              borderTopWidth: c[1] === 6 ? 1 : 0,
              borderBottomWidth: c[1] === null ? 1 : 0,
              borderLeftWidth: c[0] === 6 ? 1 : 0,
              borderRightWidth: c[0] === null ? 1 : 0,
            }}
          />
        ))}
        {active && <Inner key={runId} />}
      </div>
    </div>
  );
}

const D_TEAL = "var(--brand-teal-soft)";
const D_DIM = "rgba(255,255,255,0.42)";

// Discovery — central brief + satellite stakeholder dots being mapped.
function DiscoveryDiagram() {
  const nodes = [
    { x: 70,  y: 50,  label: "STAKEHOLDERS" },
    { x: 330, y: 48,  label: "CONSTRAINTS" },
    { x: 50,  y: 165, label: "USERS" },
    { x: 350, y: 168, label: "RISK" },
    { x: 200, y: 195, label: "COMPLIANCE" },
  ];
  return (
    <svg viewBox="0 0 400 225" className="absolute inset-0 w-full h-full">
      <defs>
        <pattern id="dGrid2" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.55" fill="rgba(255,255,255,0.08)" />
        </pattern>
      </defs>
      <rect width="400" height="225" fill="url(#dGrid2)" />

      {nodes.map((n, i) => (
        <line
          key={`l-${i}`}
          x1={200} y1={112} x2={n.x} y2={n.y}
          stroke={D_TEAL} strokeOpacity={0.45} strokeWidth={1}
          className="viz-draw"
          style={{ ["--dash" as never]: 200, animationDelay: `${0.25 + i * 0.09}s` }}
        />
      ))}
      {nodes.map((n, i) => (
        <g key={`n-${i}`} className="viz-pop" style={{ animationDelay: `${0.4 + i * 0.09}s` }}>
          <circle cx={n.x} cy={n.y} r={5} fill={D_TEAL} />
          <circle cx={n.x} cy={n.y} r={10} fill="none" stroke={D_TEAL} strokeOpacity={0.35} />
        </g>
      ))}
      {nodes.map((n, i) => (
        <text
          key={`t-${i}`}
          x={n.x} y={n.y - 16}
          textAnchor="middle"
          fill="rgba(255,255,255,0.58)"
          fontSize="8"
          fontFamily="ui-monospace, monospace"
          letterSpacing="0.18em"
          className="viz-fade"
          style={{ animationDelay: `${0.6 + i * 0.09}s` }}
        >
          {n.label}
        </text>
      ))}
      <g className="viz-pop" style={{ animationDelay: "0.1s" }}>
        <circle cx={200} cy={112} r={24} fill="none" stroke="var(--brand-red)" strokeWidth={1.4} />
        <circle cx={200} cy={112} r={11} fill="var(--brand-red)" />
        <text x={200} y={115} textAnchor="middle" fill="white" fontSize="7.5" fontFamily="ui-monospace, monospace" letterSpacing="0.22em">BRIEF</text>
      </g>
    </svg>
  );
}

// Architecture — blueprint of services + integration boundaries being drawn.
function ArchitectureDiagram() {
  const boxes = [
    { x: 22,  y: 95,  w: 72, h: 38, label: "CITIZENS" },
    { x: 122, y: 95,  w: 72, h: 38, label: "GATEWAY" },
    { x: 222, y: 95,  w: 72, h: 38, label: "SERVICE" },
    { x: 322, y: 95,  w: 60, h: 38, label: "LEDGER" },
    { x: 172, y: 18,  w: 72, h: 32, label: "IDENTITY" },
    { x: 172, y: 178, w: 72, h: 32, label: "AUDIT" },
  ];
  const wires = [
    { d: "M94,114 L122,114",  delay: 0.85 },
    { d: "M194,114 L222,114", delay: 1.0  },
    { d: "M294,114 L322,114", delay: 1.15 },
    { d: "M208,50 L256,95",   delay: 1.3  },
    { d: "M256,133 L208,178", delay: 1.45 },
  ];
  return (
    <svg viewBox="0 0 400 225" className="absolute inset-0 w-full h-full">
      <defs>
        <pattern id="aGrid2" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
          <path d="M18 0 L0 0 0 18" fill="none" stroke="rgba(122,216,210,0.055)" strokeWidth="0.5" />
        </pattern>
        <marker id="arrow2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={D_TEAL} />
        </marker>
      </defs>
      <rect width="400" height="225" fill="url(#aGrid2)" />

      {boxes.map((b, i) => (
        <g
          key={i}
          className="viz-pop"
          style={{ animationDelay: `${0.2 + i * 0.1}s`, transformOrigin: `${b.x + b.w/2}px ${b.y + b.h/2}px` }}
        >
          <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="rgba(72,184,177,0.08)" stroke={D_TEAL} strokeWidth={1} />
          <text x={b.x + b.w/2} y={b.y + b.h/2 + 3} textAnchor="middle" fill="white" fontSize="8" fontFamily="ui-monospace, monospace" letterSpacing="0.18em">
            {b.label}
          </text>
        </g>
      ))}
      {wires.map((w, i) => (
        <path
          key={i}
          d={w.d}
          stroke={D_TEAL} strokeWidth={1.2} fill="none"
          markerEnd="url(#arrow2)"
          className="viz-draw"
          style={{ ["--dash" as never]: 100, animationDelay: `${w.delay}s` }}
        />
      ))}
    </svg>
  );
}

// Build — commit log streaming in, compile bar fills, "PASS" badge on the right.
const BUILD_COMMITS = [
  { hash: "7f2a091", msg: "feat: settlement service" },
  { hash: "a14de6c", msg: "audit: chain trail" },
  { hash: "be0d2f1", msg: "harden: idp boundary" },
  { hash: "c39ab50", msg: "test: red-team batch" },
];
function BuildDiagram() {
  const [shown, setShown] = useState(0);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const timers: number[] = [];
    BUILD_COMMITS.forEach((_, i) => {
      timers.push(window.setTimeout(() => setShown((n) => Math.max(n, i + 1)), 260 + i * 260));
    });
    const start = 260 + BUILD_COMMITS.length * 260 + 80;
    const steps = 24;
    for (let s = 0; s <= steps; s++) {
      timers.push(window.setTimeout(() => setProgress(s / steps), start + s * 26));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  const passed = progress >= 0.999;
  return (
    <div className="absolute inset-0 px-4 py-3 text-[10px]" style={{ fontFamily: "ui-monospace, monospace" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-white/40 text-[8.5px] tracking-[0.22em] uppercase">main · 4 commits</span>
        <span className="flex items-center gap-1.5 text-white/45 text-[8.5px] tracking-[0.18em] uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-teal-bright)] viz-pulse" /> .net 8
        </span>
      </div>
      <div className="relative pl-3 border-l border-white/15 space-y-1.5">
        {BUILD_COMMITS.map((c, i) => {
          const visible = i < shown;
          return (
            <div
              key={c.hash}
              className="flex items-center gap-2 transition-all duration-300"
              style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(4px)" }}
            >
              <span className="absolute -left-[3.5px] w-1.5 h-1.5 rounded-full bg-[var(--brand-teal-bright)]" style={{ marginTop: i * 16 }} />
              <span className="text-[var(--brand-teal-bright)]">{c.hash}</span>
              <span className="text-white/70 truncate">{c.msg}</span>
              {visible && <span className="ml-auto text-[var(--signal-ok)] text-[9px]">✓</span>}
            </div>
          );
        })}
      </div>
      <div className="absolute left-4 right-4 bottom-3">
        <div className="flex items-center justify-between text-[8.5px] tracking-[0.22em] uppercase">
          <span className="text-white/40">{passed ? "build passed" : "compiling"}</span>
          <span className={passed ? "text-[var(--signal-ok)]" : "text-white/55"}>{Math.round(progress * 100)}%</span>
        </div>
        <div className="mt-1 h-[3px] bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full"
            style={{
              width: `${progress * 100}%`,
              background: passed ? "var(--signal-ok)" : "var(--brand-teal-bright)",
              transition: "width 60ms linear",
              boxShadow: "0 0 8px var(--brand-teal-bright)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Operate — heartbeat sparkline draws across, status pills pulse below.
function OperateDiagram() {
  const W = 380, H = 140;
  const samples = 48;
  const points: number[] = [];
  let s = 0x7a91 >>> 0;
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    const base = 60 + Math.sin(t * Math.PI * 1.5) * 18;
    const wave = Math.sin(t * Math.PI * 7) * 8;
    const noise = (rand() - 0.5) * 6;
    points.push(base + wave + noise);
  }
  const minV = Math.min(...points) - 4;
  const maxV = Math.max(...points) + 4;
  const PAD_L = 26, PAD_R = 10, PAD_T = 14, PAD_B = 28;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const xAt = (i: number) => PAD_L + (i / (samples - 1)) * innerW;
  const yAt = (v: number) => PAD_T + (1 - (v - minV) / (maxV - minV)) * innerH;
  const linePath = "M " + points.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" L ");
  const areaPath = `${linePath} L ${xAt(samples - 1).toFixed(1)},${(PAD_T + innerH).toFixed(1)} L ${xAt(0).toFixed(1)},${(PAD_T + innerH).toFixed(1)} Z`;
  const services = ["api", "oracle", "queue", "idp"];

  return (
    <div className="absolute inset-0 px-3 py-2.5" style={{ fontFamily: "ui-monospace, monospace" }}>
      <div className="flex items-center justify-between mb-1 text-[8.5px] tracking-[0.22em] uppercase">
        <span className="text-white/45">throughput · last 60m</span>
        <span className="text-[var(--brand-teal-bright)] viz-fade" style={{ animationDelay: "0.2s" }}>uptime 99.99%</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[70%]" preserveAspectRatio="none">
        <defs>
          <linearGradient id="opsAreaMini" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={D_TEAL} stopOpacity="0.32" />
            <stop offset="100%" stopColor={D_TEAL} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((t) => (
          <line key={t} x1={PAD_L} y1={PAD_T + t * innerH} x2={W - PAD_R} y2={PAD_T + t * innerH} stroke="rgba(255,255,255,0.06)" />
        ))}
        <path d={areaPath} fill="url(#opsAreaMini)" className="viz-fade" style={{ animationDelay: "0.5s" }} />
        <path
          d={linePath}
          stroke={D_TEAL} strokeWidth={1.3} fill="none"
          className="viz-chart-draw"
          style={{ animationDelay: "0.2s" }}
        />
        <circle
          cx={xAt(samples - 1)}
          cy={yAt(points[points.length - 1])}
          r={2.6}
          fill={D_TEAL}
          style={{ filter: "drop-shadow(0 0 4px var(--brand-teal-bright))" }}
        />
        <text x={PAD_L - 4} y={yAt(maxV) + 9} textAnchor="end" fontSize="7" fill={D_DIM}>{Math.round(maxV)}</text>
        <text x={PAD_L - 4} y={yAt(minV) + 3} textAnchor="end" fontSize="7" fill={D_DIM}>{Math.round(minV)}</text>
        <text x={PAD_L} y={H - 10} fontSize="7" fill={D_DIM}>-60m</text>
        <text x={W - PAD_R} y={H - 10} textAnchor="end" fontSize="7" fill={D_DIM}>now</text>
      </svg>
      <div className="absolute left-3 right-3 bottom-2 flex items-center gap-3 text-[9px]">
        {services.map((sv, i) => (
          <span
            key={sv}
            className="viz-fade flex items-center gap-1.5 text-white/65"
            style={{ animationDelay: `${0.6 + i * 0.1}s` }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-teal-bright)] viz-pulse" style={{ animationDelay: `${i * 0.18}s` }} />
            {sv}
          </span>
        ))}
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
