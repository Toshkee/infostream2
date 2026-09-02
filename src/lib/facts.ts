import 'server-only';
import type { Locale } from './locales';

// The assistant's FACT BRIEF: company knowledge that is fed to the chatbot
// but is not rendered on any page (page copy comes from src/lib/dict and is
// added to the prompt separately). Kept apart from the dictionaries so it is
// obvious what the bot knows and nobody prunes it as "unused" keys.
//
// Rules for editing src/lib/facts/*.json:
//  - only verifiable facts from the official company documents;
//  - never revenues, financials, or names of staff;
//  - keep eng.json and mne.json structurally identical (`npm run check`).

const facts: Record<Locale, () => Promise<typeof import('./facts/eng.json')>> = {
  eng: () => import('./facts/eng.json').then((m) => m.default),
  mne: () => import('./facts/mne.json').then((m) => m.default),
};

export const getAssistantFacts = async (locale: Locale) => facts[locale]();

export type AssistantFacts = Awaited<ReturnType<typeof getAssistantFacts>>;
