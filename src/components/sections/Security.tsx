"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { maskReveal } from "@/lib/maskReveal";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { Dict } from "@/lib/dictionaries";

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, useGSAP);

export default function Security({ dict }: { dict: Dict }) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reducedMotion) {
        gsap.set(".sec-link", { drawSVG: "100%", opacity: 1 });
        gsap.set([".sec-sat", ".sec-core", ".sec-orbit", ".ps-dot", ".ps-ghost", ".sec-logo-solid"], { opacity: 1, scale: 1 });
        gsap.set(".ps-mark", { opacity: 0 }); // settled state: solid logo, no particle mark
        return;
      }

      maskReveal(".sec-h2");

      gsap.fromTo(
        ".sec-card",
        { clipPath: "inset(0 0 100% 0)", opacity: 0, y: 30 },
        {
          clipPath: "inset(0 0 0% 0)",
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: { trigger: ".sec-cards", start: "top 82%" },
        }
      );

      // Entrance — rings fade in (drawSVG would flatten their dash pattern),
      // the shield assembles dot by dot from the top, satellites pop.
      gsap.set(".sec-orbit", { opacity: 0, scale: 0.92, transformOrigin: "50% 50%" });
      gsap.set(".sec-link", { drawSVG: "0%" });
      gsap.set(".sec-sat", { opacity: 0, scale: 0.6, transformOrigin: "50% 50%" });
      gsap.set(".sec-core", { opacity: 0, transformOrigin: "50% 50%" });
      gsap.set(".ps-dot", { opacity: 0, scale: 0, transformOrigin: "50% 50%" });

      const tl = gsap.timeline({
        scrollTrigger: { trigger: ".sec-viz", start: "top 75%" },
      });
      tl.to(".sec-core", { opacity: 1, duration: 0.4, ease: "power2.out" }, 0)
        .to(".sec-orbit", { opacity: 1, scale: 1, duration: 1.1, stagger: 0.15, ease: "power2.out" }, 0.1)
        .to(
          ".ps-dot",
          {
            opacity: 1,
            scale: 1,
            duration: 0.5,
            ease: "back.out(2)",
            // DOM order is row-major top→bottom with the logo dots appended
            // last, so the shield assembles downward and the mark lands last.
            stagger: 0.9 / SHIELD_DOTS.length,
          },
          0.15
        )
        .to(".sec-link", { drawSVG: "100%", duration: 0.7, stagger: 0.08, ease: "power2.out" }, 0.7)
        .to(".sec-sat", { opacity: 1, scale: 1, duration: 0.55, stagger: 0.1, ease: "back.out(1.8)" }, 0.9);

      // The shield breathes as one object.
      gsap.to(".sec-shield", {
        scale: 1.015,
        duration: 3.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        svgOrigin: "280 280",
      });

      // Verification wave — scheduled inside the same scroll-triggered
      // timeline as the entrance, so the first sweep always plays in view.
      // A bright band sweeps down through the particles every WAVE_PERIOD,
      // offset per dot by its height. On the FIRST pass the wave transforms
      // the mark: each logo particle flares as the band reaches it, then
      // dissolves, while the solid lockup wipes in top-down at the exact pace
      // of the band — the wave leaves the real logo behind it. Body dots keep
      // flaring on every subsequent pass (repeating tweens share the period).
      const WAVE_PERIOD = 6;
      const WAVE_TRAVEL = 1.3;
      const WAVE_AT = 1.9; // timeline position of the first sweep's top edge
      const yNorm = (y: number) => (y - SHIELD_Y_MIN) / (SHIELD_Y_MAX - SHIELD_Y_MIN);
      gsap.utils.toArray<SVGCircleElement>(".ps-dot").forEach((el, i) => {
        const d = SHIELD_DOTS[i];
        const at = WAVE_AT + yNorm(d.y) * WAVE_TRAVEL;
        if (d.mark) {
          const flareFill = d.fill === LOGO_RED ? "#e8555a" : "#7ad8d2";
          tl.to(
            el,
            {
              keyframes: [
                { scale: 1.45, fill: flareFill, duration: 0.25, ease: "power2.out" },
                { scale: 1.25, opacity: 0, duration: 0.5, ease: "power2.in" },
              ],
              transformOrigin: "50% 50%",
            },
            at
          );
        } else {
          tl.to(
            el,
            {
              keyframes: [
                { scale: 1.45, fill: "#7ad8d2", duration: 0.25, ease: "power2.out" },
                { scale: 1, fill: `rgba(58,165,160,${d.o})`, duration: 0.7, ease: "power2.inOut" },
              ],
              repeat: -1,
              repeatDelay: WAVE_PERIOD - 0.95,
              transformOrigin: "50% 50%",
            },
            at
          );
        }
      });

      // Solid logo wipes in top-down, tracking the band across the mark's rows.
      const markYs = SHIELD_DOTS.filter((d) => d.mark).map((d) => d.y);
      const tTop = WAVE_AT + yNorm(Math.min(...markYs)) * WAVE_TRAVEL;
      const tBottom = WAVE_AT + yNorm(Math.max(...markYs)) * WAVE_TRAVEL;
      tl.fromTo(
        ".sec-logo-solid",
        { opacity: 1, clipPath: "inset(0% 0% 100% 0%)" },
        { clipPath: "inset(0% 0% 0% 0%)", duration: tBottom - tTop + 0.3, ease: "none", immediateRender: false },
        tTop + 0.15
      );
      // Once the logo has resolved, the carved channel refills at body density
      // so the mark doesn't sit in a cut-out hole in the dot grid.
      tl.to(".ps-ghost", { opacity: 1, duration: 0.8, ease: "power2.out", stagger: 0.012 }, tBottom + 0.4);

      // Badges glint once per wave, just after it clears the shield; the solid
      // logo swells with them. (Link lines stay quiet — the badge lift alone
      // carries the beat.)
      const glint = gsap.timeline({ repeat: -1 });
      glint
        .to(".sec-logo-solid", { scale: 1.04, duration: 0.4, ease: "power2.out", yoyo: true, repeat: 1, transformOrigin: "50% 50%" }, 0)
        .to(".sec-sat", { scale: 1.06, duration: 0.4, ease: "power2.out", yoyo: true, repeat: 1, transformOrigin: "50% 50%" }, 0)
        .to(".sec-sat-halo", { attr: { stroke: "rgba(58,165,160,0.55)" }, duration: 0.4, yoyo: true, repeat: 1 }, 0)
        .to({}, { duration: WAVE_PERIOD - 0.8 });
      tl.add(glint, WAVE_AT + WAVE_TRAVEL);
    },
    { scope: ref, dependencies: [reducedMotion] }
  );

  return (
    <section id="security" ref={ref} className="relative py-28 lg:py-36 bg-[var(--bg-elev)] border-t hairline overflow-hidden">
      <div className="relative z-10 mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5">
            <div className="text-[11px] font-medium tracking-[0.25em] uppercase text-[var(--brand-teal)]">
              {dict.security.eyebrow}
            </div>
            <h2 className="sec-h2 mask-reveal mt-5 text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.05] tracking-[-0.02em] font-medium">
              {dict.security.title}
            </h2>
            <p className="mt-6 max-sm:hidden text-[var(--fg-dim)] leading-relaxed max-w-md text-[15.5px]">
              {dict.security.body}
            </p>
          </div>

          {/* Orbital standards diagram — satellites circle the certified core. */}
          <div className="sec-viz hidden lg:col-span-7 relative lg:block">
            <OrbitalDiagram />
          </div>
        </div>

        <div className="sec-cards grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-16">
          {dict.security.cards.map((c) => (
            <div
              key={c.id}
              className="sec-card group relative rounded-2xl border border-black/[0.08] bg-white p-6 shadow-[0_1px_2px_rgba(10,14,22,0.04)] hover:border-[rgba(58,165,160,0.45)] transition-colors duration-300"
            >
              <div className="flex items-start gap-4">
                <CardBadge id={c.id} />
                <div className="min-w-0">
                  <div className="mono text-[12px] tracking-[0.18em] uppercase text-[var(--brand-teal)]">
                    {c.name}
                  </div>
                  <p className="mt-2 text-[var(--fg-dim)] leading-relaxed text-[13.5px]">{c.desc}</p>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-black/[0.07] flex items-center gap-2.5">
                <svg width="17" height="17" viewBox="0 0 17 17" aria-hidden>
                  <circle cx="8.5" cy="8.5" r="8.5" fill="var(--brand-teal)" />
                  <path
                    d="M5.2 8.7l2.2 2.2 4.2-4.7"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="mono text-[10.5px] tracking-[0.22em] uppercase text-[var(--fg-dim)]">
                  {c.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* Card badges                                                       */
/* ---------------------------------------------------------------- */

function CardBadge({ id }: { id: string }) {
  return (
    <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full border border-black/[0.06] bg-[var(--bg)]">
      {id === "bitdefender" ? (
        <svg width="24" height="26" viewBox="0 0 24 26" aria-hidden>
          <path
            d="M12 1l10 3.6v7.6c0 6.2-4.1 10.4-10 12.8C6.1 22.6 2 18.4 2 12.2V4.6L12 1z"
            fill="var(--brand-teal)"
          />
          <path
            d="M9 7h4.1c2 0 3.4 1.1 3.4 2.9 0 1.1-.6 2-1.5 2.4 1.2.4 2 1.4 2 2.7 0 2-1.5 3-3.6 3H9V7zm4 4.5c.8 0 1.4-.5 1.4-1.2S13.8 9 13 9h-1.9v2.5H13zm.3 4.5c.9 0 1.5-.5 1.5-1.3s-.6-1.3-1.5-1.3h-2.2V16h2.2z"
            fill="#ffffff"
          />
        </svg>
      ) : (
        <div className="text-center leading-none">
          <div className="font-semibold text-[13px] tracking-[0.02em] text-[var(--fg)]">ISO</div>
          <div className="mono mt-1 text-[8px] tracking-[0.06em] text-[var(--fg-dim)]">
            {id.replace("iso", "")}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Orbital diagram                                                   */
/* ---------------------------------------------------------------- */

const ORBIT_R = 178;

/* ---------------------------------------------------------------- */
/* Particle shield — the shield silhouette rendered as a dot matrix. */
/* All positions are deterministic (no Math.random), so server and   */
/* client render identical markup.                                   */
/* ---------------------------------------------------------------- */

// Half-width of the shield silhouette at local height y. Shape matches the old
// line drawing: peak (0,-52) → shoulders (±38,-38) → straight sides to y=-10 →
// bottom cubic (±38,-10)(±38,15)(±22,30)(0,41).
function shieldHalfWidth(y: number): number {
  if (y < -52 || y > 41) return -1;
  if (y <= -38) return (38 * (y + 52)) / 14;
  if (y <= -10) return 38;
  let best = 0;
  for (let t = 0; t <= 1; t += 0.01) {
    const mt = 1 - t;
    const by = mt * mt * mt * -10 + 3 * mt * mt * t * 15 + 3 * mt * t * t * 30 + t * t * t * 41;
    if (Math.abs(by - y) < 2.5) {
      const bx = mt * mt * mt * 38 + 3 * mt * mt * t * 38 + 3 * mt * t * t * 22;
      best = Math.max(best, bx);
    }
  }
  return best;
}

// 2.0 keeps the peak just inside the badge link lines (inner end at r=104).
const SHIELD_SCALE = 2.0;
// Infostream logo mark — geometry and colors measured pixel-exact from
// public/infostream-logo.webp (301×49): four teal bars plus the red "i" stem,
// source rects [x0..x1, y0..y1] below, and the "i"'s teal dot on top
// (x 52–57, y 2–7). Teal rgb(58,147,154), red rgb(208,31,37), both sampled
// from the file. Each rect becomes two dot columns pinned to its real edges —
// preserving true bar widths — scaled uniformly into shield-local units
// around the shield's optical center.
const LOGO_TEAL = "#3a939a";
const LOGO_RED = "#d01f25";
const LOGO_SRC_BARS: [number, number, number, number, string][] = [
  [0, 6, 10, 36, LOGO_TEAL],
  [13, 19, 0, 47, LOGO_TEAL],
  [26, 32, 10, 36, LOGO_TEAL],
  [39, 45, 0, 47, LOGO_TEAL],
  [52, 57, 10, 36, LOGO_RED], // the letter "i" stem
];
const LOGO_SCALE = 0.85; // source px → shield-local units
const LOGO_STEP = 3.4; // dot pitch in source px
const LOGO_SRC_CX = 28.5; // mark bounding-box center in source px
const LOGO_SRC_CY = 23.5;
const LOGO_CY = -3; // optical center of the shield interior
const LOGO_DOTS = [
  ...LOGO_SRC_BARS.flatMap(([x0, x1, y0, y1, fill]) => {
    const cols = [x0 + 1.75, x1 - 1.75];
    const span = y1 - y0 - 3;
    const rows = Math.round(span / LOGO_STEP);
    return cols.flatMap((x) =>
      Array.from({ length: rows + 1 }, (_, j) => ({
        x: (x - LOGO_SRC_CX) * LOGO_SCALE,
        y: (y0 + 1.5 + (span * j) / rows - LOGO_SRC_CY) * LOGO_SCALE + LOGO_CY,
        fill,
        big: false,
      }))
    );
  }),
  // The "i"'s teal dot (6×6 at x 52–57, y 2–7) — one larger particle.
  {
    x: (54.5 - LOGO_SRC_CX) * LOGO_SCALE,
    y: (4.5 - LOGO_SRC_CY) * LOGO_SCALE + LOGO_CY,
    fill: LOGO_TEAL,
    big: true,
  },
];

// Body dots — grid sampling inside the silhouette, skipping a channel around
// the logo bars so the mark stays legible; edge dots slightly brighter for
// contour.
const SHIELD_FIELD = (() => {
  const dots: { x: number; y: number; r: number; o: number; mark: boolean; fill?: string }[] = [];
  // Grid points carved out for the logo channel — they fade back in faintly
  // after the solid logo reveals, so the mark doesn't sit in a cut-out hole.
  const ghosts: { x: number; y: number }[] = [];
  for (let y = -50; y <= 40; y += 6) {
    const hw = shieldHalfWidth(y);
    if (hw < 1) continue;
    for (let x = -Math.floor(hw / 6) * 6; x <= hw; x += 6) {
      if (Math.abs(x) > hw) continue;
      if (LOGO_DOTS.some((c) => Math.hypot(c.x - x, c.y - y) < 5.5)) {
        ghosts.push({ x, y });
        continue;
      }
      const edge = Math.abs(x) > hw - 6 || y < -44 || y > 34;
      dots.push({ x, y, r: edge ? 2.2 : 1.9, o: edge ? 0.75 : 0.4, mark: false });
    }
  }
  // Denser pitch than the body grid — smaller radius keeps a dotted texture.
  for (const c of LOGO_DOTS)
    dots.push({ x: c.x, y: c.y, fill: c.fill, r: c.big ? 3.2 : 2.4, o: 1, mark: true });
  const toScreen = <T extends { x: number; y: number }>(d: T) => ({
    ...d,
    x: 280 + d.x * SHIELD_SCALE,
    y: 280 + d.y * SHIELD_SCALE,
  });
  return { dots: dots.map(toScreen), ghosts: ghosts.map(toScreen) };
})();
const SHIELD_DOTS = SHIELD_FIELD.dots;
const GHOST_DOTS = SHIELD_FIELD.ghosts;

const SHIELD_Y_MIN = Math.min(...SHIELD_DOTS.map((d) => d.y));
const SHIELD_Y_MAX = Math.max(...SHIELD_DOTS.map((d) => d.y));
const SATS: { angle: number; icon: React.JSX.Element }[] = [
  {
    // Award — quality
    angle: -90,
    icon: (
      <>
        <circle cx="0" cy="-4" r="7" />
        <path d="M-4 2 L-6.5 12 L0 8.2 L6.5 12 L4 2" strokeLinejoin="round" />
      </>
    ),
  },
  {
    // Lock — security
    angle: 0,
    icon: (
      <>
        <rect x="-7.5" y="-1.5" width="15" height="12" rx="2" />
        <path d="M-4.5 -1.5 v-3.5 a4.5 4.5 0 0 1 9 0 v3.5" />
        <circle cx="0" cy="4" r="1.6" />
      </>
    ),
  },
  {
    // People — accountability
    angle: 90,
    icon: (
      <>
        <circle cx="-3" cy="-4" r="3.6" />
        <path d="M-9.5 9 a6.5 6.5 0 0 1 13 0" />
        <path d="M4.5 -8.2 a3.4 3.4 0 0 1 0 7" />
        <path d="M6.5 3.2 a6.2 6.2 0 0 1 3.6 5.8" />
      </>
    ),
  },
  {
    // Checklist — audited process
    angle: 180,
    icon: (
      <>
        <rect x="-7.5" y="-9" width="15" height="19" rx="2" />
        <rect x="-3.5" y="-11" width="7" height="4" rx="1.2" />
        <path d="M-3.5 -1 l2.3 2.3 4.3-4.8" />
        <path d="M-3.5 6 h7" />
      </>
    ),
  },
];

function OrbitalDiagram() {
  return (
    <svg
      viewBox="0 0 560 560"
      className="mx-auto w-full max-w-[520px] h-auto"
      role="img"
      aria-label="Certified standards linked to a protected core"
    >
      {/* Dashed orbit rings */}
      <circle className="sec-orbit" cx="280" cy="280" r={ORBIT_R} fill="none" stroke="rgba(58,165,160,0.35)" strokeWidth="1" strokeDasharray="3 7" />
      <circle className="sec-orbit" cx="280" cy="280" r={ORBIT_R - 42} fill="none" stroke="rgba(58,165,160,0.16)" strokeWidth="1" strokeDasharray="2 9" />

      {/* Satellite layer */}
      <g className="sec-orbit-group">
        {SATS.map(({ angle, icon }, i) => {
          const rad = (angle * Math.PI) / 180;
          const x = 280 + ORBIT_R * Math.cos(rad);
          const y = 280 + ORBIT_R * Math.sin(rad);
          const ix = 280 + 104 * Math.cos(rad);
          const iy = 280 + 104 * Math.sin(rad);
          const ox = 280 + (ORBIT_R - 47) * Math.cos(rad);
          const oy = 280 + (ORBIT_R - 47) * Math.sin(rad);
          return (
            <g key={i}>
              <line className="sec-link" x1={ix} y1={iy} x2={ox} y2={oy} stroke="rgba(58,165,160,0.35)" strokeWidth="1" />
              <g className="sec-sat" transform={`translate(${x} ${y})`}>
                <circle className="sec-sat-halo" r="46" fill="#f2f8f8" stroke="rgba(58,165,160,0.18)" strokeWidth="1" />
                <g fill="none" stroke="var(--brand-teal)" strokeWidth="1.5" strokeLinecap="round">
                  {icon}
                </g>
              </g>
            </g>
          );
        })}
      </g>

      {/* Certified core — the shield itself, built from particles */}
      <g className="sec-core">
        <circle cx="280" cy="280" r="118" fill="rgba(58,165,160,0.05)" stroke="rgba(58,165,160,0.12)" strokeWidth="1" />
        <g className="sec-shield">
          {/* Ghost dots — the carved logo channel, refilled faintly post-reveal */}
          {GHOST_DOTS.map((d, i) => (
            <circle
              key={`g${i}`}
              className="ps-ghost"
              cx={d.x}
              cy={d.y}
              r={1.9}
              fill="rgba(58,165,160,0.28)"
              opacity="0"
            />
          ))}
          {SHIELD_DOTS.map((d, i) => (
            <circle
              key={i}
              className={d.mark ? "ps-dot ps-mark" : "ps-dot"}
              cx={d.x}
              cy={d.y}
              r={d.r}
              fill={d.mark && d.fill ? d.fill : `rgba(58,165,160,${d.o})`}
            />
          ))}
          {/* The real logo mark — capsule bars at the measured rects; the
              particle mark dissolves into this after the shield assembles. */}
          <g className="sec-logo-solid" opacity="0">
            {LOGO_SRC_BARS.map(([x0, x1, y0, y1, fill], i) => {
              const w = (x1 - x0 + 1) * LOGO_SCALE * SHIELD_SCALE;
              const h = (y1 - y0 + 1) * LOGO_SCALE * SHIELD_SCALE;
              return (
                <rect
                  key={i}
                  x={280 + (x0 - LOGO_SRC_CX) * LOGO_SCALE * SHIELD_SCALE}
                  y={280 + ((y0 - LOGO_SRC_CY) * LOGO_SCALE + LOGO_CY) * SHIELD_SCALE}
                  width={w}
                  height={h}
                  rx={w / 2}
                  fill={fill}
                />
              );
            })}
            <circle
              cx={280 + (55 - LOGO_SRC_CX) * LOGO_SCALE * SHIELD_SCALE}
              cy={280 + ((5 - LOGO_SRC_CY) * LOGO_SCALE + LOGO_CY) * SHIELD_SCALE}
              r={3 * LOGO_SCALE * SHIELD_SCALE}
              fill={LOGO_TEAL}
            />
          </g>
        </g>
      </g>
    </svg>
  );
}
