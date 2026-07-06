"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import type { Dict } from "@/lib/dictionaries";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Which client indices (into dict.clients.projects) belong to each domain group,
// in display order. This is structure, not copy — the translatable group LABELS
// live in dict.clients.groups (same order). Mirrors the "structure in code, copy
// in dict" split used elsewhere (e.g. STAGE_ICONS in PinnedHero). If the projects
// array is reordered in the dictionaries, update these indices to match.
const GROUP_INDICES: number[][] = [
  [2, 3, 5, 9, 14], // Defense, security & intelligence
  [0, 1, 8, 17], // Public finance & social
  [18, 4, 13, 7, 6], // Government & ministries
  [12, 15, 16], // EU & international
  [10, 11, 19], // Innovation & private sector
];

export default function Clients({ dict }: { dict: Dict }) {
  const ref = useRef<HTMLDivElement>(null);
  const c = dict.clients;
  const projects = c.projects;

  // Second sentence of the positioning line in teal.
  const titleParts = c.title.split(/(?<=\.)\s+/);

  // Build the grouped register, numbering continuously across every group.
  let n = 0;
  const groups = GROUP_INDICES.map((idxs, g) => ({
    label: c.groups[g] ?? "",
    rows: idxs.map((i) => ({ ...projects[i], num: ++n })),
  }));

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
      // Group blocks ease up first, their rows cascade just behind.
      gsap.from(".reg-group", {
        opacity: 0, y: 18, duration: 0.6, stagger: 0.08, ease: "power3.out",
        scrollTrigger: { trigger: ".clients-register", start: "top 82%" },
      });
      gsap.from(".reg-row", {
        opacity: 0, y: 10, duration: 0.45, stagger: 0.022, ease: "power2.out",
        scrollTrigger: { trigger: ".clients-register", start: "top 80%" },
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

        {/* register */}
        <div className="clients-register mt-12 lg:mt-16">
          {/* column header */}
          <div className="grid grid-cols-[2.25rem_1fr] md:grid-cols-[2.5rem_1.5fr_1fr] gap-x-4 border-b border-white/12 pb-3 mono text-[10px] tracking-[0.24em] uppercase text-white/35">
            <span aria-hidden />
            <span>{c.colOrg}</span>
            <span className="hidden md:block">{c.colSystem}</span>
          </div>

          {groups.map((grp, gi) => (
            <div key={gi} className="reg-group">
              {/* domain divider */}
              <div className="flex items-center gap-4 pt-7 pb-3">
                <span className="mono text-[11px] tracking-[0.22em] uppercase text-[var(--brand-teal-bright)] whitespace-nowrap">
                  {grp.label}
                </span>
                <span
                  aria-hidden
                  className="h-px flex-1 bg-gradient-to-r from-[var(--brand-teal-bright)]/30 to-transparent"
                />
              </div>

              {/* rows */}
              <ul>
                {grp.rows.map((r) => (
                  <li
                    key={r.num}
                    className="reg-row group grid grid-cols-[2.25rem_1fr] md:grid-cols-[2.5rem_1.5fr_1fr] items-baseline gap-x-4 gap-y-1 border-b border-white/[0.06] py-3 transition-colors duration-200 hover:bg-white/[0.02]"
                  >
                    <span className="mono text-[11px] tabular-nums text-white/30 transition-colors duration-200 group-hover:text-[var(--brand-teal-bright)]">
                      {String(r.num).padStart(2, "0")}
                    </span>
                    <span className="text-[14.5px] leading-snug text-white/85 transition-colors duration-200 group-hover:text-white">
                      {r.org}
                    </span>
                    <span className="col-start-2 md:col-start-3 mono text-[12px] leading-snug text-[var(--brand-teal-soft)]">
                      {r.system}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* and more — static note (no all-projects page to link to) */}
          <div className="clients-more mt-8 flex items-baseline gap-2.5">
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
