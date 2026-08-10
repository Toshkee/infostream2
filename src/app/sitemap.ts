import type { MetadataRoute } from "next";
import { locales } from "@/lib/dictionaries";

const SITE = "https://infostream.co.me";

const DOMAINS = ["finance", "hr", "dms", "healthcare"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const home: MetadataRoute.Sitemap = locales.map((lang) => ({
    url: `${SITE}/${lang}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: lang === "eng" ? 1 : 0.9,
    alternates: {
      languages: {
        ...Object.fromEntries(
          locales.map((l) => [l === "mne" ? "sr-ME" : "en", `${SITE}/${l}`])
        ),
        "x-default": `${SITE}/eng`,
      },
    },
  }));
  const domains: MetadataRoute.Sitemap = locales.flatMap((lang) =>
    DOMAINS.map((domain) => ({
      url: `${SITE}/${lang}/expertise/${domain}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
      alternates: {
        languages: {
          ...Object.fromEntries(
            locales.map((l) => [
              l === "mne" ? "sr-ME" : "en",
              `${SITE}/${l}/expertise/${domain}`,
            ])
          ),
          "x-default": `${SITE}/eng/expertise/${domain}`,
        },
      },
    }))
  );
  return [...home, ...domains];
}
