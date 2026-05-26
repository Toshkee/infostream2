import 'server-only';

const dictionaries = {
  eng: () => import('./dict/eng.json').then((m) => m.default),
  mne: () => import('./dict/mne.json').then((m) => m.default),
};

export type Locale = keyof typeof dictionaries;
export const locales: Locale[] = ['eng', 'mne'];
export const defaultLocale: Locale = 'eng';

export const hasLocale = (locale: string): locale is Locale =>
  locale in dictionaries;

export const getDictionary = async (locale: Locale) => dictionaries[locale]();

export type Dict = Awaited<ReturnType<typeof getDictionary>>;
