"use client";

import type { CSSProperties, ReactNode } from "react";
import { seededRng } from "@/lib/rng";

/* ─── Shared presentation helpers for the hero / expertise / process sections ───
   Extracted from the original single-pin PinnedHero when it was split into
   Hero + Expertise + PinnedProcess. Pure presentation — no scroll logic. */

// CSSProperties widened to accept custom properties (--vars).
export type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

// Must be the exact string the CSS gates in globals.css use — the pinned
// variants display iff this matches, so a pin always has its JS. The height
// floor sends very short windows to the static variants.
// Keep the scroll-scrubbed scenes desktop-only. Phones get the static,
// naturally scrolling variants: they are clearer, more reliable, and avoid
// paying for a WebGL scene on a small touch device.
export const MOTION_QUERY = "(prefers-reduced-motion: no-preference) and (min-height: 500px) and (min-width: 1024px)";

// Maps a stage-local progress var --u onto a 0..1 reveal var --r starting at
// `start` over `len`, applied as opacity + a small lift. lift=0 keeps the
// transform free for elements that carry their own transform.
export const rev = (start: number, len = 0.1, lift = 6): CSSVars => ({
  "--r": `clamp(0, calc((var(--u) - ${start}) / ${len}), 1)`,
  opacity: "var(--r)",
  transform: lift ? `translateY(calc((1 - var(--r)) * ${lift}px))` : undefined,
});

// Rotating/floating SVG parts carry inline transform-box: view-box + a px
// origin (SVG CSS transforms default to a broken origin otherwise).
export const CENTER = { transformBox: "view-box", transformOrigin: "80px 80px" } as const;

export const CARD_SHELL =
  "rounded-2xl border border-white/10 bg-[#0d1728] shadow-[0_14px_40px_rgba(0,0,0,0.4)]";

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

// #FollowTheStream brand lockup — the logo's equalizer-bar mark scaled up to
// headline size, with a two-tone wordmark treatment (teal hash, white body,
// brand-red "Stream") so the exit tag reads as company branding, not copy.
export function FollowTheStream({ tag }: { tag: string }) {
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

/* ─────────── Orbit arcs backdrop ───────────
   Two enormous orbit circles centred far off-canvas (top-right and
   bottom-left) so only their arcs sweep across the frame, each carrying a few
   glowing satellite dots. The whole ring rotates very slowly (svcart-spin with
   a multi-minute duration), so the dots creep along their orbits like planets.
   Pure static SVG — rendered once, animated entirely in CSS. */
export function OrbitArcs() {
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
        {/* The r840 solid circle that used to sit here swept a lone hairline
           across the whole dark midsection — removed on request; its
           satellite dots stay, riding the now-invisible orbit. */}
        <circle cx="1780" cy="120" r="620" fill="none" stroke="rgba(72,184,177,0.18)" strokeWidth="1" strokeDasharray="2 10" />
        <circle cx="940" cy="120" r="4.5" fill="var(--brand-teal-bright)" style={glow} />
        <circle cx="1053" cy="540" r="3" fill="var(--brand-red)" opacity="0.9" />
        <circle cx="1169" cy="12" r="3.5" fill="var(--brand-teal-bright)" opacity="0.85" style={glow} />
      </g>
      {/* bottom-left system — dots at r720: 0°→(540,760), -45°→(329,251) */}
      <g className="svcart-spin-rev" style={{ ...CENTER, transformOrigin: "-180px 760px", animationDuration: "320s" }}>
        {/* solid r720 orbit circle removed on request (same as the top-right
           r840) — the satellite dots keep riding the invisible path */}
        <circle cx="540" cy="760" r="4" fill="var(--brand-teal-bright)" style={glow} />
        <circle cx="329" cy="251" r="3" fill="var(--brand-teal-bright)" opacity="0.8" style={glow} />
      </g>
    </svg>
  );
}

// ─── Circular line-art icon medallion ───
export function Medallion({
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
   No emoji, single consistent stroke weight — one icon family across the
   hero/process sections. */
export type IconName =
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
  | "server"
  | "landmark";

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
