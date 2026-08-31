"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { maskReveal } from "@/lib/maskReveal";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { TECH_LOGOS } from "@/components/TechLogos";
import type { Dict } from "@/lib/dictionaries";

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin, DrawSVGPlugin, useGSAP);

// ── Topology layout ─────────────────────────────────────────────────
// Three node groups the live-layer cycle rotates through:
//   0 (data)        → database cluster   (bottom)
//   1 (application) → servers + operator workstations (middle/top)
//   2 (security)    → the enclosing perimeter
// Coordinates are in the SVG's 600×560 viewBox.
type Pt = { x: number; y: number };

const ENDPOINTS: Pt[] = [
  { x: 110, y: 84 },
  { x: 300, y: 70 },
  { x: 490, y: 84 },
];
const SERVERS: Pt[] = [
  { x: 206, y: 270 },
  { x: 394, y: 270 },
];
const DBS: Pt[] = [
  { x: 150, y: 462 },
  { x: 300, y: 474 },
  { x: 450, y: 462 },
];

// Each link carries a stream of packets. dir 1 = data flowing down toward
// storage (a query/write), dir -1 = a result/alert surfacing back up.
type Link = { a: Pt; b: Pt; dir: 1 | -1 };
const LINKS: Link[] = [
  { a: ENDPOINTS[0], b: SERVERS[0], dir: 1 },
  { a: ENDPOINTS[1], b: SERVERS[0], dir: -1 },
  { a: ENDPOINTS[1], b: SERVERS[1], dir: 1 },
  { a: ENDPOINTS[2], b: SERVERS[1], dir: -1 },
  { a: SERVERS[0], b: DBS[0], dir: 1 },
  { a: SERVERS[0], b: DBS[1], dir: -1 },
  { a: SERVERS[1], b: DBS[1], dir: 1 },
  { a: SERVERS[1], b: DBS[2], dir: 1 },
];

// Smooth vertical S-curve between two nodes.
function linkPath(a: Pt, b: Pt) {
  const my = (a.y + b.y) / 2;
  return `M${a.x},${a.y} C${a.x},${my} ${b.x},${my} ${b.x},${b.y}`;
}

// Two packets per link, offset half a cycle apart → a steady stream.
const PACKETS = LINKS.flatMap((link, li) => [
  { li, link, phase: 0 },
  { li, link, phase: 0.5 },
]);

const CYCLE_MS = 2600;
const TEAL = "rgba(122,216,210,0.55)";
const TEAL_FILL = "rgba(122,216,210,0.06)";
const RED = "var(--brand-red)";

export default function Technology({ dict }: { dict: Dict }) {
  const tech = dict.technology;
  const groups = tech.groups;
  const rotate = tech.rotate;
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [tick, setTick] = useState(0);

  // Cycle the live layer, but only while on-screen and in motion.
  useEffect(() => {
    if (reducedMotion) return;
    const el = ref.current;
    let visible = false;
    const io = el
      ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, {
          rootMargin: "0px 0px -20% 0px",
        })
      : null;
    if (el && io) io.observe(el);
    const id = window.setInterval(() => {
      if (visible) setTick((v) => v + 1);
    }, CYCLE_MS);
    return () => {
      window.clearInterval(id);
      io?.disconnect();
    };
  }, [reducedMotion]);

  useGSAP(
    () => {
      const links = gsap.utils.toArray<SVGPathElement>(".tech-link");
      const nodes = gsap.utils.toArray<SVGGElement>(".tech-node");
      const packets = gsap.utils.toArray<SVGCircleElement>(".tech-packet");

      if (reducedMotion) {
        gsap.set(links, { drawSVG: "100%" });
        gsap.set(nodes, { opacity: 1, scale: 1 });
        gsap.set(packets, { opacity: 0 });
        return;
      }

      maskReveal(".tech-h2");

      // Links wire themselves in, then nodes pop on, then packets stream.
      gsap.set(links, { drawSVG: "0%" });
      gsap.set(nodes, { opacity: 0, transformOrigin: "center", scale: 0.5 });
      gsap.set(packets, { opacity: 0 });

      const tl = gsap.timeline({
        scrollTrigger: { trigger: ".tech-scene", start: "top 78%" },
      });
      tl.to(links, { drawSVG: "100%", duration: 0.9, stagger: 0.06, ease: "power2.out" })
        .to(
          nodes,
          { opacity: 1, scale: 1, duration: 0.55, stagger: 0.05, ease: "back.out(1.7)" },
          "-=0.5"
        );

      // Flowing data packets riding each connection.
      packets.forEach((packet, idx) => {
        const meta = PACKETS[idx];
        const path = links[meta.li];
        if (!path) return;
        const down = meta.link.dir === 1;
        const dur = 2 + (idx % 3) * 0.5;
        gsap.set(packet, { opacity: 0 });
        const tw = gsap.to(packet, {
          duration: dur,
          ease: "none",
          repeat: -1,
          delay: meta.phase * dur,
          motionPath: {
            path,
            align: path,
            alignOrigin: [0.5, 0.5],
            start: down ? 0 : 1,
            end: down ? 1 : 0,
          },
          // Fade in off the source, fade out into the target.
          onUpdate: () => {
            packet.style.opacity = String(Math.sin(tw.progress() * Math.PI));
          },
        });
      });
    },
    { scope: ref, dependencies: [reducedMotion] }
  );

  const active = rotate[tick % rotate.length];

  // tick → which node group is "live". Endpoints + servers are the
  // application layer; databases the data layer; the perimeter security.
  const dbLive = tick % 3 === 0 || reducedMotion;
  const appLive = tick % 3 === 1 || reducedMotion;
  const secLive = tick % 3 === 2 || reducedMotion;

  const glow = (on: boolean) =>
    on ? "drop-shadow(0 0 9px rgba(214,59,59,0.55))" : "none";

  return (
    <section
      id="technology"
      ref={ref}
      className="relative bg-[var(--bg-inset)] text-white py-28 lg:py-40 overflow-hidden"
    >
      <div className="relative mx-auto max-w-[1280px] px-6 lg:px-10">
        {/* Heading */}
        <div className="max-w-2xl">
          <div className="text-[11px] font-medium tracking-[0.25em] uppercase text-[var(--brand-teal-bright)]">
            {tech.eyebrow}
          </div>
          <h2 className="tech-h2 mask-reveal mt-5 text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.05] tracking-[-0.02em] font-medium">
            {tech.title}
          </h2>
          <div className="mt-5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-[clamp(1.05rem,2.2vw,1.55rem)] tracking-[-0.01em]">
            <span className="text-white/60">{tech.builtOn}</span>
            <span className="relative inline-flex overflow-hidden">
              <span
                key={reducedMotion ? "static" : tick}
                className={`inline-block font-medium text-[var(--brand-red)] ${reducedMotion ? "" : "tech-word"}`}
              >
                {active.word}.
              </span>
            </span>
          </div>
          <p
            key={reducedMotion ? "static-desc" : `desc-${tick}`}
            className={`mt-6 max-sm:hidden text-white/65 leading-relaxed max-w-md text-[15.5px] min-h-[3.25em] ${reducedMotion ? "" : "tech-word"}`}
          >
            {active.desc}
          </p>
        </div>

        {/* Technology register — the concrete stack carries the section now;
            the former animated network dashboard is intentionally omitted. */}
        <div className="mt-16 lg:mt-20 grid gap-8 lg:gap-10 lg:grid-cols-1 lg:max-w-5xl">
          <svg
            viewBox="0 0 600 560"
            className="tech-scene hidden"
            role="img"
            aria-label={tech.title}
          >
            <defs>
              <linearGradient id="tech-screen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="rgba(122,216,210,0.28)" />
                <stop offset="1" stopColor="rgba(122,216,210,0.04)" />
              </linearGradient>
            </defs>

            {/* Security perimeter — a flowing dashed envelope around the estate */}
            <rect
              className="tech-perimeter"
              x={34}
              y={30}
              width={532}
              height={500}
              rx={26}
              fill={secLive ? "rgba(214,59,59,0.035)" : "transparent"}
              stroke={secLive ? RED : "rgba(122,216,210,0.4)"}
              strokeWidth={1.4}
              strokeDasharray="3 9"
              style={{
                animation: reducedMotion ? "none" : "roadFlow 3.2s linear infinite",
                filter: glow(secLive),
                transition: "stroke 0.5s ease, fill 0.5s ease, filter 0.5s ease",
              }}
            />
            <text
              x={300}
              y={22}
              textAnchor="middle"
              className="mono"
              fontSize={10}
              letterSpacing={3}
              fill={secLive ? RED : "rgba(122,216,210,0.7)"}
              style={{ transition: "fill 0.5s ease" }}
            >
              {tech.perimeterLabel}
            </text>

            {/* Connections (drawn before nodes so nodes sit on top) */}
            {LINKS.map((l, i) => (
              <path
                key={i}
                className="tech-link"
                d={linkPath(l.a, l.b)}
                fill="none"
                stroke="rgba(122,216,210,0.28)"
                strokeWidth={1.2}
              />
            ))}

            {/* ── Database cluster (tier 0 · Core Platform) ── */}
            {DBS.map((d, i) => (
              <Database key={`db${i}`} p={d} active={dbLive} pulse={dbLive && !reducedMotion} />
            ))}

            {/* ── Application servers (tier 1) ── */}
            {SERVERS.map((s, i) => (
              <Server key={`s${i}`} p={s} active={appLive} pulse={appLive && !reducedMotion} />
            ))}

            {/* ── Operator workstations (tier 1) ── */}
            {ENDPOINTS.map((e, i) => (
              <Workstation key={`e${i}`} p={e} active={appLive} />
            ))}

            {/* Flowing packets */}
            {PACKETS.map((pk, i) => (
              <circle
                key={i}
                className="tech-packet"
                r={3.4}
                fill={pk.link.dir === 1 ? "var(--brand-teal-soft)" : RED}
                style={{
                  filter:
                    pk.link.dir === 1
                      ? "drop-shadow(0 0 5px rgba(122,216,210,0.9))"
                      : "drop-shadow(0 0 6px rgba(214,59,59,0.9))",
                }}
              />
            ))}
          </svg>

          {/* Technology groups — Core / Supporting */}
          <div className="flex flex-col gap-5">
            {groups.map((group, gi) => (
              <div
                key={gi}
                className="relative rounded-2xl border border-white/[0.08] bg-white/[0.015] p-6 lg:p-7"
              >
                <div>
                  <h3 className="text-white font-medium text-[clamp(1.1rem,1.9vw,1.4rem)] leading-tight tracking-[-0.01em]">
                    {group.label}
                  </h3>
                  <p className="mt-3 text-white/60 text-[14px] leading-relaxed max-w-lg">
                    {group.intro}
                  </p>
                </div>

                <div
                  className={`mt-6 grid gap-x-6 gap-y-5 ${
                    group.items.length > 3 ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-3"
                  }`}
                >
                  {group.items.map((item) => (
                    <div key={item.name} className="min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="flex-none inline-flex items-center justify-center h-10 w-10 rounded-full border border-[rgba(122,216,210,0.4)] text-[var(--brand-teal-soft)]">
                          <TechIcon icon={item.icon} />
                        </span>
                        <span className="text-white font-medium text-[15px] leading-snug">
                          {item.name}
                        </span>
                      </div>
                      <p className="mt-2.5 text-white/50 text-[13px] leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Brand logo per technology, keyed by the dict `icon` field.
function TechIcon({ icon }: { icon: string }) {
  const Logo = TECH_LOGOS[icon];
  return Logo ? (
    <Logo />
  ) : (
    <span className="mono text-[8.5px] tracking-[0.08em] leading-none">
      {icon.toUpperCase().slice(0, 4)}
    </span>
  );
}

// ── Node icons ───────────────────────────────────────────────────────
// All share the .tech-node class so GSAP can stagger them in.

function nodeStroke(active: boolean) {
  return active ? RED : TEAL;
}
function nodeFill(active: boolean) {
  return active ? "rgba(214,59,59,0.10)" : TEAL_FILL;
}
function nodeGlow(active: boolean) {
  return active ? "drop-shadow(0 0 8px rgba(214,59,59,0.5))" : "none";
}
const nodeTransition = "stroke 0.5s ease, fill 0.5s ease, filter 0.5s ease";

function Database({ p, active, pulse }: { p: Pt; active: boolean; pulse: boolean }) {
  const rx = 26;
  const ry = 8.5;
  const top = p.y - 28;
  const bot = p.y + 24;
  const stroke = nodeStroke(active);
  const fill = nodeFill(active);
  const body = `M${p.x - rx},${top} L${p.x - rx},${bot} A${rx},${ry} 0 0 0 ${p.x + rx},${bot} L${p.x + rx},${top}`;
  return (
    <g className="tech-node" style={{ filter: nodeGlow(active), transition: nodeTransition }}>
      <path d={body} fill={fill} stroke={stroke} strokeWidth={1.5} style={{ transition: nodeTransition }} />
      {/* storage bands */}
      <ellipse cx={p.x} cy={top + 18} rx={rx} ry={ry} fill="none" stroke={stroke} strokeWidth={1} opacity={0.55} style={{ transition: nodeTransition }} />
      <ellipse cx={p.x} cy={top + 36} rx={rx} ry={ry} fill="none" stroke={stroke} strokeWidth={1} opacity={0.45} style={{ transition: nodeTransition }} />
      {/* lid */}
      <ellipse cx={p.x} cy={top} rx={rx} ry={ry} fill={active ? "rgba(214,59,59,0.16)" : "rgba(122,216,210,0.12)"} stroke={stroke} strokeWidth={1.5} style={{ transition: nodeTransition }} />
      <circle cx={p.x} cy={top} r={3.5} fill={active ? RED : "rgba(122,216,210,0.85)"} className={pulse ? "viz-pulse" : ""} style={{ transition: "fill 0.5s ease" }} />
    </g>
  );
}

function Server({ p, active, pulse }: { p: Pt; active: boolean; pulse: boolean }) {
  const w = 62;
  const h = 70;
  const x = p.x - w / 2;
  const y = p.y - h / 2;
  const stroke = nodeStroke(active);
  const fill = nodeFill(active);
  return (
    <g className="tech-node" style={{ filter: nodeGlow(active), transition: nodeTransition }}>
      <rect x={x} y={y} width={w} height={h} rx={6} fill={fill} stroke={stroke} strokeWidth={1.5} style={{ transition: nodeTransition }} />
      {[0, 1, 2].map((k) => {
        const sy = y + 12 + k * 16;
        return (
          <g key={k}>
            <rect x={x + 9} y={sy} width={w - 18} height={9} rx={2} fill={active ? "rgba(214,59,59,0.14)" : "rgba(122,216,210,0.1)"} stroke={stroke} strokeWidth={0.8} opacity={0.85} style={{ transition: nodeTransition }} />
            <circle cx={x + w - 14} cy={sy + 4.5} r={2} fill={active ? RED : "rgba(122,216,210,0.9)"} className={pulse && k === 0 ? "viz-pulse" : ""} style={{ transition: "fill 0.5s ease" }} />
          </g>
        );
      })}
    </g>
  );
}

function Workstation({ p, active }: { p: Pt; active: boolean }) {
  const w = 56;
  const h = 38;
  const x = p.x - w / 2;
  const y = p.y - h / 2 - 6;
  const stroke = nodeStroke(active);
  return (
    <g className="tech-node" style={{ filter: nodeGlow(active), transition: nodeTransition }}>
      <rect x={x} y={y} width={w} height={h} rx={4} fill="url(#tech-screen)" stroke={stroke} strokeWidth={1.5} style={{ transition: nodeTransition }} />
      {/* screen scan lines */}
      <line x1={x + 8} y1={y + 11} x2={x + w - 18} y2={y + 11} stroke={stroke} strokeWidth={1.4} opacity={0.7} style={{ transition: nodeTransition }} />
      <line x1={x + 8} y1={y + 19} x2={x + w - 10} y2={y + 19} stroke={stroke} strokeWidth={1.4} opacity={0.45} style={{ transition: nodeTransition }} />
      <line x1={x + 8} y1={y + 27} x2={x + w - 22} y2={y + 27} stroke={stroke} strokeWidth={1.4} opacity={0.45} style={{ transition: nodeTransition }} />
      {/* stand */}
      <rect x={p.x - 5} y={y + h} width={10} height={8} fill={nodeFill(active)} stroke={stroke} strokeWidth={1} style={{ transition: nodeTransition }} />
      <rect x={p.x - 14} y={y + h + 8} width={28} height={3.5} rx={1.75} fill={stroke} style={{ transition: nodeTransition }} />
    </g>
  );
}
