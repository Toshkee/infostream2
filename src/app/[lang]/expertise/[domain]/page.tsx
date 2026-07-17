import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale, locales } from "@/lib/dictionaries";

// One page per expertise domain (finance / hr / healthcare / dms) — the full
// client list behind the homepage's pinned Expertise section. Deliberately
// quiet: back link, title, body, client index. Content lives in
// dict.expertise.items; adding a domain there adds a page here.

const DOMAINS = ["finance", "hr", "healthcare", "dms"] as const;

export function generateStaticParams() {
  return locales.flatMap((lang) => DOMAINS.map((domain) => ({ lang, domain })));
}

async function resolveDomain(params: PageProps<"/[lang]/expertise/[domain]">["params"]) {
  const { lang, domain } = await params;
  if (!hasLocale(lang)) return null;
  const dict = await getDictionary(lang);
  const item = dict.expertise.items.find((it) => it.slug === domain);
  if (!item) return null;
  return { lang, dict, item };
}

export async function generateMetadata(
  props: PageProps<"/[lang]/expertise/[domain]">
): Promise<Metadata> {
  const resolved = await resolveDomain(props.params);
  if (!resolved) return {};
  return {
    title: `${resolved.item.name} — Infostream`,
    description: resolved.item.short,
  };
}

export default async function ExpertiseDomainPage(props: PageProps<"/[lang]/expertise/[domain]">) {
  const resolved = await resolveDomain(props.params);
  if (!resolved) notFound();
  const { lang, dict, item } = resolved;
  const x = dict.expertise;

  return (
    <main className="relative min-h-[100svh] bg-[var(--bg-inset)] text-white">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 60% at 50% 0%, #131b2e 0%, #0d111c 55%, #090c13 100%)",
        }}
      />

      <div className="relative mx-auto max-w-[900px] px-6 pt-14 pb-28 lg:px-10">
        {/* back to the homepage's expertise section */}
        <Link
          href={`/${lang}#expertise`}
          className="group inline-flex items-center gap-2.5 text-[12px] tracking-[0.06em] text-white/55 transition-colors duration-300 hover:text-white"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M19 12H5m6-7-7 7 7 7" />
          </svg>
          {x.backLabel}
        </Link>

        <div className="mt-16 text-[11px] font-medium tracking-[0.25em] uppercase text-[var(--brand-teal-bright)]">
          {x.eyebrow}
        </div>
        <h1 className="font-display mt-5 text-[clamp(2.4rem,6vw,4.2rem)] leading-[1.0] tracking-[-0.028em] font-medium">
          {item.name}
        </h1>
        <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-white/70">{item.body}</p>

        {item.clients.length > 0 ? (
          <div className="mt-16">
            <div className="flex items-center gap-5">
              <span className="mono text-[10px] tracking-[0.3em] uppercase text-white/50">
                {x.clientsLabel}
              </span>
              <span aria-hidden className="h-px flex-1 bg-white/10" />
              <span className="mono inline-flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-[var(--brand-teal-bright)]/90">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--brand-teal-bright)]" />
                {x.status}
              </span>
            </div>
            <ul className="mt-8">
              {item.clients.map((c, i) => (
                <li
                  key={i}
                  className="flex flex-col gap-1 border-t border-white/10 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                >
                  <span className="text-[15.5px] font-medium leading-snug text-white/90">{c.org}</span>
                  <span className="text-[13px] leading-snug text-white/50 sm:text-right">{c.system}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-16 mono text-[11px] tracking-[0.22em] uppercase text-white/40">{x.comingSoon}</p>
        )}
      </div>
    </main>
  );
}
