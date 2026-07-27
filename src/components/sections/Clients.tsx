import type { Dict } from "@/lib/dictionaries";
import { EyebrowBars, Starfield } from "./visuals";

/* ─── Clients — the full reference register, grouped by expertise ───
   Every named engagement in production, organised under the same four domains
   the pinned Expertise section walks through: the domain slides highlight two
   or three deliveries each, this is the whole list. Like About before it, a
   deliberate server component with no scroll choreography — a reference
   register should read instantly for the CIO skimming for a familiar name. */

export default function Clients({ dict }: { dict: Dict }) {
  const c = dict.clients;
  const x = dict.expertise;

  // Second sentence of the positioning line in a quieter tone.
  const titleParts = c.title.split(/(?<=\.)\s+/);

  // Org names only on the homepage — systems live on the domain subpages and
  // the expertise slides. Dedupe per group (an institution can run several
  // systems, e.g. Ministry of Finance).
  const groups = x.items.map((it) => ({
    ...it,
    orgs: [...new Set(it.clients.map((cl) => cl.org))],
  }));

  return (
    <section
      id="clients"
      className="relative overflow-hidden bg-[var(--bg-inset)] py-24 text-white lg:py-28"
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 70% 15%, #131b2e 0%, #0d111c 60%, #0d111c 100%)",
        }}
      />
      <Starfield count={70} seed={0x51b3} strength={0.5} bias={false} />

      <div className="relative z-10 mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="flex items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 text-[11px] font-medium tracking-[0.25em] uppercase text-[var(--brand-teal-bright)]">
              <EyebrowBars />
              {c.eyebrow}
            </div>
            <h2 className="font-display mt-5 text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.05] tracking-[-0.02em] font-medium">
              {titleParts[0]}
              {titleParts.length > 1 && (
                <>
                  <br className="hidden sm:block" />{" "}
                  <span className="text-white/55">{titleParts.slice(1).join(" ")}</span>
                </>
              )}
            </h2>
          </div>

          {/* quiet "in production" status chip */}
          <span className="mono mt-1 hidden shrink-0 items-center gap-2 rounded-full border border-[var(--brand-teal-bright)]/30 px-3 py-1.5 text-[10px] tracking-[0.22em] uppercase text-[var(--brand-teal-bright)]/90 sm:inline-flex">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--brand-teal-bright)]" />
            {c.status}
          </span>
        </div>

        {/* one register block per expertise domain */}
        <div className="mt-12 space-y-11 lg:mt-14">
          {groups.map((it) => (
            <div key={it.slug}>
              <div className="flex items-center gap-5">
                <h3 className="mono text-[10.5px] tracking-[0.3em] uppercase text-white/50">
                  {it.name}
                </h3>
                <span aria-hidden className="h-px flex-1 bg-white/10" />
              </div>
              {it.orgs.length > 0 ? (
                <ul className="mt-3 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
                  {it.orgs.map((org, i) => (
                    <li
                      key={i}
                      className="border-t border-white/[0.07] py-3 text-[14px] leading-snug text-white/80"
                    >
                      {org}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 mono text-[11px] tracking-[0.22em] uppercase text-white/40">
                  {x.comingSoon}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* and more — static note (no all-projects page to link to) */}
        <div className="mt-14 flex justify-center">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/[0.1] bg-white/[0.02] px-6 py-3">
            <span className="text-[15px] text-white/70">
              <span className="font-medium text-[var(--brand-teal-bright)]">+40</span> {c.more}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
