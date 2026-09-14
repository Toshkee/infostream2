import type { CSSVars } from "../visuals";

export const FEATURED: Record<string, number[]> = {
  finance: [0, 1, 5],
  hr: [0, 1, 2],
  healthcare: [],
  dms: [0, 1],
};

export const DOMAIN_TINT: Record<string, string> = {
  finance: "rgba(196, 150, 74, 0.09)",
  hr: "rgba(148, 118, 214, 0.09)",
  healthcare: "rgba(74, 196, 142, 0.09)",
  dms: "rgba(92, 142, 214, 0.1)",
};

export const domainStyle = (target: number): CSSVars => ({
  "--so": `clamp(0, min(calc((var(--xp) - ${target - 0.48}) / 0.16), calc((${target + 0.48} - var(--xp)) / 0.16)), 1)`,
  opacity: "var(--so)",
  transform: `translateY(clamp(-18px, calc((var(--xp) - ${target}) * -26px), 18px))`,
});
export const drev = (start: number, len = 0.12, lift = 10): CSSVars => ({
  "--r": `clamp(0, calc((var(--u) - ${start}) / ${len}), 1)`,
  opacity: "var(--r)",
  transform: `translateY(calc((1 - var(--r)) * ${lift}px))`,
});
export const titleStyle: CSSVars = {
  "--r": "clamp(0, calc((var(--u) + 0.45) / 0.25), 1)",
  clipPath: "inset(0 0 calc((1 - var(--r)) * 100%) 0)",
  opacity: "calc(0.2 + 0.8 * var(--r))",
};
