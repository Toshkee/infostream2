import Image from "next/image";
import type { Dict } from "@/lib/dictionaries";
import { Icon, type IconName } from "./visuals";

/* ─── Clients — a proof-strip of verified institutional marks ───────────
   A national coat of arms is not presented as a logo of an individual public
   body. Where an official, organisation-specific mark is unavailable, use a
   typographic nameplate instead of implying one exists. */

type ClientLogo = {
  id: string;
  src?: string;
  label: string;
  shortLabel?: string;
  className?: string;
  officialKicker?: string;
};

/* Structure in code, copy in dict: dict.clients.featured carries the labels
   (and which marks are official state bodies); this map holds the matching
   asset and any per-logo sizing, keyed by the entry's id. An entry with no
   asset renders as a typographic nameplate. */
const FEATURED_ASSETS: Record<string, { src?: string; shortLabel?: string; className?: string }> = {
  parliament: { src: "/clients/parliament-seal.transparent.png", className: "max-h-14 max-w-[9rem]" },
  "innovation-fund": {
    src: "/clients/innovation-fund-full.svg",
    className: "max-h-[4.5rem] max-w-[12rem]",
  },
  "employment-agency": { src: "/clients/employment-agency.transparent.webp" },
  pio: { src: "/clients/pio-full.webp", className: "max-h-12 max-w-[9rem]" },
  "ministry-defense": { src: "/clients/ministry-defense.transparent.webp" },
  // The Gazette's own lockup (arms + bar + wordmark, white variant) from
  // sluzbenilist.me: a body-specific mark, not the bare national arms.
  "official-gazette": { src: "/clients/official-gazette.transparent.webp", className: "max-h-11 max-w-[10rem]" },
  erste: { src: "/clients/erste-bank.transparent.webp", className: "max-h-11 max-w-[10rem]" },
  grawe: { src: "/clients/grawe-full.svg", className: "max-h-12 max-w-[12rem]" },
  rtcg: { src: "/clients/rtcg-full.webp", className: "max-h-12 max-w-[9.5rem] brightness-0 invert" },
  "port-of-adria": { src: "/clients/port-of-adria-full.webp", className: "max-h-[4.5rem] max-w-[10rem]" },
  "eu-delegation": { src: "/clients/eu.transparent.webp" },
  "regional-development": { shortLabel: "MIRN" },
};

const LOGOS_REQUIRING_LABEL = new Set(["employment-agency", "ministry-defense"]);

function featuredLogos(c: Dict["clients"]): ClientLogo[] {
  return c.featured.map((f) => {
    const asset = FEATURED_ASSETS[f.id];
    const src = f.id === "innovation-fund" && f.label.startsWith("Innovation")
      ? "/clients/innovation-fund-full-eng-trimmed.webp"
      : asset?.src;

    return {
      id: f.id,
      label: f.label,
      ...asset,
      src,
      officialKicker: f.official ? c.officialKicker : undefined,
    };
  });
}

function LogoStrip({ logos, reverse = false }: { logos: ClientLogo[]; reverse?: boolean }) {
  return (
    <div className="proof-strip">
      <div className={`proof-strip-track${reverse ? " proof-strip-track-reverse" : ""}`}>
        {[false, true].map((copy) => (
          <div key={String(copy)} className="proof-strip-group" aria-hidden={copy || undefined}>
            {logos.map((logo) => (
              <div key={`${copy}-${logo.label}`} className="proof-strip-logo">
                {logo.id === "eu-delegation" && logo.src ? (
                  <span className="proof-strip-eu-delegation">
                    <Image
                      src={logo.src}
                      alt=""
                      width={66}
                      height={44}
                      unoptimized
                    />
                    <strong>{logo.label}</strong>
                  </span>
                ) : logo.src ? (
                  <Image
                    src={logo.src}
                    alt={copy ? "" : logo.label}
                    width={180}
                    height={120}
                    unoptimized
                    className={`max-h-[4.5rem] w-auto max-w-[8.5rem] object-contain ${logo.className ?? ""}`}
                  />
                ) : logo.officialKicker ? (
                  <span
                    className={`proof-strip-official-lockup${logo.shortLabel ? " proof-strip-official-lockup-compact" : ""}`}
                    aria-hidden={copy || undefined}
                  >
                    <Image
                      src="/clients/montenegro-coa.transparent.webp"
                      alt=""
                      width={36}
                      height={42}
                      unoptimized
                    />
                    <span>
                      <small>{logo.officialKicker}</small>
                      <strong>
                        {logo.shortLabel ? (
                          <>
                            <span aria-hidden>{logo.shortLabel}</span>
                            <span className="sr-only">{logo.label}</span>
                          </>
                        ) : logo.label}
                      </strong>
                    </span>
                  </span>
                ) : (
                  <span className="proof-strip-nameplate" aria-hidden={copy || undefined}>{logo.label}</span>
                )}
                {logo.src && LOGOS_REQUIRING_LABEL.has(logo.id) && (
                  <span className="proof-strip-label">{logo.label}</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Clients({ dict }: { dict: Dict }) {
  const c = dict.clients;
  const logos = featuredLogos(c);

  return (
    <section id="clients" className="overflow-hidden bg-[#151b24] text-white">
      <div className="border-y border-white/10 px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
        <h2 className="font-display text-[clamp(2.5rem,4.25vw,4.5rem)] leading-none tracking-[-0.04em] font-medium">
          {c.stripTitle}
        </h2>
      </div>
      <div className="py-16 sm:py-20 lg:py-24">
        <LogoStrip logos={logos.slice(0, 8)} />
        <div className="mt-10 sm:mt-14"><LogoStrip logos={logos.slice(8)} reverse /></div>
      </div>
    </section>
  );
}

/* ─── Client entries — two-line names + tinted icon marks ───
   The name splits into a primary line and a dimmed qualifier ("Tax
   Administration" / "of Montenegro") so columns read as tidy pairs instead
   of arbitrary wraps. ClientMark renders the real logo when LOGO_RULES has
   one and falls back to a tinted line icon otherwise. */

/* Body-specific marks first; state bodies without one carry the national
   coat of arms, which is the official mark every ministry and administration
   actually signs with. Assets in public/clients/ are local static files;
   `cover` fills the circle (flags); default is contained on white. */
const COA = { src: "/clients/montenegro-coa.transparent.webp" };
const LOGO_RULES: [RegExp, { src: string; cover?: boolean }][] = [
  [/erste/, { src: "/clients/erste-bank.transparent.webp" }],
  [/grawe/, { src: "/clients/grawe.transparent.webp" }],
  [/rtcg|radio tele/, { src: "/clients/rtcg.transparent.webp" }],
  [/port of adria/, { src: "/clients/port-of-adria.transparent.webp" }],
  [/cfcu|\beu\b/, { src: "/clients/eu.transparent.webp", cover: true }],
  // Organisation-specific marks — must precede broad keyword matches.
  [/innovation fund|fond za inovacije/, { src: "/clients/innovation-fund.transparent.webp" }],
  [/pension|fond pio/, { src: "/clients/pio.transparent.webp", cover: true }],
  [/employment|zapošljavanj/, { src: "/clients/employment-agency.transparent.webp" }],
  [/defen[cs]e|odbran/, { src: "/clients/ministry-defense.transparent.webp", cover: true }],
  [/european union|evropske unije/, { src: "/clients/eu.transparent.webp", cover: true }],
  // State bodies: ministries, administrations, authorities, the Gazette, gov.me portals.
  [/ministry|ministarstvo|administration|uprava|authority|department|služb|gazette|parliament|skupštin|\.gov\.me/, COA],
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
  [/pension|\bpio\b/, "shieldCheck"],
  [/employment|zapošljavanj/, "search"],
  [/human resources|kadrov/, "users"],
  [/gazette|službeni/, "fileText"],
  [/innovat|inovac/, "rocket"],
  [/cfcu|\beu\b/, "handshake"],
  [/tax|poresk/, "barChart"],
  [/finance|finansij/, "trendingUp"],
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
