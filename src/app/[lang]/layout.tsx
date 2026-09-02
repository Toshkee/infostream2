import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import "../globals.css";
import {
  getDictionary,
  hasLocale,
  locales,
  htmlLang,
  ogLocale,
  languageAlternates,
} from "@/lib/dictionaries";
import { SITE_URL, absoluteUrl, company } from "@/lib/company";
import SmoothScroll from "@/components/providers/SmoothScroll";
import AssistantLoader from "@/components/AssistantLoader";
import { assistantEnabled } from "@/lib/assistantFlag";

const sans = Inter({
  variable: "--font-sans-stack",
  subsets: ["latin", "latin-ext"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono-stack",
  subsets: ["latin"],
});

// Display face for headlines — Author (Fontshare, free license), self-hosted.
// Covers Montenegrin Latin (č ć đ š ž — verified in the cmap before adding).
const display = localFont({
  variable: "--font-display-stack",
  src: [
    { path: "../fonts/Author-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/Author-Semibold.woff2", weight: "600", style: "normal" },
  ],
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
  const url = absoluteUrl(`/${lang}`);
  const { title, description, keywords } = dict.meta;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    applicationName: company.name,
    authors: [{ name: company.name, url: SITE_URL }],
    keywords,
    alternates: {
      canonical: url,
      languages: languageAlternates((l) => absoluteUrl(`/${l}`)),
    },
    openGraph: {
      type: "website",
      url,
      siteName: company.name,
      title,
      description,
      locale: ogLocale[lang],
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

// Escape "<" so no value can ever close an inline <script> tag early.
const inlineJson = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

export default async function RootLayout({
  children,
  params,
}: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.name,
    legalName: company.legalName,
    url: absoluteUrl(`/${lang}`),
    logo: absoluteUrl(company.logoPath),
    image: absoluteUrl(`/${lang}/opengraph-image`),
    email: dict.contact.email,
    description: dict.meta.description,
    foundingDate: company.foundingYear,
    address: {
      "@type": "PostalAddress",
      streetAddress: company.address.street,
      addressLocality: company.address.locality,
      postalCode: company.address.postalCode,
      addressCountry: company.address.countryCode,
    },
    areaServed: { "@type": "Country", name: "Montenegro" },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: dict.contact.phone,
      email: dict.contact.email,
      contactType: "customer support",
      availableLanguage: ["English", "Montenegrin"],
    },
    sameAs: [company.social.linkedin, company.social.facebook],
  };

  return (
    <html lang={htmlLang[lang]} className={`${sans.variable} ${mono.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full">
        <a href="#main-content" className="skip-link">{dict.a11y.skipToContent}</a>
        <SmoothScroll>
          {children}
        </SmoothScroll>
        {assistantEnabled() && <AssistantLoader copy={dict.assistant} lang={lang} />}
        <div className="grain-overlay" aria-hidden />
        {/* Copy for the [lang] error boundary. error.tsx is a client component
            that receives no route params and cannot load the dictionary, so
            the layout hands it the localised strings through this inert data
            block (type=application/json is never executed, so CSP is unaffected). */}
        <script
          id="i18n-error"
          type="application/json"
          dangerouslySetInnerHTML={{ __html: inlineJson(dict.errorPage) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: inlineJson(orgJsonLd) }}
        />
      </body>
    </html>
  );
}

export const viewport: Viewport = {
  themeColor: "#0d111c",
};
