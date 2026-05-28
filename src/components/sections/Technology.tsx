"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Dict } from "@/lib/dictionaries";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const BURST_COUNT = 10;
const SPINE_PARTICLES = 8;

export default function Technology({ dict }: { dict: Dict }) {
  const tech = dict.technology;
  const ref = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useGSAP(
    () => {
      // Title reveal
      gsap.to(".tech-h2", {
        clipPath: "inset(0 0% 0 0)",
        duration: 1.2,
        ease: "power4.out",
        scrollTrigger: { trigger: ".tech-h2", start: "top 85%" },
      });

      // Spine draws first
      gsap.fromTo(
        ".tech-spine-line",
        { scaleY: 0, transformOrigin: "top center" },
        {
          scaleY: 1,
          duration: 1.6,
          ease: "power3.inOut",
          scrollTrigger: { trigger: ".tech-spine-wrap", start: "top 78%" },
        }
      );

      // Spine flowing particles
      if (!reducedMotion) {
        ScrollTrigger.create({
          trigger: ".tech-spine-wrap",
          start: "top 78%",
          onEnter: () => {
            const h = wrapRef.current?.offsetHeight ?? 620;
            gsap.utils
              .toArray<HTMLElement>(".tech-spine-p")
              .forEach((p, i) => {
                const dur = 3.4;
                const tl = gsap.timeline({
                  repeat: -1,
                  delay: i * (dur / SPINE_PARTICLES),
                });
                tl.fromTo(p, { y: 0, opacity: 0 }, { y: h * 0.05, opacity: 1, duration: 0.28, ease: "none" });
                tl.to(p, { y: h * 0.92, opacity: 1, duration: dur * 0.83, ease: "none" });
                tl.to(p, { y: h, opacity: 0, duration: 0.28, ease: "none" });
              });
          },
        });
      }

      // Per-tier: burst particles → badges fly in from spine direction
      gsap.utils.toArray<HTMLElement>(".tech-tier-row").forEach((row, i) => {
        const isLeft = i % 2 === 0;
        const st = { trigger: row, start: "top 82%" };

        // Node pops in
        const node = row.querySelector<HTMLElement>(".tech-tier-node");
        if (node) {
          gsap.from(node, {
            scale: 0,
            opacity: 0,
            duration: 0.52,
            ease: "back.out(2.5)",
            scrollTrigger: st,
          });
        }

        // Connector arm draws toward content
        const arm = row.querySelector<HTMLElement>(".tech-connector-arm");
        if (arm) {
          gsap.fromTo(
            arm,
            { scaleX: 0, transformOrigin: isLeft ? "right center" : "left center" },
            { scaleX: 1, duration: 0.5, ease: "power3.out", delay: 0.12, scrollTrigger: st }
          );
        }

        // Tier heading slides in
        const heading = row.querySelector<HTMLElement>(".tech-tier-heading");
        if (heading) {
          gsap.from(heading, {
            opacity: 0,
            x: isLeft ? -20 : 20,
            duration: 0.5,
            ease: "power3.out",
            delay: 0.2,
            scrollTrigger: st,
          });
        }

        // Burst particles scatter from node center
        if (!reducedMotion) {
          const burst = row.querySelectorAll<HTMLElement>(".tech-burst-p");
          burst.forEach((p, pi) => {
            const angle = (pi / BURST_COUNT) * Math.PI * 2;
            const dist = pi % 2 === 0 ? 70 : 48;
            gsap.fromTo(
              p,
              { x: 0, y: 0, opacity: 0.9, scale: 1 },
              {
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                opacity: 0,
                scale: 0.3,
                duration: 0.75,
                ease: "power2.out",
                delay: 0.05 + pi * 0.025,
                scrollTrigger: st,
              }
            );
          });
        }

        // Badges fly out from spine direction, staggered left-to-right
        const badges = row.querySelectorAll<HTMLElement>(".tech-badge");
        gsap.fromTo(
          badges,
          {
            opacity: 0,
            x: isLeft ? 55 : -55,
            scale: 0.55,
            filter: "blur(4px)",
          },
          {
            opacity: 1,
            x: 0,
            scale: 1,
            filter: "blur(0px)",
            duration: 0.6,
            ease: "power3.out",
            stagger: { each: 0.09, from: isLeft ? "end" : "start" },
            delay: 0.18,
            scrollTrigger: st,
          }
        );

        // Note fades last
        const note = row.querySelector<HTMLElement>(".tech-tier-note");
        if (note) {
          gsap.from(note, {
            opacity: 0,
            y: 5,
            duration: 0.45,
            ease: "power2.out",
            delay: 0.55,
            scrollTrigger: st,
          });
        }
      });

      // Node pulse rings
      if (!reducedMotion) {
        gsap.utils.toArray<HTMLElement>(".tech-node-ring").forEach((ring) => {
          gsap.fromTo(
            ring,
            { scale: 1, opacity: 0.5 },
            { scale: 2.5, opacity: 0, duration: 2.2, ease: "power2.out", repeat: -1, repeatDelay: 0.7 }
          );
        });
      }
    },
    { scope: ref }
  );

  return (
    <section
      id="technology"
      ref={ref}
      className="relative bg-[var(--bg-inset)] text-white py-28 lg:py-40 overflow-hidden"
    >
      {/* Grid backdrop */}
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

        {/* Spine */}
        <div ref={wrapRef} className="tech-spine-wrap mt-24 relative max-w-3xl mx-auto">
          {/* Spine line */}
          <div
            className="tech-spine-line absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px pointer-events-none"
            style={{
              background:
                "linear-gradient(to bottom, transparent, rgba(72,184,177,0.4) 6%, rgba(72,184,177,0.4) 94%, transparent)",
            }}
          />

          {/* Spine flowing particles */}
          {!reducedMotion && (
            <div
              aria-hidden
              className="absolute left-1/2 top-0 bottom-0 pointer-events-none"
              style={{ width: 0, overflow: "visible" }}
            >
              {Array.from({ length: SPINE_PARTICLES }).map((_, i) => {
                const big = i % 3 === 0;
                return (
                  <div
                    key={i}
                    className="tech-spine-p absolute"
                    style={{
                      top: 0,
                      left: big ? -2 : -1.5,
                      width: big ? 4 : 3,
                      height: big ? 4 : 3,
                      borderRadius: "50%",
                      background: "#48b8b1",
                      boxShadow: big
                        ? "0 0 7px #48b8b1, 0 0 14px rgba(72,184,177,0.55)"
                        : "0 0 4px #48b8b1",
                      opacity: 0,
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* Tiers */}
          {tech.tiers.map((tier, i) => {
            const isSec = i === tech.tiers.length - 1;
            const isLeft = i % 2 === 0;
            const accent = isSec ? "var(--brand-red)" : "var(--brand-teal-bright)";
            const accentHex = isSec ? "#d63b3b" : "#48b8b1";
            const accentGlow = isSec ? "rgba(214,59,59,0.18)" : "rgba(72,184,177,0.18)";
            const accentGlowRing = isSec ? "rgba(214,59,59,0.5)" : "rgba(72,184,177,0.5)";
            const accentFaint = isSec ? "rgba(214,59,59,0.2)" : "rgba(72,184,177,0.2)";

            return (
              <div key={i} className="tech-tier-row group relative">
                {/* Subtle hover bg */}
                <div
                  aria-hidden
                  className="absolute inset-x-[-1.5rem] inset-y-2 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse 65% 75% at ${isLeft ? "60%" : "40%"} 50%, ${accentGlow} 0%, transparent 70%)`,
                  }}
                />

                <div
                  className="grid items-center py-12 lg:py-16"
                  style={{ gridTemplateColumns: "1fr 80px 1fr" }}
                >
                  {/* Left cell */}
                  <div className="pr-8">
                    {isLeft && (
                      <div className="tech-tier-content flex flex-col items-end text-right gap-4">
                        <TierContent
                          tier={tier}
                          accent={accent}
                          accentHex={accentHex}
                          align="right"
                        />
                      </div>
                    )}
                  </div>

                  {/* Center — node + connector arm + burst particles */}
                  <div className="relative flex items-center justify-center">
                    {/* Connector arm */}
                    <div
                      className="tech-connector-arm absolute top-1/2 -translate-y-1/2 h-px w-8 pointer-events-none"
                      style={{
                        background: `linear-gradient(${isLeft ? "to left" : "to right"}, transparent, ${accent})`,
                        [isLeft ? "right" : "left"]: "100%",
                      }}
                    />

                    {/* Burst particle cloud — all start at 0,0 (node center) */}
                    {!reducedMotion && (
                      <div
                        aria-hidden
                        className="absolute inset-0 pointer-events-none"
                        style={{ overflow: "visible" }}
                      >
                        {Array.from({ length: BURST_COUNT }).map((_, pi) => (
                          <div
                            key={pi}
                            className="tech-burst-p absolute"
                            style={{
                              top: "50%",
                              left: "50%",
                              width: pi % 3 === 0 ? 4 : 3,
                              height: pi % 3 === 0 ? 4 : 3,
                              borderRadius: "50%",
                              background: accentHex,
                              boxShadow: `0 0 6px ${accentHex}`,
                              transform: "translate(-50%,-50%)",
                              opacity: 0,
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {/* Node */}
                    <div className="tech-tier-node relative z-10">
                      {!reducedMotion && (
                        <div
                          className="tech-node-ring absolute inset-0 rounded-full pointer-events-none"
                          style={{ border: `1px solid ${accent}` }}
                        />
                      )}
                      {/* Outer faint ring */}
                      <div
                        className="absolute -inset-[6px] rounded-full pointer-events-none"
                        style={{ border: `1px solid ${accentFaint}` }}
                      />
                      <div
                        className="relative w-14 h-14 rounded-full flex flex-col items-center justify-center bg-[var(--bg-inset)]"
                        style={{
                          border: `1px solid ${accent}`,
                          boxShadow: `0 0 0 5px ${accentGlow}, 0 0 24px ${accentGlowRing}`,
                        }}
                      >
                        <span
                          className="mono text-[8px] tracking-[0.1em] leading-none mb-0.5"
                          style={{ color: accent, opacity: 0.65 }}
                        >
                          TIER
                        </span>
                        <span
                          className="mono text-[16px] font-semibold leading-none"
                          style={{ color: accent }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right cell */}
                  <div className="pl-8">
                    {!isLeft && (
                      <div className="tech-tier-content flex flex-col items-start text-left gap-4">
                        <TierContent
                          tier={tier}
                          accent={accent}
                          accentHex={accentHex}
                          align="left"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TierContent({
  tier,
  accent,
  accentHex,
  align,
}: {
  tier: { label: string; tech: string[]; note: string };
  accent: string;
  accentHex: string;
  align: "left" | "right";
}) {
  return (
    <>
      {/* Tier heading */}
      <div className="tech-tier-heading">
        <div
          className="mono text-[10px] tracking-[0.3em] uppercase mb-1.5"
          style={{ color: accent, opacity: 0.8 }}
        >
          {`0${align === "right" ? "← " : " →"}`.trim()}
        </div>
        <h3
          className="text-white font-medium text-[clamp(1.1rem,2vw,1.5rem)] leading-tight tracking-[-0.01em]"
        >
          {tier.label}
        </h3>
      </div>

      {/* Tech badges */}
      <div
        className={`flex flex-wrap gap-2 ${align === "right" ? "justify-end" : "justify-start"}`}
      >
        {tier.tech.map((t) => (
          <TechBadge key={t} name={t} accent={accent} accentHex={accentHex} />
        ))}
      </div>

      {/* Note */}
      <p
        className={`tech-tier-note mono text-[11px] leading-relaxed text-white/38 tracking-[0.02em] max-w-[240px] ${align === "right" ? "text-right" : "text-left"}`}
      >
        {tier.note}
      </p>
    </>
  );
}

function TechBadge({
  name,
  accent,
  accentHex,
}: {
  name: string;
  accent: string;
  accentHex: string;
}) {
  return (
    <span
      className="tech-badge inline-flex items-center gap-2 px-3.5 py-2 border border-white/10 bg-white/[0.04] rounded-md text-[13.5px] text-white/90 font-medium cursor-default transition-transform duration-200 hover:-translate-y-0.5"
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full flex-none"
        style={{ background: accent, boxShadow: `0 0 5px ${accentHex}99` }}
      />
      {name}
    </span>
  );
}
