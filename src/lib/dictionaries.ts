import 'server-only';
import { type Locale } from './locales';

export { locales, defaultLocale, hasLocale, htmlLang, ogLocale, localeNames, languageAlternates, type Locale } from './locales';

const dictionaries: Record<Locale, () => Promise<typeof import('./dict/eng.json')>> = {
  eng: () => import('./dict/eng.json').then((m) => m.default),
  mne: () => import('./dict/mne.json').then((m) => m.default),
};

export const getDictionary = async (locale: Locale) => dictionaries[locale]();

export type Dict = Awaited<ReturnType<typeof getDictionary>>;
