import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getDictionary,
  hasLocale,
  languageAlternates,
  locales,
  ogLocale,
} from "@/lib/dictionaries";
import { absoluteUrl, company } from "@/lib/company";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// Privacy notice. Plain prose from dict.privacy; the only page that says what
// the site does with visitor data (nothing, except the assistant, which
// relays messages to Gemini). Linked from the footer and the chat widget.

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

const path = (l: string) => `/${l}/privacy`;

export async function generateMetadata(props: PageProps<"/[lang]/privacy">): Promise<Metadata> {
  const { lang } = await props.params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  const title = `${dict.privacy.eyebrow} · Infostream`;
  const description = dict.privacy.intro;
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
    twitter: { card: "summary", title, description },
  };
}

export default async function PrivacyPage(props: PageProps<"/[lang]/privacy">) {
  const { lang } = await props.params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const p = dict.privacy;

  return (
    <>
      <Navbar nav={dict.nav} lang={lang} home={false} />
      <main
        id="main-content"
        tabIndex={-1}
        className="relative min-h-[100svh] bg-[var(--bg-inset)] text-white outline-none"
      >
        <div className="mx-auto max-w-[720px] px-6 pt-28 pb-28 lg:pt-32">
          <Link
            href={`/${lang}`}
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
            {p.back}
          </Link>

          <p className="mt-12 text-[11px] font-medium tracking-[0.25em] uppercase text-white/55">{p.eyebrow}</p>
          <h1 className="mt-4 text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.02] tracking-[-0.03em] font-medium">
            {p.title}
          </h1>
          <p className="mt-6 text-[17px] leading-relaxed text-white/75">{p.intro}</p>
          <p className="mt-4 mono text-[11px] tracking-[0.14em] uppercase text-white/45">
            {p.updatedLabel}: {p.updated}
          </p>

          <div className="mt-14 space-y-12 border-t border-white/10 pt-12">
            {p.sections.map((s) => (
              <section key={s.heading}>
                <h2 className="text-[1.35rem] leading-tight tracking-[-0.02em] font-medium">{s.heading}</h2>
                <p className="mt-3 text-[15.5px] leading-relaxed text-white/70">{s.body}</p>
              </section>
            ))}
          </div>

          <div className="mt-14 border-t border-white/10 pt-8 text-[15px] leading-relaxed text-white/70">
            <div>{company.name}</div>
            <div>{dict.contact.office}</div>
            <a
              href={`mailto:${dict.contact.email}`}
              className="mt-2 inline-block mono text-[12px] tracking-[0.1em] text-white transition-colors hover:text-[var(--brand-teal-bright)]"
            >
              {dict.contact.email}
            </a>
          </div>
        </div>
      </main>
      <Footer dict={dict} lang={lang} />
    </>
  );
}
