"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
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
      gsap.to(".sec-h2", {
        clipPath: "inset(0 0% 0 0)",
        duration: 1.2,
        ease: "power4.out",
        scrollTrigger: { trigger: ".sec-h2", start: "top 85%" },
      });

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

      if (reducedMotion) {
        gsap.set([".sec-draw", ".sec-link"], { drawSVG: "100%", opacity: 1 });
        gsap.set([".sec-sat", ".sec-core", ".sec-dot", ".sec-orbit"], { opacity: 1, scale: 1 });
        return;
      }

      // Orbital diagram entrance — rings fade in (drawSVG would flatten their
      // dash pattern), shield draws, satellites pop.
      gsap.set(".sec-orbit", { opacity: 0, scale: 0.92, transformOrigin: "50% 50%" });
      gsap.set(".sec-link", { drawSVG: "0%" });
      gsap.set(".sec-draw", { drawSVG: "0%" });
      gsap.set(".sec-sat", { opacity: 0, scale: 0.6, transformOrigin: "50% 50%" });
      gsap.set(".sec-core", { opacity: 0, scale: 0.85, transformOrigin: "50% 50%" });
      gsap.set(".sec-dot", { opacity: 0 });

      const tl = gsap.timeline({
        scrollTrigger: { trigger: ".sec-viz", start: "top 75%" },
      });
      tl.to(".sec-core", { opacity: 1, scale: 1, duration: 0.7, ease: "power3.out" }, 0)
        .to(".sec-orbit", { opacity: 1, scale: 1, duration: 1.1, stagger: 0.15, ease: "power2.out" }, 0.1)
        .to(".sec-draw", { drawSVG: "100%", duration: 0.9, ease: "power2.out" }, 0.35)
        .to(".sec-link", { drawSVG: "100%", duration: 0.7, stagger: 0.08, ease: "power2.out" }, 0.5)
        .to(".sec-sat", { opacity: 1, scale: 1, duration: 0.55, stagger: 0.1, ease: "back.out(1.8)" }, 0.7)
        .to(".sec-dot", { opacity: 0.7, duration: 0.5, stagger: 0.04 }, 1);

      // Verification pulse — the core periodically emits a ring; as it crosses
      // the orbit, every satellite glows and its link brightens, like the
      // standards being re-verified. The glow lands when the eased ring radius
      // passes ORBIT_R (~35% of the expansion, ≈0.75s in).
      const pulse = gsap.timeline({ repeat: -1, repeatDelay: 2.6, delay: 1.8 });
      pulse
        .set(".sec-ring", { attr: { r: 96 }, opacity: 0.5 })
        .to(".sec-ring", { attr: { r: 238 }, opacity: 0, duration: 2.2, ease: "power1.out" }, 0)
        .to(
          ".sec-sat",
          { scale: 1.06, duration: 0.4, ease: "power2.out", yoyo: true, repeat: 1, transformOrigin: "50% 50%" },
          0.75
        )
        .to(
          ".sec-sat-halo",
          { attr: { stroke: "rgba(58,165,160,0.55)" }, duration: 0.4, yoyo: true, repeat: 1 },
          0.75
        )
        .to(
          ".sec-link",
          { attr: { stroke: "rgba(58,165,160,0.8)" }, duration: 0.4, yoyo: true, repeat: 1 },
          0.75
        );

      // Ambient drift on the scattered dots.
      gsap.utils.toArray<SVGElement>(".sec-dot").forEach((el, i) => {
        gsap.to(el, {
          opacity: 0.15,
          duration: 1.6 + (i % 5) * 0.4,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: 1 + (i % 7) * 0.3,
        });
      });
    },
    { scope: ref, dependencies: [reducedMotion] }
  );

  return (
    <section id="security" ref={ref} className="relative py-28 lg:py-36 bg-[var(--bg-elev)] overflow-hidden">
      <div className="relative z-10 mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5">
            <div className="mono text-[11px] tracking-[0.25em] uppercase text-[var(--brand-teal)]">
              {dict.security.eyebrow}
            </div>
            <h2 className="sec-h2 mask-reveal mt-5 text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.05] tracking-[-0.02em] font-medium">
              {dict.security.title}
            </h2>
            <p className="mt-6 text-[var(--fg-dim)] leading-relaxed max-w-md text-[15.5px]">
              {dict.security.body}
            </p>
          </div>

          {/* Orbital standards diagram — satellites circle the certified core. */}
          <div className="sec-viz lg:col-span-7 relative">
            <OrbitalDiagram />
          </div>
        </div>

        <div className="sec-cards grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-16">
          {dict.security.cards.map((c) => (
            <div
              key={c.id}
              className="sec-card group relative rounded-2xl border border-black/[0.08] bg-white p-6 shadow-[0_1px_2px_rgba(10,14,22,0.04)] hover:border-[rgba(58,165,160,0.45)] hover:-translate-y-1 transition-all duration-300"
            >
              <span className="absolute top-5 right-5 h-1.5 w-1.5 rounded-full bg-[var(--brand-teal)] opacity-60 group-hover:opacity-100 transition-opacity" />
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
      {/* Scattered ambient dots */}
      {[
        [66, 130], [130, 66], [420, 58], [500, 140], [512, 300], [468, 452],
        [330, 512], [140, 486], [52, 372], [214, 40], [508, 216], [92, 250],
      ].map(([x, y], i) =>
        i % 4 === 3 ? (
          <rect key={i} className="sec-dot" x={x - 2.5} y={y - 2.5} width="5" height="5" fill="none" stroke="rgba(58,165,160,0.45)" strokeWidth="1" />
        ) : (
          <circle key={i} className="sec-dot" cx={x} cy={y} r={i % 3 === 0 ? 3 : 1.8} fill="rgba(58,165,160,0.45)" />
        )
      )}

      {/* Dashed orbit rings */}
      <circle className="sec-orbit" cx="280" cy="280" r={ORBIT_R} fill="none" stroke="rgba(58,165,160,0.35)" strokeWidth="1" strokeDasharray="3 7" />
      <circle className="sec-orbit" cx="280" cy="280" r={ORBIT_R - 42} fill="none" stroke="rgba(58,165,160,0.16)" strokeWidth="1" strokeDasharray="2 9" />

      {/* Verification pulse ring — expands from the core, faded out at rest */}
      <circle
        className="sec-ring"
        cx="280"
        cy="280"
        r="96"
        fill="none"
        stroke="var(--brand-teal)"
        strokeWidth="1.5"
        opacity="0"
      />

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

      {/* Certified core */}
      <g className="sec-core">
        <circle cx="280" cy="280" r="96" fill="rgba(58,165,160,0.06)" stroke="rgba(58,165,160,0.14)" strokeWidth="1" />
        <g transform="translate(280 282)">
          <path
            className="sec-draw"
            d="M0 -52 L38 -38 v28 c0 25 -16 40 -38 51 c-22 -11 -38 -26 -38 -51 v-28 Z"
            fill="none"
            stroke="var(--brand-teal)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            className="sec-draw"
            d="M-16 -2 l12 13 l22 -26"
            fill="none"
            stroke="var(--brand-teal)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>
    </svg>
  );
}
