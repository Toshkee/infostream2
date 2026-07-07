"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import type { Dict } from "@/lib/dictionaries";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Flagship engagements shown as large cards: index into dict.clients.projects
// plus the domain label to show as the card eyebrow (index into
// dict.clients.groups). This is structure, not copy — the translatable labels
// live in the dictionaries ("structure in code, copy in dict", as elsewhere).
// Everything not featured falls into the condensed index below, in dict order.
const FEATURED: { project: number; group: number }[] = [
  { project: 1, group: 1 }, // Tax Administration — Central Register of Business Entities
  { project: 2, group: 0 }, // Ministry of Defense — INFODMS
  { project: 4, group: 2 }, // Parliament — ERPStream platform
  { project: 16, group: 3 }, // EU Assistance Funds CFCU — eCES
];

export default function Clients({ dict }: { dict: Dict }) {
  const ref = useRef<HTMLDivElement>(null);
  const c = dict.clients;

  // Second sentence of the positioning line in teal.
  const titleParts = c.title.split(/(?<=\.)\s+/);

  const featured = FEATURED.map(({ project, group }) => ({
    ...c.projects[project],
    domain: c.groups[group] ?? "",
  }));
  const featuredIdx = new Set(FEATURED.map((f) => f.project));
  const index = c.projects.filter((_, i) => !featuredIdx.has(i));

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        gsap.set(".clients-h2", { clipPath: "inset(0 0% 0 0)" });
        return;
      }

      gsap.to(".clients-h2", {
        clipPath: "inset(0 0% 0 0)", duration: 1.1, ease: "power4.out",
        scrollTrigger: { trigger: ".clients-h2", start: "top 85%" },
      });
      gsap.from(".cl-card", {
        opacity: 0, y: 26, duration: 0.8, stagger: 0.1, ease: "power3.out",
        scrollTrigger: { trigger: ".cl-featured", start: "top 80%" },
      });
      gsap.from(".cl-index-item", {
        opacity: 0, y: 10, duration: 0.45, stagger: 0.03, ease: "power2.out",
        scrollTrigger: { trigger: ".cl-index", start: "top 85%" },
      });
      gsap.from(".clients-more", {
        opacity: 0, y: 12, duration: 0.6, ease: "power2.out",
        scrollTrigger: { trigger: ".clients-more", start: "top 92%" },
      });
    },
    { scope: ref }
  );

  return (
    <section
      id="clients"
      ref={ref}
      className="relative py-24 lg:py-32 bg-[var(--bg-inset)] text-white overflow-hidden"
    >
      {/* decorative grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1180px] px-6 lg:px-10">
        {/* header */}
        <div className="clients-heading flex items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="mono text-[11px] tracking-[0.25em] uppercase text-[var(--brand-teal-bright)]">
              {c.eyebrow}
            </div>
            <h2 className="clients-h2 mask-reveal mt-5 text-[clamp(1.7rem,3.2vw,2.7rem)] leading-[1.05] tracking-[-0.02em] font-medium">
              {titleParts[0]}
              {titleParts.length > 1 && (
                <>
                  {" "}
                  <span className="text-[var(--brand-teal-bright)]">
                    {titleParts.slice(1).join(" ")}
                  </span>
                </>
              )}
            </h2>
          </div>

          {/* quiet "in production" status chip */}
          <span className="mono shrink-0 mt-1 inline-flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-[var(--brand-teal-bright)]/90 border border-[var(--brand-teal-bright)]/30 rounded-full px-3 py-1.5">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--brand-teal-bright)] viz-pulse" />
            {c.status}
          </span>
        </div>

        {/* flagship engagements */}
        <div className="cl-featured mt-12 lg:mt-16 grid gap-4 sm:grid-cols-2">
          {featured.map((f, i) => (
            <div
              key={i}
              className="cl-card group relative flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 lg:p-8 transition-colors duration-300 hover:border-[var(--brand-teal-bright)]/40 hover:bg-white/[0.04]"
            >
              <div className="mono text-[10px] tracking-[0.24em] uppercase text-[var(--brand-teal-bright)]/90">
                {f.domain}
              </div>
              <div className="mt-4 text-[clamp(1.2rem,2vw,1.5rem)] leading-snug font-medium text-white/90 group-hover:text-white transition-colors duration-300">
                {f.org}
              </div>
              <div className="mt-auto pt-6">
                <div className="border-t border-white/[0.07] pt-4 mono text-[12px] leading-snug text-[var(--brand-teal-soft)]">
                  {f.system}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* condensed index of everything else in production */}
        <div className="cl-index mt-14 lg:mt-16">
          <div className="mono text-[10px] tracking-[0.24em] uppercase text-white/35 border-b border-white/12 pb-3">
            {c.indexLabel}
          </div>
          <ul className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {index.map((r, i) => (
              <li key={i} className="cl-index-item">
                <div className="text-[14px] leading-snug text-white/80">{r.org}</div>
                <div className="mt-1 mono text-[11.5px] leading-snug text-[var(--brand-teal-soft)]/75">
                  {r.system}
                </div>
              </li>
            ))}
          </ul>

          {/* and more — static note (no all-projects page to link to) */}
          <div className="clients-more mt-10 flex items-baseline gap-2.5">
            <span aria-hidden className="mono text-base leading-none text-[var(--brand-red)]">
              +
            </span>
            <span className="text-[15px] text-white/65">40 {c.more}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
