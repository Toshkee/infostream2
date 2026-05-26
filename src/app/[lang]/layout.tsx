import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { hasLocale, locales } from "@/lib/dictionaries";
import SmoothScroll from "@/components/providers/SmoothScroll";
import ScrollProgress from "@/components/layout/ScrollProgress";

const sans = Inter({
  variable: "--font-sans-stack",
  subsets: ["latin", "latin-ext"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono-stack",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Infostream — National financial infrastructure",
  description:
    "Custom financial software powering Montenegro's central bank, treasury, tax authority and ministries.",
};

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  return (
    <html lang={lang === "mne" ? "sr-ME" : "en"} className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <SmoothScroll>
          <ScrollProgress />
          {children}
        </SmoothScroll>
      </body>
    </html>
  );
}
