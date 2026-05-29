import type { MetadataRoute } from "next";
import { locales } from "@/lib/dictionaries";

const SITE = "https://infostream.me";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return locales.map((lang) => ({
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
}
