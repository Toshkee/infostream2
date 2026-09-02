// Verifiable, locale-independent company facts. Everything here comes from
// the official company overview documents; anything a visitor could read on
// the page in one language lives in the dictionaries instead.
//
// Consumed by: the JSON-LD Organization schema (layout), sitemap/robots,
// and the assistant's fact brief. Change a fact here and it changes everywhere.

export const SITE_URL = "https://infostream.co.me";

export const company = {
  name: "Infostream",
  legalName: "Infostream",
  foundingYear: "2004",
  logoPath: "/infostream-logo.webp",
  address: {
    street: "Rista Dragićevića 4",
    locality: "Podgorica",
    postalCode: "81000",
    countryCode: "ME",
  },
  /** Roughly sixty systems delivered since founding — the figure the
   *  overview documents state. Keep as a rounded public figure. */
  systemsDelivered: "60+",
  social: {
    linkedin: "https://www.linkedin.com/company/845063",
    facebook: "https://www.facebook.com/InfoStream.MN",
  },
} as const;

/** Absolute URL for a site path such as "/eng" or "/eng/expertise/finance". */
export const absoluteUrl = (path: string) => `${SITE_URL}${path}`;
