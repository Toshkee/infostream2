import type { Dict } from "@/lib/dictionaries";

/*
 * A deliberately editorial process section. A single introduction leads into
 * full-width service rows, keeping the methodology easy to scan without
 * shipping animation or WebGL code for content that does not need interaction.
 */
export default function PinnedProcess({ dict }: { dict: Dict }) {
  const services = dict.services.items;

  return (
    <section
      id="platform"
      className="relative overflow-hidden border-t border-white/10 bg-[var(--bg-inset)] text-white"
    >
      <div className="mx-auto max-w-[1280px] px-6 py-16 sm:py-20 lg:px-10 lg:py-28">
        <header className="max-w-3xl">
          <p className="text-[10px] font-medium tracking-[0.28em] uppercase text-[var(--brand-teal-bright)]">
            {dict.services.eyebrow}
          </p>
          <h2 className="font-display mt-4 text-[clamp(2rem,4vw,3.6rem)] font-medium leading-[1.02] tracking-[-0.03em]">
            {dict.services.title}
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/62 max-sm:hidden">
            {dict.services.body}
          </p>
        </header>

        <div className="mt-10 border-t border-white/15 sm:mt-12 lg:mt-14">
          {services.map((service) => (
            <article
              key={service.k}
              className="grid gap-5 border-b border-white/15 py-7 sm:py-8 lg:grid-cols-[minmax(220px,0.72fr)_minmax(0,1.28fr)] lg:items-center lg:gap-16"
            >
              <div>
                <h3 className="font-display text-[clamp(1.45rem,2.2vw,2rem)] font-medium leading-[1.05] tracking-[-0.025em]">
                  {service.k}
                </h3>
                <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-white/55 max-sm:line-clamp-2">
                  {service.v}
                </p>
              </div>

              <ul className="flex flex-wrap gap-x-5 gap-y-2.5">
                {service.cards.map((card) => (
                  <li key={card.k} className="flex items-center gap-2 text-[11px] font-medium tracking-[0.1em] uppercase text-white/68">
                    <span aria-hidden className="h-1 w-1 rounded-full bg-[var(--brand-teal-bright)]" />
                    {card.k}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
