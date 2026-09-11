"use client";

import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";
import type { Dict, Locale } from "@/lib/dictionaries";
import { DomainArt, EyebrowBars, Icon, Starfield, tealPeriod } from "./visuals";
import { ClientMark } from "./Clients";
import { CAP_ICONS } from "./expertiseMeta";

const FEATURED: Record<string, number[]> = {
  finance: [0, 1, 6],
  hr: [0, 1, 2],
  healthcare: [],
  dms: [0, 1],
};

export default function Expertise({ expertise: x, lang }: { expertise: Dict["expertise"]; lang: Locale }) {
  const [active, setActive] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % x.items.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + x.items.length) % x.items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = x.items.length - 1;
    else return;
    event.preventDefault();
    setActive(next);
    buttons.current[next]?.focus({ preventScroll: true });
  }

  return (
    <section id="expertise" className="relative overflow-hidden bg-[var(--bg-inset)] py-16 text-white sm:py-24">
      <noscript><style>{`.expertise-selector{display:none!important}.expertise-layout{display:block!important}.expertise-panel{visibility:visible!important;grid-area:auto!important;margin-top:2rem}`}</style></noscript>
      <Starfield count={65} seed={0x21c7} strength={0.45} bias={false} className="hidden sm:block" />
      <div className="relative mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="flex items-center gap-3 text-[11px] font-medium tracking-[0.25em] uppercase text-[var(--brand-teal-bright)]"><EyebrowBars />{x.eyebrow}</div>
        <h2 className="mt-5 max-w-3xl text-[clamp(1.7rem,3.2vw,2.7rem)] leading-[1.05] tracking-[-0.02em] font-medium">{tealPeriod(x.title)}</h2>
        <p className="mt-4 hidden max-w-2xl text-[15.5px] leading-relaxed text-white/65 sm:block">{x.body}</p>

        <div className="expertise-layout mt-9 lg:mt-12 lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-12">
          <div className="expertise-selector mb-8 hidden gap-2 sm:flex lg:mb-0 lg:flex-col lg:self-start" role="tablist" aria-label={x.eyebrow}>
            {x.items.map((it, i) => (
              <button
                key={it.slug}
                ref={(el) => { buttons.current[i] = el; }}
                id={`domain-tab-${it.slug}`}
                role="tab"
                aria-selected={active === i}
                aria-controls={`domain-panel-${it.slug}`}
                tabIndex={active === i ? 0 : -1}
                onClick={() => setActive(i)}
                onKeyDown={(event) => navigate(event, i)}
                className={`min-h-12 rounded-lg border px-4 py-3 text-left text-[14px] transition-colors ${active === i ? "border-[var(--brand-teal-bright)]/30 bg-[var(--brand-teal-bright)]/10 text-[var(--brand-teal-bright)]" : "border-transparent text-white/65 hover:bg-white/5 hover:text-white"}`}
              >{it.name}</button>
            ))}
          </div>

          <div className="sm:grid">
            {x.items.map((it, i) => {
              const shown = (FEATURED[it.slug] ?? []).flatMap((k) => it.clients[k] ?? []);
              return (
                <div
                  key={it.slug}
                  id={`domain-panel-${it.slug}`}
                  role="tabpanel"
                  tabIndex={0}
                  aria-labelledby={`domain-heading-${it.slug}`}
                  className={`expertise-panel border-t border-white/10 py-7 sm:col-start-1 sm:row-start-1 sm:border-0 sm:py-0 ${active === i ? "" : "sm:invisible"}`}
                >
                  <div className="flex items-start gap-5 md:gap-10">
                    <div className="min-w-0 flex-1">
                      <div className="mono text-[10px] tracking-[0.22em] uppercase text-white/50">{it.name}</div>
                      <h3 id={`domain-heading-${it.slug}`} className="font-display mt-3 max-w-2xl text-[clamp(1.45rem,2.8vw,2.4rem)] leading-[1.08] tracking-[-0.02em] font-medium">{it.title}</h3>
                      <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-white/65 sm:text-[15px]">{it.short}</p>
                    </div>
                    <div aria-hidden className="w-[64px] shrink-0 opacity-80 sm:hidden xl:block xl:w-[190px]"><DomainArt slug={it.slug} /></div>
                  </div>
                  <ul className="mt-6 grid grid-cols-2 gap-x-5 gap-y-3 sm:flex sm:flex-wrap sm:gap-5">
                    {it.capabilities.map((label, k) => (
                      <li key={label} className="flex items-center gap-2 text-[12px] text-white/75">
                        <Icon name={(CAP_ICONS[it.slug] ?? [])[k] ?? "layers"} className="h-4 w-4 shrink-0 text-[var(--brand-teal-bright)]" />{label}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 hidden sm:block">
                    <p className="mono text-[10px] uppercase tracking-[0.2em] text-white/50">{x.projectsLabel}</p>
                    {shown.length > 0 ? (
                      <ul className="mt-3 grid gap-3 md:grid-cols-3">
                        {shown.map((c, j) => (
                          <li key={c.org + c.system} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                            <ClientMark org={c.org} index={j} />
                            <p className="mt-3 text-[13px] leading-snug text-white/90">{c.org}</p>
                            <p className="mt-2 text-[12px] leading-relaxed text-white/60">{c.system}</p>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="mt-3 text-[13px] text-white/60">{x.comingSoon}</p>}
                  </div>
                  <Link href={`/${lang}/expertise/${it.slug}`} className="mt-6 inline-flex min-h-11 items-center gap-3 text-[13px] text-[var(--brand-teal-bright)] hover:underline">
                    {x.allClientsIn.replace("{domain}", it.name)}<span aria-hidden>↗</span>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
