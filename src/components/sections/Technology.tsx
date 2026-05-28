"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Dict } from "@/lib/dictionaries";
import type { TechItem } from "@/components/three/TechCluster";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const TechCluster = dynamic(() => import("@/components/three/TechCluster"), {
  ssr: false,
});

export default function Technology({ dict }: { dict: Dict }) {
  const tech = dict.technology;
  const ref = useRef<HTMLDivElement>(null);
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

  const clusterItems = useMemo<TechItem[]>(
    () =>
      tech.tiers.flatMap((tier, ti) =>
        tier.tech.map((name) => ({ name, tier: ti }))
      ),
    [tech.tiers]
  );

  useGSAP(
    () => {
      gsap.to(".tech-h2", {
        clipPath: "inset(0 0% 0 0)",
        duration: 1.2,
        ease: "power4.out",
        scrollTrigger: { trigger: ".tech-h2", start: "top 85%" },
      });

      gsap.from("[data-tier]", {
        opacity: 0,
        y: 28,
        duration: 0.75,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: { trigger: "[data-tier]", start: "top 85%" },
      });

      gsap.utils.toArray<HTMLElement>("[data-tier]").forEach((band, bi) => {
        const badges = band.querySelectorAll<HTMLElement>("[data-tech-badge]");
        gsap.from(badges, {
          opacity: 0,
          scale: 0.85,
          y: 8,
          duration: 0.55,
          ease: "back.out(1.6)",
          stagger: 0.06,
          delay: bi * 0.12 + 0.15,
          scrollTrigger: { trigger: band, start: "top 85%" },
        });

        const rail = band.querySelector<HTMLElement>("[data-tier-rail]");
        if (rail) {
          gsap.fromTo(
            rail,
            { scaleY: 0, transformOrigin: "top center" },
            {
              scaleY: 1,
              duration: 0.9,
              ease: "power3.out",
              delay: bi * 0.12,
              scrollTrigger: { trigger: band, start: "top 85%" },
            }
          );
        }
      });
    },
    { scope: ref }
  );

  return (
    <section
      id="technology"
      ref={ref}
      className="relative bg-[var(--bg-inset)] text-white py-28 lg:py-36 overflow-hidden"
    >
      {/* Faint grid backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
      />

      <div className="relative mx-auto max-w-[1280px] px-6 lg:px-10">
        {/* Heading */}
        <div className="max-w-2xl">
          <div className="mono text-[11px] tracking-[0.25em] uppercase text-[var(--brand-teal-bright)] flex items-center gap-2">
            <span className="h-px w-6 bg-[var(--brand-teal-bright)]" />
            {tech.eyebrow}
          </div>
          <h2 className="tech-h2 mask-reveal mt-5 text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.05] tracking-[-0.02em] font-medium">
            {tech.title}
          </h2>
          <p className="mt-6 text-white/65 leading-relaxed max-w-md text-[15.5px]">
            {tech.body}
          </p>
        </div>

        {/* 3D cluster — every tech from every tier on a slowly-rotating sphere.
           Hover a label to pull it forward; siblings dim. */}
        {!reducedMotion && (
          <div className="mt-10 relative h-[320px] lg:h-[360px]">
            <TechCluster items={clusterItems} />
            <div className="absolute bottom-2 left-0 mono text-[10px] tracking-[0.22em] uppercase text-white/30 pointer-events-none">
              hover · explore the stack
            </div>
          </div>
        )}

        {/* Tier bands */}
        <div className="mt-16 space-y-5">
          {tech.tiers.map((tier, i) => (
            <TierBand
              key={tier.label}
              index={i}
              label={tier.label}
              tech={tier.tech}
              note={tier.note}
              isSecurity={i === tech.tiers.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function TierBand({
  index,
  label,
  tech,
  note,
  isSecurity,
}: {
  index: number;
  label: string;
  tech: string[];
  note: string;
  isSecurity: boolean;
}) {
  const accentVar = isSecurity ? "var(--brand-red)" : "var(--brand-teal-bright)";
  const accentRgba = isSecurity
    ? "rgba(216,65,58,0.85)"
    : "rgba(72,184,177,0.55)";

  return (
    <div
      data-tier={index}
      className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 p-6 lg:p-8 border border-white/10 bg-[var(--bg-inset-elev)]/60 rounded-md overflow-hidden hover:border-white/15 transition-colors"
    >
      {/* Glowing left rail — tier-colored */}
      <div
        aria-hidden
        data-tier-rail
        className="absolute left-0 top-0 bottom-0 w-[3px] opacity-90"
        style={{
          background: accentVar,
          boxShadow: `0 0 14px ${accentVar}`,
        }}
      />

      {/* Subtle tier index numeral fading into the top-right corner */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-3 right-5 mono text-[64px] leading-none font-medium tracking-[-0.04em] text-white/[0.025] select-none"
      >
        {String(index + 1).padStart(2, "0")}
      </div>

      <div className="lg:col-span-4 flex flex-col justify-center">
        <div
          className="mono text-[10px] tracking-[0.28em] uppercase flex items-center gap-2"
          style={{ color: accentRgba }}
        >
          <span
            className="inline-block h-px w-5"
            style={{ background: accentVar }}
          />
          Tier {String(index + 1).padStart(2, "0")}
        </div>
        <h3 className="mt-2 mono uppercase text-[clamp(1.7rem,3.2vw,2.6rem)] leading-[1] tracking-[0.02em] text-white">
          {label}
        </h3>
      </div>

      <div className="lg:col-span-8 flex flex-col gap-5">
        <div className="flex flex-wrap gap-3">
          {tech.map((t) => (
            <TechBadge key={t} name={t} isSecurity={isSecurity} />
          ))}
        </div>
        <p
          className="mono text-[12px] leading-relaxed tracking-[0.04em] text-white/55 max-w-2xl flex items-start gap-2"
        >
          <span style={{ color: accentVar }}>▸</span>
          <span>{note}</span>
        </p>
      </div>
    </div>
  );
}

function TechBadge({
  name,
  isSecurity,
}: {
  name: string;
  isSecurity: boolean;
}) {
  const accentVar = isSecurity ? "var(--brand-red)" : "var(--brand-teal-bright)";
  const accentBgHover = isSecurity
    ? "rgba(216,65,58,0.07)"
    : "rgba(72,184,177,0.07)";

  return (
    <span
      data-tech-badge
      className="group relative inline-flex items-center gap-2.5 px-4 py-2.5 border border-white/15 bg-white/[0.03] rounded-md transition-all duration-300 hover:-translate-y-0.5"
      style={
        {
          ["--badge-accent" as string]: accentVar,
          ["--badge-bg" as string]: accentBgHover,
        } as React.CSSProperties
      }
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = accentVar;
        e.currentTarget.style.background = accentBgHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "";
        e.currentTarget.style.background = "";
      }}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span
          className="absolute inset-0 rounded-full opacity-60 group-hover:opacity-100 transition-opacity"
          style={{ background: accentVar }}
        />
        <span
          className="absolute inset-[-3px] rounded-full opacity-0 group-hover:opacity-35 blur-[2px] transition-opacity"
          style={{ background: accentVar }}
        />
      </span>
      <span className="font-medium text-[15px] tracking-[-0.005em] text-white/95">
        {name}
      </span>
      <span
        aria-hidden
        className="absolute -top-[3px] -left-[3px] h-1.5 w-1.5 border-t border-l opacity-65"
        style={{ borderColor: accentVar }}
      />
      <span
        aria-hidden
        className="absolute -bottom-[3px] -right-[3px] h-1.5 w-1.5 border-b border-r opacity-65"
        style={{ borderColor: accentVar }}
      />
    </span>
  );
}
