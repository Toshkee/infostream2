"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Dict } from "@/lib/dictionaries";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function Technology({ dict }: { dict: Dict }) {
  const tech = dict.technology;
  const ref = useRef<HTMLDivElement>(null);

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
      {/* Faint grid backdrop, fades toward edges */}
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

        {/* Tier bands */}
        <div className="mt-16 space-y-5">
          {tech.tiers.map((tier, i) => (
            <TierBand
              key={tier.label}
              index={i}
              label={tier.label}
              tech={tier.tech}
              note={tier.note}
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
}: {
  index: number;
  label: string;
  tech: string[];
  note: string;
}) {
  return (
    <div
      data-tier={index}
      className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 p-6 lg:p-8 border border-white/10 bg-[var(--bg-inset-elev)]/60 rounded-md overflow-hidden"
    >
      {/* Glowing teal accent rail on left edge — drops in on enter */}
      <div
        aria-hidden
        data-tier-rail
        className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--brand-teal-bright)] opacity-85"
        style={{ boxShadow: "0 0 14px var(--brand-teal-bright)" }}
      />

      {/* Left: tier label */}
      <div className="lg:col-span-4 flex flex-col justify-center">
        <div className="mono text-[10px] tracking-[0.28em] uppercase text-white/40">tier</div>
        <h3 className="mt-2 mono uppercase text-[clamp(1.7rem,3.2vw,2.6rem)] leading-[1] tracking-[0.02em] text-white">
          {label}
        </h3>
      </div>

      {/* Right: tech badges + note */}
      <div className="lg:col-span-8 flex flex-col gap-5">
        <div className="flex flex-wrap gap-3">
          {tech.map((t) => (
            <TechBadge key={t} name={t} />
          ))}
        </div>
        <p className="mono text-[12px] leading-relaxed tracking-[0.04em] text-white/55 max-w-2xl">
          {note}
        </p>
      </div>
    </div>
  );
}

function TechBadge({ name }: { name: string }) {
  return (
    <span data-tech-badge className="group relative inline-flex items-center gap-2.5 px-4 py-2.5 border border-white/15 bg-white/[0.03] rounded-md transition-all duration-300 hover:border-[var(--brand-teal-bright)] hover:bg-[rgba(72,184,177,0.07)] hover:-translate-y-0.5">
      {/* leading marker — fills with teal on hover */}
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inset-0 rounded-full bg-[var(--brand-teal-bright)] opacity-50 group-hover:opacity-100 transition-opacity" />
        <span className="absolute inset-[-3px] rounded-full bg-[var(--brand-teal-bright)] opacity-0 group-hover:opacity-30 blur-[2px] transition-opacity" />
      </span>
      <span className="font-medium text-[15px] tracking-[-0.005em] text-white/95">
        {name}
      </span>
      {/* corner brackets — terminal frame motif */}
      <span aria-hidden className="absolute -top-[3px] -left-[3px] h-1.5 w-1.5 border-t border-l border-[var(--brand-teal-bright)] opacity-60" />
      <span aria-hidden className="absolute -bottom-[3px] -right-[3px] h-1.5 w-1.5 border-b border-r border-[var(--brand-teal-bright)] opacity-60" />
    </span>
  );
}
