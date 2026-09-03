import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  defaultLocale,
  getDictionary,
  hasLocale,
  languageAlternates,
  locales,
  ogLocale,
} from "@/lib/dictionaries";
import { absoluteUrl, company } from "@/lib/company";
import { DomainArt, Icon, Starfield } from "@/components/sections/visuals";
import { ClientMark } from "@/components/sections/Clients";
import { CAP_ICONS } from "@/components/sections/expertiseMeta";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// One page per expertise domain (finance / hr / healthcare / dms). The
// homepage's pinned Expertise stop already carries the mock's headline +
// capability row + featured cards, so this page complements it rather than
// repeating it: the domain's longer narrative (item.body — used nowhere
// else) and the FULL client register as an org — system index. Content lives
// in dict.expertise.items; adding a domain there adds a page here.

// Mirrors visuals.tealPeriod, which lives in a "use client" module and so
// can't be called from this server component.
function accentPeriod(text: string): ReactNode {
  const m = text.match(/^([\s\S]*?)([.!?]+)$/);
  if (!m) return text;
  return (
    <>
      {m[1]}
      <span className="text-[var(--brand-teal-bright)]">{m[2]}</span>
    </>
  );
}

// Slugs come from the dictionary, so a domain added there gets a page here.
export async function generateStaticParams() {
  const dict = await getDictionary(defaultLocale);
  const domains = dict.expertise.items.map((it) => it.slug);
  return locales.flatMap((lang) => domains.map((domain) => ({ lang, domain })));
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
  const { lang, item } = resolved;
  const title = `${item.name} · Infostream`;
  const description = item.short;
  // Metadata merges per top-level key, so a page that only sets title +
  // description would inherit the LAYOUT's canonical/hreflang/og:url — every
  // domain page would then declare itself a duplicate of the homepage. The
  // slug is locale-independent, so the same path shape works for every locale.
  const path = (l: string) => `/${l}/expertise/${item.slug}`;
  const url = absoluteUrl(path(lang));
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: languageAlternates((l) => absoluteUrl(path(l))),
    },
    openGraph: {
      type: "website",
      url,
      siteName: company.name,
      title,
      description,
      locale: ogLocale[lang],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ExpertiseDomainPage(props: PageProps<"/[lang]/expertise/[domain]">) {
  const resolved = await resolveDomain(props.params);
  if (!resolved) notFound();
  const { lang, dict, item } = resolved;
  const x = dict.expertise;

  return (
    <>
    <Navbar nav={dict.nav} lang={lang} home={false} />
    <main
      id="main-content"
      tabIndex={-1}
      className="relative min-h-[100svh] overflow-hidden bg-[var(--bg-inset)] text-white outline-none"
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 60% at 60% 0%, #131b2e 0%, #0d111c 55%, #090c13 100%)",
        }}
      />
      <Starfield count={70} seed={0x3d0a} strength={0.5} bias={false} />

      <div className="relative mx-auto max-w-[1280px] px-6 pt-28 pb-28 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16 lg:px-10 lg:pt-32">
        {/* ── Domain rail ── */}
        <aside className="lg:sticky lg:top-28 lg:flex lg:h-fit lg:flex-col lg:self-start">
          {/* back to the homepage's expertise section */}
          <Link
            href={`/${lang}#expertise`}
            className="group inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.25em] uppercase text-[var(--brand-teal-bright)] transition-colors duration-300 hover:text-white"
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
            {x.eyebrow}
          </Link>

          <nav aria-label={x.eyebrow} className="mt-7 lg:mt-10">
            {/* horizontal scroll strip below lg; vertical rail with a hairline
               track and a teal current-page notch from lg up */}
            <ul className="-mx-6 flex gap-7 overflow-x-auto px-6 lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-l lg:border-white/10 lg:px-0">
              {x.items.map((d) => {
                const current = d.slug === item.slug;
                return (
                  <li key={d.slug} className="shrink-0">
                    <Link
                      href={`/${lang}/expertise/${d.slug}`}
                      aria-current={current ? "page" : undefined}
                      className={`block whitespace-nowrap py-2 text-[15.5px] leading-snug transition-colors duration-300 lg:-ml-px lg:border-l lg:py-3 lg:pl-6 ${
                        current
                          ? "text-white lg:border-[var(--brand-teal-bright)]"
                          : "text-white/40 hover:text-white lg:border-transparent"
                      }`}
                    >
                      {d.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* ── Domain content ── */}
        <section className="mt-12 lg:mt-0">
          <div className="text-[11px] font-medium tracking-[0.25em] uppercase text-[var(--brand-teal-bright)]">
            {item.name}
          </div>

          <div className="mt-5 grid gap-12 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-center xl:gap-16">
            <div>
              <h1 className="font-display max-w-2xl text-balance text-[clamp(2.2rem,4.6vw,3.6rem)] leading-[1.05] tracking-[-0.025em] font-medium">
                {accentPeriod(item.title)}
              </h1>
              {/* the long-form narrative — the homepage stop carries item.short
                 and the capability icon row; no need to repeat them here */}
              <p className="mt-6 max-w-2xl text-[15.5px] leading-relaxed text-white/65">
                {item.body}
              </p>

              {/* Capability row — the same hairline-divided icon + label
                 pairs as the homepage stop, so a visitor landing here
                 directly still gets the domain's scope at a glance. */}
              <div className="mt-9 grid max-w-2xl grid-cols-2 gap-y-6 sm:grid-flow-col sm:auto-cols-fr sm:gap-y-0">
                {item.capabilities.map((label, k) => (
                  <div
                    key={k}
                    className={`flex flex-col gap-2.5 pr-4 ${k > 0 ? "sm:border-l sm:border-white/10 sm:pl-4" : ""}`}
                  >
                    <Icon
                      name={(CAP_ICONS[item.slug] ?? [])[k] ?? "layers"}
                      className="h-5 w-5 text-[var(--brand-teal-bright)]"
                    />
                    <span className="text-[12.5px] leading-snug text-white/75">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden xl:flex xl:justify-center">
              <DomainArt slug={item.slug} />
            </div>
          </div>

          {/* Client register — every engagement in this domain, org — system.
             The homepage stop features a subset as cards; this is the index. */}
          <div className="mt-16 lg:mt-20">
            <div className="flex items-center gap-5">
              <span className="mono text-[10px] tracking-[0.3em] uppercase text-white/50">
                {x.clientsLabel}
              </span>
              <span aria-hidden className="h-px flex-1 bg-white/10" />
            </div>

            {item.clients.length > 0 ? (
              <ul className="mt-6">
                {item.clients.map((c, i) => (
                  <li key={i} className="flex items-center gap-4 border-t border-white/10 py-4">
                    <ClientMark org={c.org} index={i} />
                    <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                      <span className="text-[15px] font-medium leading-snug text-white/90">
                        {c.org}
                      </span>
                      <span className="text-[13px] leading-snug text-white/50 sm:text-right">
                        {c.system}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-8 mono text-[11px] tracking-[0.22em] uppercase text-white/40">
                {x.comingSoon}
              </p>
            )}
          </div>

          {/* No projects section here: the domain page exists to be the full
             client register behind the homepage's "all clients" link. Note the
             homepage Expertise stop's "projects" cards are built from
             item.clients, so item.projects currently renders NOWHERE — it
             stays in the dict as parked content only. */}

          {/* Closing call — the page's one action, in the process section's
             hairline register: a headline, the reply promise, the red CTA
             back to the homepage contact block, and the address for those
             who would rather write. */}
          <div className="mt-20 border-t border-white/10 pt-12 lg:mt-24 lg:pt-14">
            <h2 className="font-display max-w-xl text-balance text-[clamp(1.7rem,3vw,2.5rem)] leading-[1.06] tracking-[-0.025em] font-medium">
              {accentPeriod(x.ctaTitle)}
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/60">{dict.contact.body}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
              <Link
                href={`/${lang}#contact`}
                className="inline-block rounded-xl bg-[var(--brand-red)] px-6 py-3 text-[14px] font-medium text-white transition-colors duration-200 hover:bg-[var(--brand-red-deep)]"
                style={{ boxShadow: "0 1px 4px rgba(214,59,59,0.25)" }}
              >
                {dict.nav.cta}
              </Link>
              <a
                href={`mailto:${dict.contact.email}`}
                className="mono text-[12.5px] tracking-[0.06em] text-white/70 transition-colors duration-200 hover:text-[var(--brand-teal-bright)]"
              >
                {dict.contact.email}
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
    <Footer dict={dict} />
    </>
  );
}
