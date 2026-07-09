import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { getDictionary, hasLocale, locales } from "@/lib/dictionaries";
import SmoothScroll from "@/components/providers/SmoothScroll";
import ScrollProgress from "@/components/layout/ScrollProgress";
import Assistant from "@/components/Assistant";

const SITE = "https://infostream.co.me";

const sans = Inter({
  variable: "--font-sans-stack",
  subsets: ["latin", "latin-ext"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono-stack",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: LayoutProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  const url = `${SITE}/${lang}`;

  const title = lang === "mne"
    ? "Infostream — Nacionalna finansijska infrastruktura"
    : "Infostream — National financial infrastructure";
  const description = dict.meta.description;

  return {
    metadataBase: new URL(SITE),
    title,
    description,
    applicationName: "Infostream",
    authors: [{ name: "Infostream", url: SITE }],
    keywords: lang === "mne"
      ? ["Infostream", "Crna Gora", "finansijski softver", "ISO 27001", "Poreska uprava", "javni registri", "Fond PIO"]
      : ["Infostream", "Montenegro", "financial software", "ISO 27001", "public registers", "treasury", "tax authority"],
    alternates: {
      canonical: url,
      languages: {
        ...Object.fromEntries(
          locales.map((l) => [l === "mne" ? "sr-ME" : "en", `${SITE}/${l}`])
        ),
        "x-default": `${SITE}/eng`,
      },
    },
    openGraph: {
      type: "website",
      url,
      siteName: "Infostream",
      title,
      description,
      locale: lang === "mne" ? "sr_ME" : "en_US",
      // Image intentionally omitted — the file-based opengraph-image.tsx in this
      // segment generates the social card per locale.
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const skipLabel = lang === "mne" ? "Pređi na glavni sadržaj" : "Skip to main content";

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Infostream",
    legalName: "Infostream",
    url: `${SITE}/${lang}`,
    logo: `${SITE}/infostream-logo.webp`,
    image: `${SITE}/${lang}/opengraph-image`,
    email: dict.contact.email,
    description: dict.meta.description,
    foundingDate: "2004",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Rista Dragićevića 4",
      addressLocality: "Podgorica",
      postalCode: "81000",
      addressCountry: "ME",
    },
    areaServed: { "@type": "Country", name: "Montenegro" },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: dict.contact.phone,
      email: dict.contact.email,
      contactType: "customer support",
      availableLanguage: ["English", "Montenegrin"],
    },
    sameAs: ["https://www.linkedin.com/company/infostream"],
  };

  return (
    <html lang={lang === "mne" ? "sr-ME" : "en"} className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <a href="#main-content" className="skip-link">{skipLabel}</a>
        <SmoothScroll>
          <ScrollProgress />
          {children}
        </SmoothScroll>
        <Assistant dict={dict} lang={lang} />
        <div className="grain-overlay" aria-hidden />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </body>
    </html>
  );
}

export const viewport: Viewport = {
  themeColor: "#0d111c",
};
