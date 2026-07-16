"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { maskReveal } from "@/lib/maskReveal";
import { useRef, type ReactNode } from "react";
import type { Dict } from "@/lib/dictionaries";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Flagship engagements shown as large cards: index into dict.clients.projects
// plus the category label to show as the card eyebrow (index into
// dict.clients.categories). This is structure, not copy — the translatable
// labels live in the dictionaries ("structure in code, copy in dict", as
// elsewhere). Everything not featured falls into the icon index below, in
// dict order.
const FEATURED: { project: number; cat: number }[] = [
  { project: 1, cat: 0 }, // Tax Administration — Public finance
  { project: 2, cat: 1 }, // Ministry of Defense — Defense & security
  { project: 3, cat: 2 }, // Parliament — Government
  { project: 15, cat: 3 }, // EU Assistance Funds CFCU — EU projects
  { project: 4, cat: 4 }, // Ministry of Interior — Public security
  { project: 17, cat: 2 }, // Government of Montenegro — Government
  { project: 0, cat: 5 }, // Pension & Disability Insurance Fund — Social insurance
  { project: 18, cat: 6 }, // ERSTE Bank — Financial sector
];

// EU-flag style ring of dots, shared by two icons below.
const EU_DOTS = (
  <>
    {[
      [12, 5.5],
      [16.6, 7.4],
      [18.5, 12],
      [16.6, 16.6],
      [12, 18.5],
      [7.4, 16.6],
      [5.5, 12],
      [7.4, 7.4],
    ].map(([cx, cy], i) => (
      <circle key={i} cx={cx} cy={cy} r="1.1" fill="currentColor" stroke="none" />
    ))}
  </>
);

const LANDMARK = (
  <>
    <path d="M12 2.5 20 7.5H4z" />
    <path d="M6 7.5v9.5M10 7.5V17M14 7.5V17M18 7.5V17" />
    <path d="M4.5 17h15M3 20.5h18" />
  </>
);

const SHIELD = <path d="M12 3 19 6v5.5c0 4.2-2.9 7-7 9-4.1-2-7-4.8-7-9V6z" />;

// One line icon per featured card, 24×24 stroke space — order matches FEATURED.
const CARD_ICONS: ReactNode[] = [
  LANDMARK, // Tax Administration
  SHIELD, // Ministry of Defense
  LANDMARK, // Parliament
  EU_DOTS, // CFCU
  // Ministry of Interior — shield with keyhole dot
  <>
    {SHIELD}
    <circle cx="12" cy="10.5" r="2.4" />
  </>,
  // Government — building with flag
  <>
    <path d="M5 20.5V10.5h14v10" />
    <path d="M3 20.5h18M10.5 20.5v-4.5h3v4.5" />
    <path d="M12 10.5V3h4.5L15 4.75l1.5 1.75H12" />
  </>,
  // Pension Fund — people
  <>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19v-.5a4 4 0 0 1 4-4h3a4 4 0 0 1 4 4v.5" />
    <path d="M15.5 5.7a3 3 0 0 1 0 4.6M17.5 14.7a4 4 0 0 1 2 3.3v1" />
  </>,
  LANDMARK, // ERSTE Bank
];

// Small icons for the "also in production" index, applied by position.
const INDEX_ICONS: ReactNode[] = [
  // map pin
  <>
    <path d="M12 21s-6.5-5.3-6.5-10.2A6.5 6.5 0 0 1 12 4.3a6.5 6.5 0 0 1 6.5 6.5C18.5 15.7 12 21 12 21z" />
    <circle cx="12" cy="10.8" r="2.3" />
  </>,
  // open book
  <>
    <path d="M12 6.5C10.5 5.2 8.5 4.6 6 4.6c-1.2 0-2.3.14-3 .4v14c.7-.26 1.8-.4 3-.4 2.5 0 4.5.6 6 1.9 1.5-1.3 3.5-1.9 6-1.9 1.2 0 2.3.14 3 .4V5c-.7-.26-1.8-.4-3-.4-2.5 0-4.5.6-6 1.9z" />
    <path d="M12 6.5v14" />
  </>,
  // pie chart
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 3.5V12l6 6" />
  </>,
  // documents
  <>
    <rect x="8" y="6.5" width="12" height="14.5" rx="2" />
    <path d="M16 3H6a2 2 0 0 0-2 2v12.5" />
    <path d="M11.5 12h5M11.5 16h3.5" />
  </>,
  // lightbulb
  <>
    <path d="M9 18.5h6M10.25 21.5h3.5" />
    <path d="M12 2.5a6 6 0 0 0-4 10.5c.8.7 1.3 1.5 1.5 2.5h5c.2-1 .7-1.8 1.5-2.5a6 6 0 0 0-4-10.5z" />
  </>,
  // globe
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17" />
    <path d="M12 3.5c2.5 2.3 3.8 5.2 3.8 8.5s-1.3 6.2-3.8 8.5c-2.5-2.3-3.8-5.2-3.8-8.5s1.3-6.2 3.8-8.5z" />
  </>,
  EU_DOTS,
  // bolt
  <>
    <path d="M13 2.5 4 14h6.5l-1 7.5L19 10h-6.5z" />
  </>,
  // anchor
  <>
    <circle cx="12" cy="5.5" r="2.5" />
    <path d="M12 8v13.5" />
    <path d="M5 12H2.5a9.5 9.5 0 0 0 19 0H19" />
  </>,
  EU_DOTS,
  // person
  <>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20.5v-.5a7 7 0 0 1 14 0v.5" />
  </>,
];

export default function Clients({ dict }: { dict: Dict }) {
  const ref = useRef<HTMLDivElement>(null);
  const c = dict.clients;

  // Second sentence of the positioning line in teal.
  const titleParts = c.title.split(/(?<=\.)\s+/);

  const featured = FEATURED.map(({ project, cat }) => ({
    ...c.projects[project],
    category: c.categories[cat] ?? "",
  }));
  const featuredIdx = new Set(FEATURED.map((f) => f.project));
  const index = c.projects.filter((_, i) => !featuredIdx.has(i));

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) return;

      maskReveal(".clients-h2");
      gsap.from(".cl-card", {
        opacity: 0, y: 26, duration: 0.8, stagger: 0.08, ease: "power3.out",
        scrollTrigger: { trigger: ".cl-featured", start: "top 80%" },
      });
      gsap.from(".cl-index-item", {
        opacity: 0, y: 10, duration: 0.45, stagger: 0.04, ease: "power2.out",
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
      <div className="relative z-10 mx-auto max-w-[1280px] px-6 lg:px-10">
        {/* header */}
        <div className="clients-heading flex items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="text-[11px] font-medium tracking-[0.25em] uppercase text-[var(--brand-teal-bright)]">
              {c.eyebrow}
            </div>
            <h2 className="clients-h2 mask-reveal mt-5 text-[clamp(1.7rem,3.2vw,2.7rem)] leading-[1.05] tracking-[-0.02em] font-medium">
              {titleParts[0]}
              {titleParts.length > 1 && (
                <>
                  <br className="hidden sm:block" />
                  {/* tonal emphasis, not a saturated accent pop */}
                  <span className="text-white/55">
                    {titleParts.slice(1).join(" ")}
                  </span>
                </>
              )}
            </h2>
          </div>

          {/* quiet "in production" status chip */}
          <span className="mono shrink-0 mt-1 inline-flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-[var(--brand-teal-bright)]/90 border border-[var(--brand-teal-bright)]/30 rounded-full px-3 py-1.5">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--brand-teal-bright)]" />
            {c.status}
          </span>
        </div>

        {/* flagship engagements */}
        <div className="cl-featured mt-12 lg:mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((f, i) => (
            <div
              key={i}
              className="cl-card group relative flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-colors duration-300 hover:border-[var(--brand-teal-bright)]/40 hover:bg-white/[0.04]"
            >
              <div className="flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.01] text-[var(--brand-teal-bright)]">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    {CARD_ICONS[i]}
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="mono text-[9.5px] tracking-[0.22em] uppercase text-[var(--brand-teal-bright)]/90">
                    {f.category}
                  </div>
                  <div className="mt-1.5 text-[15.5px] font-medium leading-snug text-white/90 transition-colors duration-300 group-hover:text-white">
                    {f.org}
                  </div>
                  <div className="mt-2 text-[12.5px] leading-snug text-white/50">{f.system}</div>
                </div>
              </div>
              <div className="mt-auto pt-5">
                <div className="flex items-center justify-between border-t border-white/[0.07] pt-3.5">
                  <span className="mono inline-flex items-center gap-2 text-[9px] tracking-[0.2em] uppercase text-[var(--brand-teal-bright)]/80">
                    <span aria-hidden className="h-1 w-1 rounded-full bg-[var(--brand-teal-bright)]" />
                    {c.status}
                  </span>
                  {/* diagonal up-right arrow — not the stock horizontal → */}
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 text-white/50 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--brand-teal-bright)]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M7 17 17 7M9 7h8v8" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* index of everything else in production */}
        <div className="cl-index mt-14 lg:mt-16">
          <div className="flex items-center gap-5">
            <span aria-hidden className="h-px flex-1 bg-white/10" />
            <span className="mono text-[10px] tracking-[0.3em] uppercase text-white/60">
              {c.indexLabel}
            </span>
            <span aria-hidden className="h-px flex-1 bg-white/10" />
          </div>

          <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, col) => (
              <ul
                key={col}
                className={`flex flex-col gap-6 ${col > 0 ? "lg:border-l lg:border-white/[0.07] lg:pl-10" : ""}`}
              >
                {index.slice(col * 3, col * 3 + 3).map((r, j) => {
                  const i = col * 3 + j;
                  return (
                    <li key={i} className="cl-index-item flex items-center gap-3.5">
                      <span className="shrink-0 text-[var(--brand-teal-bright)]/90">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-[22px] w-[22px]"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          {INDEX_ICONS[i % INDEX_ICONS.length]}
                        </svg>
                      </span>
                      <span className="text-[14px] leading-snug text-white/80">{r.org}</span>
                    </li>
                  );
                })}
              </ul>
            ))}
          </div>
        </div>

        {/* and more — static note (no all-projects page to link to) */}
        <div className="clients-more mt-14 flex justify-center">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/[0.1] bg-white/[0.02] px-6 py-3">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-[var(--brand-teal-bright)]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden
            >
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 8.5v7M8.5 12h7" />
            </svg>
            <span className="text-[15px] text-white/70">
              <span className="font-medium text-[var(--brand-teal-bright)]">+40</span> {c.more}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
