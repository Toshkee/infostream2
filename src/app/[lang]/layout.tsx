import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { getDictionary, hasLocale, locales } from "@/lib/dictionaries";
import SmoothScroll from "@/components/providers/SmoothScroll";
import ScrollProgress from "@/components/layout/ScrollProgress";

const SITE = "https://infostream.me";

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
  const description = dict.hero.body;

  return {
    metadataBase: new URL(SITE),
    title,
    description,
    applicationName: "Infostream",
    authors: [{ name: "Infostream", url: SITE }],
    keywords: lang === "mne"
      ? ["Infostream", "Crna Gora", "finansijski softver", "ISO 27001", "Centralna banka", "Poreska uprava"]
      : ["Infostream", "Montenegro", "financial software", "ISO 27001", "central bank", "treasury", "tax authority"],
    alternates: {
      canonical: url,
      languages: Object.fromEntries(
        locales.map((l) => [l === "mne" ? "sr-ME" : "en", `${SITE}/${l}`])
      ),
    },
    openGraph: {
      type: "website",
      url,
      siteName: "Infostream",
      title,
      description,
      locale: lang === "mne" ? "sr_ME" : "en_US",
      images: [{ url: "/infostream-logo.webp", width: 1200, height: 630, alt: "Infostream" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/infostream-logo.webp"],
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

  const skipLabel = lang === "mne" ? "Pređi na glavni sadržaj" : "Skip to main content";

  return (
    <html lang={lang === "mne" ? "sr-ME" : "en"} className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <a href="#main-content" className="skip-link">{skipLabel}</a>
        <SmoothScroll>
          <ScrollProgress />
          {children}
        </SmoothScroll>
        <div className="grain-overlay" aria-hidden />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Infostream",
              url: SITE,
              logo: `${SITE}/infostream-logo.webp`,
              email: "contact@infostream.me",
              address: {
                "@type": "PostalAddress",
                streetAddress: "Bulevar Svetog Petra Cetinjskog",
                addressLocality: "Podgorica",
                addressCountry: "ME",
              },
              sameAs: [],
            }),
          }}
        />
      </body>
    </html>
  );
}

export const viewport = {
  themeColor: "#0d111c",
};
