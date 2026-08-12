import Link from "next/link";
import Image from "next/image";
import type { Dict, Locale } from "@/lib/dictionaries";
import { EyebrowBars, Starfield, Icon, type IconName } from "./visuals";

/* ─── Clients — dark positioning band + one light card per expertise ───
   The register is grouped under the same four domains the pinned Expertise
   section walks through: each card carries the domain blurb, the deduped org
   list as monogram entries, and a link to the domain subpage where the full
   org — system pairs live. Like About before it, a deliberate server
   component with no scroll choreography — a reference register should read
   instantly for the CIO skimming for a familiar name.

   Teal is rationed on the light cards: the card outline and the footer link
   carry it; icons and monogram marks stay neutral so the four-up grid reads
   calm rather than branded. */

const DOMAIN_ICON: Record<string, IconName> = {
  finance: "landmark",
  hr: "users",
  healthcare: "activity",
  dms: "fileText",
};

/* Language-neutral short names for the footer links, so "View clients in …"
   stays on one line; the rest use the localized domain name as-is. */
const DOMAIN_ABBR: Record<string, string> = { hr: "HR", dms: "DMS" };

/* Sparse cards sink to the end: healthcare has no public references yet. */
const DOMAIN_ORDER = ["finance", "hr", "dms", "healthcare"];

/* Cap of featured orgs per card; the domain subpage holds the rest. */
const SHOWN_MAX = 6;

export default function Clients({ dict, lang }: { dict: Dict; lang: Locale }) {
  const c = dict.clients;
  const x = dict.expertise;

  // Everything after the "|" marker in the positioning line renders in the
  // accent tone on its own line; the marker also sets the line break.
  const titleParts = c.title.split("|").map((s) => s.trim());

  // Org names only on the homepage — systems live on the domain subpages and
  // the expertise slides. Dedupe per group (an institution can run several
  // systems, e.g. Ministry of Finance).
  const groups = x.items
    .map((it) => ({
      ...it,
      orgs: [...new Set(it.clients.map((cl) => cl.org))],
    }))
    .sort((a, b) => DOMAIN_ORDER.indexOf(a.slug) - DOMAIN_ORDER.indexOf(b.slug));

  return (
    <section id="clients" className="relative">
      {/* Dark positioning band */}
      <div className="relative overflow-hidden bg-[var(--bg-inset)] py-16 text-white lg:py-20">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 70% 15%, #131b2e 0%, #0d111c 60%, #0d111c 100%)",
          }}
        />
        <Starfield count={70} seed={0x51b3} strength={0.5} bias />

        <div className="relative z-10 mx-auto max-w-[1280px] px-6 lg:px-10">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-3 text-[11px] font-medium tracking-[0.25em] uppercase text-[var(--brand-teal-bright)]">
              <EyebrowBars />
              {c.eyebrow}
            </div>

            {/* quiet "in production" status chip */}
            <span className="mono hidden shrink-0 items-center gap-2 rounded-full border border-[var(--brand-teal-bright)]/30 px-3 py-1.5 text-[10px] tracking-[0.22em] uppercase text-[var(--brand-teal-bright)]/90 sm:inline-flex">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--brand-teal-bright)]" />
              {c.status}
            </span>
          </div>

          <div className="mt-7 grid items-center gap-6 lg:grid-cols-12 lg:gap-12">
            <h2 className="font-display lg:col-span-7 text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.08] tracking-[-0.02em] font-medium">
              {titleParts[0]}
              {titleParts.length > 1 && (
                <>
                  <br className="hidden sm:block" />{" "}
                  <span className="text-[var(--brand-teal-bright)]">
                    {titleParts.slice(1).join(" ")}
                  </span>
                </>
              )}
            </h2>
            <p className="lg:col-span-5 max-w-md text-[15.5px] leading-[1.85] text-white/65 lg:border-l lg:border-white/10 lg:pl-10">
              {c.body}
            </p>
          </div>
        </div>
      </div>

      {/* Light card zone — wider than the text container so the four-up
         grid gets room for the two-column client lists (as in the mock). */}
      <div className="bg-[var(--bg)]">
        <div className="mx-auto max-w-[1560px] px-6 py-14 lg:px-10 lg:py-16">
          {/* rem-based arbitrary breakpoint: px would sort before sm: in the
             cascade and lose. 85rem = 1360px. */}
          <div className="grid gap-6 sm:grid-cols-2 min-[85rem]:grid-cols-4">
            {groups.map((it) => {
              const shown = it.orgs.slice(0, SHOWN_MAX);
              const extra = it.orgs.length - shown.length;
              return (
                <article
                  key={it.slug}
                  className="relative flex flex-col overflow-hidden rounded-2xl border border-black/[0.08] bg-white p-6 shadow-[0_12px_32px_rgba(10,14,22,0.05)] lg:p-7"
                >
                  {/* teal accent bar along the card's top edge, as in the mock */}
                  <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-[var(--brand-teal)]" />
                  <div className="flex items-start gap-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--brand-teal)]/10 text-[var(--brand-teal)]">
                      <Icon name={DOMAIN_ICON[it.slug] ?? "layers"} className="h-[22px] w-[22px]" />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-[var(--fg)]">
                        {it.name}
                      </h3>
                      <p className="mt-2 text-[13px] leading-[1.7] text-[var(--fg-dim)]">
                        {it.blurb}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-1 flex-col border-t border-black/[0.06] pt-6">
                    {shown.length > 0 ? (
                      <ul className="grid grid-cols-2 gap-x-3 gap-y-6">
                        {shown.map((org, i) => {
                          const [primary, secondary] = splitOrg(cardLabel(org));
                          return (
                            <li key={i} className="flex items-start gap-2.5">
                              <ClientMark org={org} index={i} />
                              <span className="min-w-0 pt-0.5 text-[11.5px] leading-[1.4]">
                                <span className="block font-medium text-[var(--fg)]/85">
                                  {primary}
                                </span>
                                {secondary && (
                                  <span className="block text-[var(--fg-dim)]">{secondary}</span>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="my-auto mono max-w-[24ch] text-[10.5px] leading-[2] tracking-[0.22em] uppercase text-[var(--fg-dim)]">
                        {x.comingSoon}
                      </p>
                    )}
                  </div>

                  <div className="mt-8">
                    <Link
                      href={`/${lang}/expertise/${it.slug}`}
                      className="group mono inline-flex items-center gap-2.5 whitespace-nowrap text-[10.5px] font-medium tracking-[0.18em] uppercase text-[var(--brand-teal)]"
                    >
                      <span>
                        {c.domainLink.replace("{domain}", DOMAIN_ABBR[it.slug] ?? it.name)}
                        {extra > 0 && <span className="text-[var(--fg-dim)]"> · +{extra}</span>}
                      </span>
                      <svg
                        viewBox="0 0 24 24"
                        className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="m9 6 6 6-6 6" />
                      </svg>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Trust banner — static "+40 more" fact in place of a CTA (no
             all-projects page to link to). Softer panel than the cards. */}
          <div className="mt-8 flex flex-col gap-6 rounded-2xl border border-black/[0.05] bg-white/55 p-6 sm:flex-row sm:items-center sm:justify-between lg:px-8 lg:py-7">
            <div className="flex items-center gap-5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-black/[0.08] bg-white text-[var(--fg)]/70">
                <Icon name="shieldCheck" className="h-5 w-5" />
              </span>
              <p className="max-w-xl text-[14.5px] leading-[1.7] text-[var(--fg)]/80">
                {c.banner}
              </p>
            </div>
            <span className="mono inline-flex shrink-0 items-center gap-2.5 self-start rounded-lg border border-[var(--brand-teal)]/40 px-6 py-3.5 text-[10.5px] font-medium tracking-[0.2em] uppercase text-[var(--brand-teal)] sm:self-auto">
              <span className="font-semibold">+40</span> {c.more}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Client entries — two-line names + tinted icon marks ───
   The name splits into a primary line and a dimmed qualifier ("Tax
   Administration" / "of Montenegro") so columns read as tidy pairs instead
   of arbitrary wraps. Icons are stand-ins until real logos exist; swap
   ClientMark for an <Image> lookup when assets land. */

/* Brand names that merely contain " of " — splitting them ("Port" / "of
   Adria") reads as a parse error rather than a qualifier. */
const NO_SPLIT = /^port of adria$/i;

/* A card column is ~15 characters wide, so a full legal name past ~45 chars
   wraps to six lines and breaks the grid's rhythm. These orgs render under a
   shortened label here only; the domain page's register still carries the
   full name. */
const CARD_LABEL: [RegExp, string][] = [
  [/regionalno-investicionog/, "Ministarstvo regionalno-investicionog razvoja"],
  [/regional & investment/i, "Ministry of Regional & Investment Development"],
];

function cardLabel(org: string): string {
  return CARD_LABEL.find(([re]) => re.test(org))?.[1] ?? org;
}

function splitOrg(org: string): [string, string | null] {
  if (NO_SPLIT.test(org)) return [org, null];
  const i = org.indexOf(" of ");
  if (i > 0) return [org.slice(0, i), org.slice(i + 1)];
  if (org.endsWith(" Crne Gore")) return [org.slice(0, -" Crne Gore".length), "Crne Gore"];
  return [org, null];
}

/* Real marks first: state organs carry the national coat of arms (as they do
   in reality and in the mock), ERSTE its red S, the EU funds the EU flag.
   Assets in public/clients/ (sourced from Wikimedia Commons). `cover` fills
   the circle (flags); default is contained on white. */
const LOGO_RULES: [RegExp, { src: string; cover?: boolean }][] = [
  [/erste/, { src: "/clients/erste-s.png" }],
  [/grawe/, { src: "/clients/grawe.png" }],
  [/rtcg|radio tele/, { src: "/clients/rtcg.png" }],
  [/port of adria/, { src: "/clients/port-of-adria.png" }],
  [/cfcu|\beu\b/, { src: "/clients/eu.png", cover: true }],
  // org-specific marks — must precede the generic coat-of-arms rule
  [/tax administration|poreska uprava/, { src: "/clients/tax-administration.png" }],
  [/ministry of finance|ministarstvo finansija/, { src: "/clients/ministry-finance.png", cover: true }],
  [/innovation fund|fond za inovacije/, { src: "/clients/innovation-fund.png" }],
  [/pension|fond pio/, { src: "/clients/pio.png", cover: true }],
  [/employment|zapošljavanj/, { src: "/clients/employment-agency.png" }],
  [/defen[cs]e|odbran/, { src: "/clients/ministry-defense.png", cover: true }],
  [/parliament|skupštin/, { src: "/clients/parliament.png", cover: true }],
  [/gazette|službeni list/, { src: "/clients/official-gazette.png" }],
  // Uprava za zaštitu kulturnih dobara and the regional-development ministry
  // do have their own lockups, but theirs are the engraved (line-art) coat of
  // arms — at 24px it degrades into a grey smudge next to the solid gold ones,
  // so both fall through to the state crest below.
  [
    /ministry|ministarstvo|government|vlada|parliament|skupštin|administration|uprava|authority|tax|poresk|defen[cs]e|odbran|military|vojno|interior|unutrašnj|gazette|službeni|registr?ar|register/,
    { src: "/clients/montenegro-coa.png" },
  ],
];

function orgLogo(org: string): { src: string; cover?: boolean } | null {
  const s = org.toLowerCase();
  for (const [re, logo] of LOGO_RULES) if (re.test(s)) return logo;
  return null;
}

/* Keyword → glyph fallback for institutions without a usable logo, matched in
   order against the lowercased org name in either language, so a new dict
   entry picks up a sensible mark for free. */
const ORG_ICON_RULES: [RegExp, IconName][] = [
  [/military|intelligence|vojno/, "radar"],
  [/defen[cs]e|odbran/, "shield"],
  [/interior|unutrašnj/, "shield"],
  [/pension|\bpio\b/, "shieldCheck"],
  [/employment|zapošljavanj/, "search"],
  [/human resources|kadrov/, "users"],
  [/gazette|službeni/, "fileText"],
  [/registr?ar|register/, "database"],
  [/innovat|inovac/, "rocket"],
  [/cfcu|\beu\b/, "handshake"],
  [/tax|poresk/, "barChart"],
  [/finance|finansij/, "trendingUp"],
  [/court|sud/, "list"],
];

function orgIcon(org: string): IconName {
  const s = org.toLowerCase();
  for (const [re, name] of ORG_ICON_RULES) if (re.test(s)) return name;
  return "landmark"; // ministries, government, parliament, banks
}

/* Tinted like the real logos in the mock (gold crests, blues, teals) so the
   grid reads lively; cycled by position, stable across locales. Inline styles
   because per-item Tailwind classes can't be generated dynamically. */
const MARK_TINTS: { bg: string; fg: string }[] = [
  { bg: "#fdf3e2", fg: "#a16207" }, // gold — state crests
  { bg: "#e8f0fd", fg: "#2b5cc4" }, // blue
  { bg: "#e5f2f1", fg: "#2e847f" }, // teal
  { bg: "#f2edfd", fg: "#6d43c0" }, // violet
  { bg: "#fdecec", fg: "#bb3a3a" }, // red
  { bg: "#e5f3f8", fg: "#177a99" }, // cyan
];

export function ClientMark({ org, index }: { org: string; index: number }) {
  const logo = orgLogo(org);
  if (logo) {
    return (
      <span
        aria-hidden
        className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-black/[0.06] bg-white"
      >
        <Image
          src={logo.src}
          alt=""
          width={36}
          height={36}
          unoptimized
          className={logo.cover ? "h-full w-full object-cover" : "h-[24px] w-[24px] object-contain"}
        />
      </span>
    );
  }
  const tint = MARK_TINTS[index % MARK_TINTS.length];
  return (
    <span
      aria-hidden
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
      style={{ backgroundColor: tint.bg, color: tint.fg }}
    >
      <Icon name={orgIcon(org)} className="h-[17px] w-[17px]" />
    </span>
  );
}
