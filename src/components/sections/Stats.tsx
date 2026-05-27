"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Dict } from "@/lib/dictionaries";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Stat = { key: keyof Dict["stats"]; value: string; label: string };

export default function Stats({ dict }: { dict: Dict }) {
  const items: Stat[] = (["uptime", "volume", "years", "iso"] as const).map((k) => ({
    key: k,
    value: dict.stats[k].value,
    label: dict.stats[k].label,
  }));

  const ref = useRef<HTMLDivElement>(null);

  // Scan-line sweep — a thin teal beam crosses the strip when it enters view.
  useGSAP(
    () => {
      gsap.fromTo(
        ".stats-sweep",
        { x: "-30%", opacity: 0 },
        {
          x: "120%",
          opacity: 1,
          duration: 1.4,
          ease: "power2.inOut",
          scrollTrigger: { trigger: ref.current, start: "top 80%", once: true },
        }
      );
    },
    { scope: ref }
  );

  return (
    <section
      ref={ref}
      className="relative bg-[var(--bg-inset)] text-white border-y border-white/10 overflow-hidden"
    >
      {/* Scan-line — animated by GSAP above */}
      <div
        aria-hidden
        className="stats-sweep pointer-events-none absolute top-0 left-0 h-full w-[35%]"
        style={{
          opacity: 0,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(72,184,177,0.06) 50%, transparent 100%)",
        }}
      />
      <div className="relative mx-auto max-w-[1280px] px-6 lg:px-10 py-14 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10 md:gap-y-0 md:divide-x md:divide-white/10">
          {items.map((s, i) => (
            <StatCell key={s.key} value={s.value} label={s.label} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatCell({ value, label, index }: { value: string; label: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(value);
  const [inView, setInView] = useState(false);

  // Detect when the cell enters the viewport so we only count up once.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setInView(true)),
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Count-up — parse number out of value, animate from 0 to target, then restore
  // the original formatted string (preserving prefix/suffix like €, %, B, +).
  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const parsed = parseFormattedNumber(value);
    if (!parsed) return; // non-numeric (e.g. "ISO 27001") — leave static

    const { num, prefix, suffix, decimals, decimalSep } = parsed;
    const duration = 1100 + index * 80;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const current = num * eased;
      const formatted = current.toFixed(decimals).replace(".", decimalSep);
      setShown(`${prefix}${formatted}${suffix}`);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setShown(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, index]);

  return (
    <div ref={ref} className="px-6 first:pl-0 md:first:pl-6 md:px-8 lg:px-10">
      <div className="mono text-[28px] md:text-[34px] lg:text-[42px] leading-none tracking-[-0.02em] text-white">
        {shown}
      </div>
      <div className="mt-3 mono text-[10px] tracking-[0.22em] uppercase text-white/45 max-w-[18ch]">
        {label}
      </div>
    </div>
  );
}

// Parse a localized number out of a formatted display string.
// Returns null if the leading numeric token can't be extracted (so we leave
// purely textual values like "ISO 27001" alone).
function parseFormattedNumber(
  s: string
): { num: number; prefix: string; suffix: string; decimals: number; decimalSep: string } | null {
  const m = s.match(/^(\D*)([\d.,]+)(.*)$/);
  if (!m) return null;
  const [, prefix, raw, suffix] = m;
  const lastDot = raw.lastIndexOf(".");
  const lastComma = raw.lastIndexOf(",");
  const decimalIdx = Math.max(lastDot, lastComma);
  const decimalSep = decimalIdx === lastComma ? "," : ".";
  let decimals = 0;
  let normalized = raw.replace(/[.,]/g, "");
  if (decimalIdx !== -1) {
    decimals = raw.length - decimalIdx - 1;
    normalized =
      normalized.slice(0, normalized.length - decimals) + "." + normalized.slice(normalized.length - decimals);
  }
  const num = parseFloat(normalized);
  if (!Number.isFinite(num)) return null;
  return { num, prefix, suffix, decimals, decimalSep };
}
