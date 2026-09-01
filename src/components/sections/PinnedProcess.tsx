import type { Dict } from "@/lib/dictionaries";

/*
 * The process is a delivery ledger, not another services list. Each stage is
 * given enough space to read as an accountable decision point, while the
 * staggered cut corners turn the four panels into one authored composition.
 */
export default function PinnedProcess({ dict }: { dict: Dict }) {
  const { platform } = dict;

  return (
    <section id="platform" className="relative overflow-hidden bg-[var(--bg-inset)] py-20 text-white sm:py-28 lg:py-36">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-20">
          <header className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="font-display max-w-lg text-[clamp(2.5rem,4.5vw,4.6rem)] font-medium leading-[0.98] tracking-[-0.04em]">
              {platform.title}
            </h2>
            <p className="mt-7 max-w-md text-[16px] leading-relaxed text-white/68">{platform.body}</p>
          </header>

          <ol className="grid gap-4 sm:gap-5" aria-label={platform.title}>
            {platform.stages.map((stage, index) => (
              <li key={stage.name}>
                <article
                  className={`relative overflow-hidden bg-[var(--bg-inset-elev)] px-6 py-6 sm:px-8 sm:py-8 lg:px-9 lg:py-9 ${
                    index % 2 ? "lg:ml-10" : "lg:mr-10"
                  }`}
                >
                  <div
                    aria-hidden
                    className="absolute right-0 top-0 h-12 w-12 bg-[var(--bg-inset)] [clip-path:polygon(100%_0,100%_100%,0_0)]"
                  />
                  <div className="max-w-xl">
                    <h3 className="font-display text-[clamp(1.65rem,2.5vw,2.35rem)] font-medium leading-[1] tracking-[-0.035em] text-white">
                      {stage.name}
                    </h3>
                    <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-white/67 sm:text-[15px]">
                      {stage.description}
                    </p>
                  </div>
                </article>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
