import type { MetadataRoute } from "next";
import { defaultLocale, getDictionary, locales, languageAlternates, type Locale } from "@/lib/dictionaries";
import { absoluteUrl } from "@/lib/company";

// Expertise slugs come from the dictionary (dict.expertise.items[].slug) so a
// new domain added there is listed here without a second edit.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const dict = await getDictionary(defaultLocale);
  const domains = dict.expertise.items.map((it) => it.slug);

  const entry = (
    path: (lang: Locale) => string,
    lang: Locale,
    priority: number
  ): MetadataRoute.Sitemap[number] => ({
    url: absoluteUrl(path(lang)),
    changeFrequency: "monthly",
    priority,
    alternates: { languages: languageAlternates((l) => absoluteUrl(path(l))) },
  });

  return [
    ...locales.map((lang) => entry((l) => `/${l}`, lang, lang === defaultLocale ? 1 : 0.9)),
    ...locales.flatMap((lang) =>
      domains.map((domain) => entry((l) => `/${l}/expertise/${domain}`, lang, 0.6))
    ),
  ];
}
