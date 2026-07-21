import type { Dict } from "@/lib/dictionaries";
import { EyebrowBars, Starfield } from "./visuals";

/* ─── About — the company itself ───
   The one section that talks about Infostream rather than its work: founded
   2004, private, ~60 delivered projects, certifications, named products.
   Deliberately a server component with no scroll choreography — this is the
   "boring credibility" block, and it should read instantly for the ministry
   CIO skimming for facts. Content facts come straight from the official
   company overview docs (no financials, no staff names — by request). */

export default function About({ dict }: { dict: Dict }) {
  const a = dict.about;
  return (
    <section id="about" className="relative overflow-hidden bg-[var(--bg-inset)] py-28 text-white lg:py-36">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 30% 20%, #131b2e 0%, #0d111c 60%, #0d111c 100%)",
        }}
      />
      <Starfield count={70} seed={0x40aa} strength={0.5} bias={false} />

      <div className="relative z-10 mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <div className="flex items-center gap-3 text-[11px] font-medium tracking-[0.25em] uppercase text-[var(--brand-teal-bright)]">
              <EyebrowBars />
              {a.eyebrow}
            </div>
            <h2 className="font-display mt-5 max-w-xl text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.05] tracking-[-0.02em] font-medium">
              {a.title}
            </h2>
            <p className="mt-6 max-w-xl text-[15.5px] leading-relaxed text-white/70">{a.body1}</p>
            <p className="mt-4 max-w-xl text-[15.5px] leading-relaxed text-white/70">{a.body2}</p>
          </div>

          <div className="lg:col-span-5 lg:col-start-8">
            <div className="mono text-[10px] tracking-[0.3em] uppercase text-white/45">{a.factsLabel}</div>
            <dl className="mt-4">
              {a.facts.map((f, i) => (
                <div
                  key={i}
                  className="flex items-baseline justify-between gap-6 border-t border-white/10 py-3.5"
                >
                  <dt className="mono text-[10.5px] tracking-[0.18em] uppercase text-white/45">{f.k}</dt>
                  <dd className="text-right text-[14.5px] leading-snug text-white/85">{f.v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-10 mono text-[10px] tracking-[0.3em] uppercase text-white/45">
              {a.productsLabel}
            </div>
            <ul className="mt-4 flex flex-wrap gap-2">
              {a.products.map((p) => (
                <li
                  key={p}
                  className="mono rounded-full border border-white/12 px-3.5 py-1.5 text-[11.5px] tracking-[0.04em] text-white/75"
                >
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
