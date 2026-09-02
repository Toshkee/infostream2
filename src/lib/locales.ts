// Single source of truth for the site's locales. Client-safe (no server-only
// imports) so the proxy, client components and server code all read the same
// list. Adding a locale: add it here, add src/lib/dict/<code>.json, and
// register the loader in dictionaries.ts — nothing else needs to change.

export const locales = ["eng", "mne"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "eng";

export const hasLocale = (locale: string): locale is Locale =>
  (locales as readonly string[]).includes(locale);

/** BCP 47 tag used for <html lang>, hreflang and sitemap alternates.
 *  Montenegrin's own code (cnr) is ISO 639-3, which hreflang does not accept,
 *  so it is declared as Serbian-as-used-in-Montenegro. */
export const htmlLang: Record<Locale, string> = { eng: "en", mne: "sr-ME" };

/** Open Graph locale (underscore form). */
export const ogLocale: Record<Locale, string> = { eng: "en_US", mne: "sr_ME" };

/** Endonyms for the language switcher — shown in the target language itself,
 *  which is why they are locale metadata rather than translated page copy. */
export const localeNames: Record<Locale, { native: string; switchLabel: string }> = {
  eng: { native: "English", switchLabel: "Switch to English" },
  mne: { native: "Crnogorski", switchLabel: "Pređi na crnogorski" },
};

/** hreflang map for one path across every locale, plus x-default. */
export function languageAlternates(pathFor: (locale: Locale) => string): Record<string, string> {
  return {
    ...Object.fromEntries(locales.map((l) => [htmlLang[l], pathFor(l)])),
    "x-default": pathFor(defaultLocale),
  };
}
