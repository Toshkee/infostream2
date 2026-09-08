"use client";

import type { CSSProperties, ReactNode } from "react";
import { seededRng } from "@/lib/rng";

/* ─── Shared presentation helpers for the hero / expertise / process sections ───
   Extracted from the original single-pin PinnedHero when it was split into
   Hero + Expertise + PinnedProcess. Pure presentation — no scroll logic. */

// CSSProperties widened to accept custom properties (--vars).
export type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

// Colours a title's trailing full stop teal — the one accent glyph in the
// headline treatments. Returns the text untouched if it has no closing
// punctuation.
export function tealPeriod(text: string): ReactNode {
  const m = text.match(/^([\s\S]*?)([.!?]+)$/);
  if (!m) return text;
  return (
    <>
      {m[1]}
      <span className="text-[var(--brand-teal-bright)]">{m[2]}</span>
    </>
  );
}

// Pulsing signal bars used in section eyebrows.
export function EyebrowBars() {
  return (
    <span aria-hidden className="flex items-end gap-[3px] h-3">
      <span className="bar-pulse inline-block w-[3px] h-full bg-[var(--brand-teal-bright)]" style={{ animationDelay: "0s" }} />
      <span className="bar-pulse inline-block w-[3px] h-2 bg-[var(--brand-teal-bright)]" style={{ animationDelay: "0.15s" }} />
      <span className="bar-pulse inline-block w-[3px] h-full bg-[var(--brand-teal-bright)]" style={{ animationDelay: "0.3s" }} />
      <span className="bar-pulse inline-block w-[3px] h-1.5 bg-[var(--brand-teal-bright)]" style={{ animationDelay: "0.45s" }} />
    </span>
  );
}

/* ─────────── Starfield backdrop ───────────
   Fine seeded star dust — deterministic (same layout every render/reload, so
   SSR and hydration agree). `bias` thins the dots over the left text column;
   `strength` scales overall opacity so quieter sections can reuse it. */
export function Starfield({
  count = 130,
  seed = 0x5747,
  strength = 1,
  bias = true,
  className = "",
}: {
  count?: number;
  seed?: number;
  strength?: number;
  bias?: boolean;
  className?: string;
}) {
  const rand = seededRng(seed);
  const stars = Array.from({ length: count }, () => {
    const x = rand() * 1600;
    const y = rand() * 900;
    const clear = !bias || x > 720 || rand() < 0.35;
    // Slow ambient drift (negative delays desynchronize the loop starts);
    // slightly under half the stars also breathe their opacity.
    const driftDur = 12 + rand() * 14;
    const twinkleDur = 2.8 + rand() * 3.4;
    return {
      x,
      y,
      r: 0.5 + rand() * 1.1,
      o: (0.12 + rand() * 0.45) * (clear ? 1 : 0.45) * strength,
      c: rand() < 0.06 ? "var(--brand-red)" : rand() < 0.4 ? "var(--brand-teal-bright)" : "#ffffff",
      twinkle: rand() < 0.45,
      driftDur,
      driftDelay: -rand() * driftDur,
      twinkleDur,
      twinkleDelay: -rand() * twinkleDur,
    };
  });
  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className={`absolute inset-0 h-full w-full ${className}`}
      aria-hidden
    >
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.r}
          fill={s.c}
          className={s.twinkle ? "star-twinkle" : "star-drift"}
          style={
            {
              "--so": s.o,
              "--sd": `${s.driftDur.toFixed(2)}s`,
              "--sdd": `${s.driftDelay.toFixed(2)}s`,
              "--st": `${s.twinkleDur.toFixed(2)}s`,
              "--std": `${s.twinkleDelay.toFixed(2)}s`,
              opacity: "var(--so)",
            } as CSSProperties
          }
        />
      ))}
    </svg>
  );
}

/* ─── Line-art icon set ───
   No emoji, single consistent stroke weight — one icon family across the
   hero/process sections. */
export type IconName =
  | "fileText"
  | "shieldCheck"
  | "shield"
  | "users"
  | "list"
  | "rocket"
  | "clipboardCheck"
  | "activity"
  | "barChart"
  | "radar"
  | "trendingUp"
  | "check"
  | "database"
  | "refresh"
  | "layers"
  | "handshake"
  | "search"
  | "server"
  | "landmark";

const ICONS: Record<IconName, ReactNode> = {
  // Same crosshair, but the bullseye is painted brand-red — the small pop of
  // colour on the Discovery "Business goals" outcome (per fo.png).
  fileText: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </>
  ),
  shieldCheck: (
    <>
      <path d="M12 2 4 5v6c0 5 3.4 8.2 8 10 4.6-1.8 8-5 8-10V5z" />
      <path d="m8.5 12 2.5 2.5 4.5-4.5" />
    </>
  ),
  shield: <path d="M12 2 4 5v6c0 5 3.4 8.2 8 10 4.6-1.8 8-5 8-10V5z" />,
  // Classical columned building — state institutions, banks, the Finance domain.
  landmark: (
    <>
      <path d="M4 8.5 12 3l8 5.5z" />
      <line x1="6" y1="12" x2="6" y2="17.5" />
      <line x1="10" y1="12" x2="10" y2="17.5" />
      <line x1="14" y1="12" x2="14" y2="17.5" />
      <line x1="18" y1="12" x2="18" y2="17.5" />
      <line x1="4" y1="20.5" x2="20" y2="20.5" />
    </>
  ),
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
  // Blueprint / plan sheet — a framed drawing with two component squares, an
  // accent circle and dimension lines (the Architecture "Design" card).
  rocket: (
    <>
      <path d="M5 14c-1.5 1-2 5-2 5s4-.5 5-2c.8-1 .7-2.3-.2-3a2 2 0 0 0-2.8 0Z" />
      <path d="M12.5 14.5 9.5 11.5c.5-2 1.5-4 3-5.5C15 3.5 18.5 3 21 3c0 2.5-.5 6-3 8.5-1.5 1.5-3.5 2.5-5.5 3Z" />
      <path d="M9.5 11.5 6 11s.5-2.5 2-3.5" />
      <path d="M12.5 14.5 13 18s2.5-.5 3.5-2" />
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
  check: <polyline points="4 12 9 17 20 6" />,
  // Clock — years of experience.
  // Stacked-disk database — the platforms we build on.
  database: (
    <>
      <ellipse cx="12" cy="5.5" rx="7" ry="2.5" />
      <path d="M5 5.5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" />
      <path d="M5 11.5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" />
    </>
  ),
  // Angle brackets + slash — software development.
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
  // Three isometric blocks — solution architecture.
  // Puzzle piece — application integration.
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
};

export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
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

/* ─── Domain artwork ───
   One abstract line-art composition per expertise field, in the same visual
   language as the process feature card (single stroke weight, teal on dark,
   slow ambient float via the svcart-* keyframes, one small brand-red accent
   each). Shared between the pinned Expertise section (which scrubs the
   draw-in via its scene-local --u) and the /expertise/[domain] subpages
   (where --u is never set, so every stroke collapses to fully drawn). Kept in
   code, not the dictionary — pure presentation. */

// SVG CSS transforms need an explicit view-box origin or they rotate/scale
// around a broken default.
const ART_CENTER = { transformBox: "view-box", transformOrigin: "110px 110px" } as const;

// Scroll-drawn stroke: dash the whole element (L generously overestimates its
// length) and retract the offset as the scene-local --u passes `start`, so the
// line traces itself in — and un-traces on reverse scroll. Where --u is unset
// the invalid var() collapses stroke-dashoffset to its initial 0 = fully drawn.
const draw = (L: number, start: number, len = 0.14): CSSProperties => ({
  strokeDasharray: L,
  strokeDashoffset: `calc((1 - clamp(0, calc((var(--u) - ${start}) / ${len}), 1)) * ${L}px)`,
});

// Fade-in for art parts that can't dash-draw (filled dots, the svcart-flow
// traces whose dasharray belongs to their ambient animation) — put on a <g>
// wrapper so it composes with svcart-blink's own opacity animation.
const fadeIn = (start: number, len = 0.1): CSSProperties => ({
  opacity: `clamp(0, calc((var(--u) - ${start}) / ${len}), 1)`,
});

export function DomainArt({ slug }: { slug: string }) {
  return (
    <svg
      viewBox="0 0 220 220"
      className="h-auto w-full max-w-[360px] text-[var(--brand-teal-bright)] drop-shadow-[0_0_18px_rgba(72,184,177,0.12)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {ART[slug] ?? null}
    </svg>
  );
}

/* Draw choreography: outer structure → inner geometry → accents, all inside
   the scene's approach window (--u ≈ -0.44..0). L values overestimate each
   element's true length — overshoot only skews timing, never the final
   fully-drawn state.

   Every composition is built ON the circle itself — concentric geometry with
   a shared center at (110,110), nothing extending past the dashed ring — so
   the four read as variations of one instrument, not four unrelated icons. */
const ART: Record<string, ReactNode> = {
  // Finance — a precision dial: tick ring, two concentric circles, a rising
  // sweep arc and a needle pointing to the peak, marked in brand red.
  finance: (
    <>
      <circle cx="110" cy="110" r="92" strokeDasharray="2 10" opacity="0.35" />
      <g className="svcart-floaty" style={ART_CENTER}>
        <g style={fadeIn(-0.44, 0.12)}>
          {Array.from({ length: 36 }, (_, k) => {
            const a = (k * 10 * Math.PI) / 180;
            const s = Math.sin(a);
            const c = Math.cos(a);
            return (
              <line
                key={k}
                x1={(110 + 78 * s).toFixed(1)}
                y1={(110 - 78 * c).toFixed(1)}
                x2={(110 + 84 * s).toFixed(1)}
                y2={(110 - 84 * c).toFixed(1)}
                opacity="0.3"
              />
            );
          })}
        </g>
        <circle cx="110" cy="110" r="62" opacity="0.5" style={draw(390, -0.36, 0.16)} />
        <circle cx="110" cy="110" r="30" opacity="0.3" style={draw(190, -0.3, 0.12)} />
        <path d="M110 40A70 70 0 0 1 164 65" opacity="0.8" style={draw(65, -0.2, 0.12)} />
        <path d="M110 110 157 70" style={draw(64, -0.14, 0.1)} />
        <g style={fadeIn(-0.06, 0.05)}>
          <circle cx="110" cy="110" r="2.4" fill="currentColor" stroke="none" />
          <circle className="svcart-blink" cx="157" cy="70" r="3" fill="var(--brand-red)" stroke="none" />
        </g>
      </g>
    </>
  ),
  // Human Resources — a constellation: an irregular ring of nodes linked
  // around a hub, one node lit in brand red. Link endpoints are trimmed back
  // from each node center so strokes never cross the node circles.
  hr: (
    <>
      <circle cx="110" cy="110" r="92" strokeDasharray="2 10" opacity="0.35" />
      <g className="svcart-floaty" style={ART_CENTER}>
        <circle cx="110" cy="110" r="5.5" style={draw(36, -0.4, 0.1)} />
        <path
          d="M130 55 160 95M163 106 142 156M134 161 90 156M80 150 51 110M52 101 83 75M93 68 121 53"
          opacity="0.45"
          style={draw(360, -0.34, 0.18)}
        />
        <path d="M118 109 158 101M102 109 53 106" opacity="0.3" style={draw(100, -0.24, 0.12)} />
        <circle cx="164" cy="100" r="4" style={draw(26, -0.3, 0.1)} />
        <circle cx="140" cy="162" r="4" style={draw(26, -0.27, 0.1)} />
        <circle cx="84" cy="155" r="4" style={draw(26, -0.24, 0.1)} />
        <circle cx="47" cy="105" r="4" style={draw(26, -0.21, 0.1)} />
        <circle cx="88" cy="71" r="4" style={draw(26, -0.18, 0.1)} />
        <g style={fadeIn(-0.08, 0.06)}>
          <circle cx="110" cy="110" r="1.8" fill="currentColor" stroke="none" />
          <circle className="svcart-blink" cx="126" cy="50" r="3" fill="var(--brand-red)" stroke="none" />
        </g>
      </g>
    </>
  ),
  // Healthcare — concentric pulse ripples with one ECG trace written through
  // the shared center, terminating in brand red. The trace is a solid stroke
  // drawn left-to-right — an svcart-flow dash would shred the pulse shape.
  healthcare: (
    <>
      <circle cx="110" cy="110" r="92" strokeDasharray="2 10" opacity="0.35" />
      <g className="svcart-floaty" style={ART_CENTER}>
        <circle cx="110" cy="110" r="68" opacity="0.3" style={draw(430, -0.42, 0.16)} />
        <circle cx="110" cy="110" r="48" opacity="0.5" style={draw(305, -0.36, 0.14)} />
        <circle cx="110" cy="110" r="28" opacity="0.7" style={draw(180, -0.3, 0.12)} />
        <path
          d="M34 110h44l8-14 10 28 8-24 6 10h68"
          opacity="0.85"
          style={draw(250, -0.22, 0.18)}
        />
        <g style={fadeIn(-0.05, 0.04)}>
          <circle className="svcart-blink" cx="184" cy="110" r="2.8" fill="var(--brand-red)" stroke="none" />
        </g>
      </g>
    </>
  ),
  // DMS & Workflow — strata: the circle rendered purely as layered horizontal
  // chords, like archive layers in section; the middle layer carries the red
  // index mark. Chord widths are sqrt(72² − dy²) for the r=72 disc.
  dms: (
    <>
      <circle cx="110" cy="110" r="92" strokeDasharray="2 10" opacity="0.35" />
      <g className="svcart-floaty" style={ART_CENTER}>
        <path d="M70 50h80" opacity="0.35" style={draw(90, -0.42, 0.1)} />
        <path d="M54 65h112" opacity="0.45" style={draw(122, -0.385, 0.1)} />
        <path d="M45 80h130" opacity="0.55" style={draw(140, -0.35, 0.1)} />
        <path d="M40 95h140" opacity="0.7" style={draw(150, -0.315, 0.1)} />
        <path d="M38 110h144" style={draw(154, -0.28, 0.1)} />
        <path d="M40 125h140" opacity="0.7" style={draw(150, -0.245, 0.1)} />
        <path d="M45 140h130" opacity="0.55" style={draw(140, -0.21, 0.1)} />
        <path d="M54 155h112" opacity="0.45" style={draw(122, -0.175, 0.1)} />
        <path d="M70 170h80" opacity="0.35" style={draw(90, -0.14, 0.1)} />
        <g style={fadeIn(-0.06, 0.05)}>
          <circle className="svcart-blink" cx="188" cy="110" r="2.6" fill="var(--brand-red)" stroke="none" />
        </g>
      </g>
    </>
  ),
};
