import Image from "next/image";
import type { Dict, Locale } from "@/lib/dictionaries";
import { Icon, type IconName } from "./visuals";

/* ─── Clients — a proof-strip of verified institutional marks ───────────
   A national coat of arms is not presented as a logo of an individual public
   body. Where an official, organisation-specific mark is unavailable, use a
   typographic nameplate instead of implying one exists. */

type ClientLogo = { src?: string; label: string; className?: string; officialKicker?: string };

function featuredLogos(lang: Locale): ClientLogo[] {
  const mne = lang === "mne";
  return [
    { src: "/clients/ministry-finance.transparent.png", label: mne ? "Ministarstvo finansija" : "Ministry of Finance" },
    { src: "/clients/parliament.transparent.png", label: mne ? "Skupština Crne Gore" : "Parliament of Montenegro" },
    { label: mne ? "Poreska uprava" : "Tax Administration", officialKicker: mne ? "Crna Gora" : "Montenegro" },
    { src: "/clients/innovation-fund.transparent.png", label: mne ? "Fond za inovacije" : "Innovation Fund" },
    { src: "/clients/employment-agency.transparent.png", label: mne ? "Zavod za zapošljavanje" : "Employment Agency" },
    { src: "/clients/pio.transparent.png", label: mne ? "Fond PIO" : "Pension and Disability Insurance Fund" },
    { src: "/clients/ministry-defense.transparent.png", label: mne ? "Ministarstvo odbrane" : "Ministry of Defence" },
    { label: mne ? "Službeni list Crne Gore" : "Official Gazette of Montenegro" },
    { src: "/clients/erste-s.transparent.png", label: "Erste Bank" },
    { src: "/clients/grawe.transparent.png", label: "GRAWE" },
    { src: "/clients/rtcg.transparent.png", label: "RTCG" },
    { src: "/clients/port-of-adria.transparent.png", label: "Port of Adria", className: "max-h-10 max-w-[8.5rem]" },
    { src: "/clients/eu.transparent.png", label: "European Union", className: "max-h-12 max-w-[8.5rem]" },
    { label: mne ? "Uprava za zaštitu kulturnih dobara" : "Cultural Heritage Administration", officialKicker: mne ? "Crna Gora" : "Montenegro" },
    { label: mne ? "Ministarstvo regionalno-investicionog razvoja" : "Ministry of Regional and Investment Development", officialKicker: mne ? "Crna Gora" : "Montenegro" },
    { label: mne ? "Vlada Crne Gore" : "Government of Montenegro", officialKicker: mne ? "Crna Gora" : "Montenegro" },
  ];
}

function LogoStrip({ logos, reverse = false }: { logos: ClientLogo[]; reverse?: boolean }) {
  return (
    <div className="proof-strip">
      <div className={`proof-strip-track${reverse ? " proof-strip-track-reverse" : ""}`}>
        {[false, true].map((copy) => (
          <div key={String(copy)} className="proof-strip-group" aria-hidden={copy || undefined}>
            {logos.map((logo) => (
              <div key={`${copy}-${logo.label}`} className="proof-strip-logo">
                {logo.src ? (
                  <Image
                    src={logo.src}
                    alt={copy ? "" : logo.label}
                    width={180}
                    height={120}
                    unoptimized
                    className={`max-h-[4.5rem] w-auto max-w-[8.5rem] object-contain ${logo.className ?? ""}`}
                  />
                ) : logo.officialKicker ? (
                  <span className="proof-strip-official-lockup" aria-hidden={copy || undefined}>
                    <Image
                      src="/clients/montenegro-coa.transparent.png"
                      alt=""
                      width={36}
                      height={42}
                      unoptimized
                    />
                    <span>
                      <small>{logo.officialKicker}</small>
                      <strong>{logo.label}</strong>
                    </span>
                  </span>
                ) : (
                  <span className="proof-strip-nameplate" aria-hidden={copy || undefined}>{logo.label}</span>
                )}
                {logo.src && <span className="proof-strip-label">{logo.label}</span>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Clients({ dict, lang }: { dict: Dict; lang: Locale }) {
  const c = dict.clients;
  const logos = featuredLogos(lang);

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
   of arbitrary wraps. Icons are stand-ins until real logos exist; swap
   ClientMark for an <Image> lookup when assets land. */

/* Real marks first. A state coat of arms is deliberately not used as a stand-in
   for another public body's logo. Assets in public/clients/ are local static
   files; `cover` fills the circle (flags); default is contained on white. */
const LOGO_RULES: [RegExp, { src: string; cover?: boolean }][] = [
  [/erste/, { src: "/clients/erste-s.transparent.png" }],
  [/grawe/, { src: "/clients/grawe.transparent.png" }],
  [/rtcg|radio tele/, { src: "/clients/rtcg.transparent.png" }],
  [/port of adria/, { src: "/clients/port-of-adria.transparent.png" }],
  [/cfcu|\beu\b/, { src: "/clients/eu.transparent.png", cover: true }],
  // Organisation-specific marks — must precede broad keyword matches.
  [/ministry of finance|ministarstvo finansija/, { src: "/clients/ministry-finance.transparent.png", cover: true }],
  [/innovation fund|fond za inovacije/, { src: "/clients/innovation-fund.transparent.png" }],
  [/pension|fond pio/, { src: "/clients/pio.transparent.png", cover: true }],
  [/employment|zapošljavanj/, { src: "/clients/employment-agency.transparent.png" }],
  [/defen[cs]e|odbran/, { src: "/clients/ministry-defense.transparent.png", cover: true }],
  [/parliament|skupštin/, { src: "/clients/parliament.transparent.png", cover: true }],
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
