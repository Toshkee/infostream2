"use client";

import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { maskReveal } from "@/lib/maskReveal";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { Dict } from "@/lib/dictionaries";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// ── Media wiring ─────────────────────────────────────────────────────
// One entry per project (index-aligned with dict.projects.items). Drop real
// assets into /public/projects/ and fill `image`. Until then each card shows
// a styled "visual pending" placeholder.
//   image:  "/projects/settlement.webp"
type ProjectMedia = {
  accent: string; // glow / tint for the placeholder + frame
  image?: string;
  kind?: "image" | "video"; // hint for the placeholder badge before real media exists
};

const MEDIA: ProjectMedia[] = [
  { accent: "var(--brand-teal-bright)", image: "/projects/main-poster.jpg" },
  { accent: "var(--brand-red)", image: "/projects/dotbond-poster.jpg" },
  { accent: "var(--brand-teal-soft)", image: "/projects/perf-poster.jpg" },
  { accent: "var(--brand-red)", image: "/projects/zadaci-poster.jpg" },
  { accent: "var(--brand-teal-bright)", image: "/projects/NVO-poster.jpg" },
];

const FALLBACK: ProjectMedia = { accent: "var(--brand-teal-bright)", kind: "image" };

export default function Projects({ dict }: { dict: Dict }) {
  const pj = dict.projects;
  const items = pj.items;
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  // Mobile / reduced-motion: progress bar tracks native horizontal scroll.
  useEffect(() => {
    const vp = viewportRef.current;
    const bar = progressRef.current;
    if (!vp || !bar) return;
    const onScroll = () => {
      const max = vp.scrollWidth - vp.clientWidth;
      bar.style.transform = `scaleX(${max > 0 ? vp.scrollLeft / max : 0})`;
    };
    onScroll();
    vp.addEventListener("scroll", onScroll, { passive: true });
    return () => vp.removeEventListener("scroll", onScroll);
  }, []);

  useGSAP(
    () => {
      if (reducedMotion) return;

      maskReveal(".pj-h2");

      // Pinned horizontal scroll — desktop only. On touch/small screens the
      // viewport is a native snap-scroll strip (no pin), which feels better.
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px)", () => {
        const track = trackRef.current;
        const section = sectionRef.current;
        const bar = progressRef.current;
        if (!track || !section) return;

        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

        const drift = gsap.to(track, { x: () => -distance(), ease: "none" });

        const st = ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          pinSpacing: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          animation: drift,
          onUpdate: (self) => {
            if (bar) bar.style.transform = `scaleX(${self.progress})`;
          },
        });

        // Per-card parallax: the media drifts inside its frame as the card
        // crosses the viewport, riding the same horizontal tween.
        const cards = gsap.utils.toArray<HTMLElement>(".pj-card");
        const parallaxes = cards.map((card) => {
          const inner = card.querySelector<HTMLElement>(".pj-media-inner");
          if (!inner) return null;
          return gsap.fromTo(
            inner,
            { xPercent: -7 },
            {
              xPercent: 7,
              ease: "none",
              scrollTrigger: {
                trigger: card,
                containerAnimation: drift,
                start: "left right",
                end: "right left",
                scrub: true,
              },
            }
          );
        });

        return () => {
          st.kill();
          parallaxes.forEach((t) => t?.scrollTrigger?.kill());
        };
      });
    },
    { scope: sectionRef, dependencies: [reducedMotion] }
  );

  // On lg the GSAP tween moves the track; elsewhere it's a native swipe strip.
  const pinned = !reducedMotion;
  const vpClass = [
    "pj-viewport w-full overflow-x-auto snap-x snap-mandatory no-scrollbar",
    pinned ? "lg:overflow-x-visible lg:overflow-visible lg:snap-none" : "",
  ].join(" ");

  return (
    <section
      id="projects"
      ref={sectionRef}
      className="relative bg-[var(--bg-inset)] text-white overflow-hidden py-24 lg:py-0 lg:h-screen lg:flex lg:flex-col lg:justify-center"
    >
      <div className="relative w-full">
        {/* Heading */}
        <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
          <div className="max-w-2xl">
            <div className="text-[11px] font-medium tracking-[0.25em] uppercase text-[var(--brand-teal-bright)]">
              {pj.eyebrow}
            </div>
            <h2 className="pj-h2 mask-reveal mt-5 text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.05] tracking-[-0.02em] font-medium">
              {pj.title}
            </h2>
            <p className="mt-6 text-white/65 leading-relaxed max-w-md text-[15.5px]">
              {pj.body}
            </p>
          </div>
        </div>

        {/* Horizontal gallery */}
        <div ref={viewportRef} className={vpClass}>
          <div
            ref={trackRef}
            className="pj-track flex items-stretch gap-5 lg:gap-8 px-6 lg:px-[max(2.5rem,calc((100vw-1280px)/2+2.5rem))] pt-10 lg:pt-14 pb-2"
          >
            {items.map((item, i) => {
              const media = MEDIA[i] ?? FALLBACK;
              return (
                <article
                  key={item.name}
                  className="pj-card group flex-none w-[82vw] max-w-[560px] lg:w-[46vw] lg:max-w-[660px] snap-center"
                >
                  {/* Media frame — reads as a product screenshot */}
                  <div
                    className="pj-media relative overflow-hidden rounded-2xl border border-white/10 aspect-[16/10] bg-[var(--bg-inset-elev)]"
                    style={{ boxShadow: `0 30px 80px -40px ${media.accent}` }}
                  >
                    {/* address strip — real domain, no faux-macOS dots */}
                    <div className="absolute top-0 inset-x-0 z-20 h-9 flex items-center px-4 bg-black/30 backdrop-blur-sm border-b border-white/10">
                      <span className="mono text-[10px] tracking-[0.15em] text-white/60 truncate">
                        infostream.co.me / {item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}
                      </span>
                    </div>

                    {/* zoom-on-hover wrapper (kept separate from GSAP's parallax target) */}
                    <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.04]">
                      <ProjectVisual media={media} name={item.name} reduced={reducedMotion} />
                    </div>

                    {/* sheen sweep on hover */}
                    <div className="pointer-events-none absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.06)_50%,transparent_60%)]" />
                  </div>

                  {/* Meta */}
                  <div className="mt-5 px-1">
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="text-white font-medium text-[clamp(1.15rem,2vw,1.45rem)] tracking-[-0.01em] leading-tight">
                        {item.name}
                      </h3>
                      <span className="mono text-[11px] tracking-[0.18em] text-white/55 tabular-nums flex-none">
                        {item.year}
                      </span>
                    </div>
                    <p className="mt-2.5 text-white/60 text-[14.5px] leading-relaxed max-w-[46ch]">
                      {item.summary}
                    </p>
                    <div className="mt-3.5 flex flex-wrap gap-2">
                      {item.tags.map((t) => (
                        <span
                          key={t}
                          className="mono inline-flex items-center px-2.5 py-1 rounded-md border border-white/10 bg-white/[0.03] text-[11px] tracking-[0.04em] text-white/65"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* Progress + hint */}
        <div className="mx-auto max-w-[1280px] px-6 lg:px-10 mt-6 lg:mt-10 flex items-center gap-4">
          <div className="relative h-px flex-1 bg-white/10 overflow-hidden">
            <div
              ref={progressRef}
              className="absolute inset-0 origin-left bg-[var(--brand-teal-bright)]"
              style={{ transform: "scaleX(0)" }}
            />
          </div>
          <span className="mono text-[10px] uppercase tracking-[0.22em] text-white/55 flex-none">
            {pj.scrollHint}
          </span>
        </div>
      </div>
    </section>
  );
}

// ── Per-card visual ──────────────────────────────────────────────────
// Real image → cover img. Otherwise a styled dashboard-wireframe
// placeholder so the layout reads intentionally.
function ProjectVisual({
  media,
  name,
  reduced,
}: {
  media: ProjectMedia;
  name: string;
  reduced: boolean;
}) {
  if (media.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="pj-media-inner absolute inset-[-7%] h-[114%] w-[114%] object-cover"
        src={media.image}
        alt={name}
        loading="lazy"
      />
    );
  }
  return (
    <Placeholder accent={media.accent} kind={media.kind} reduced={reduced} />
  );
}

function Placeholder({
  accent,
  kind,
  reduced,
}: {
  accent: string;
  kind?: "image" | "video";
  reduced: boolean;
}) {
  return (
    <div
      className="pj-media-inner absolute inset-[-7%] h-[114%] w-[114%]"
      style={{
        background: `radial-gradient(120% 100% at 25% 0%, color-mix(in srgb, ${accent} 22%, transparent), transparent 55%), linear-gradient(135deg, #11182a 0%, #0a0e18 100%)`,
      }}
    >
      {/* dashboard wireframe — evokes an app screenshot */}
      <svg
        viewBox="0 0 400 250"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <g stroke={accent} strokeWidth={1} fill="none" opacity={0.35}>
          {/* sidebar */}
          <rect x={26} y={56} width={78} height={168} rx={6} />
          {[78, 100, 122, 144].map((y) => (
            <line key={y} x1={40} y1={y} x2={90} y2={y} strokeWidth={3} strokeLinecap="round" opacity={0.6} />
          ))}
          {/* chart panel */}
          <rect x={122} y={56} width={252} height={92} rx={6} />
          <polyline
            points="134,128 160,108 186,118 212,86 238,100 264,72 290,90 316,64 342,80 362,60"
            stroke={accent}
            strokeWidth={2}
            opacity={0.85}
          />
          {/* table rows */}
          <rect x={122} y={160} width={252} height={64} rx={6} />
          {[176, 192, 208].map((y) => (
            <line key={y} x1={134} y1={y} x2={362} y2={y} strokeWidth={2} opacity={0.4} />
          ))}
        </g>
        {/* animated scan line */}
        {!reduced && (
          <rect x={122} y={56} width={252} height={2} fill={accent} opacity={0.6}>
            <animate attributeName="y" values="56;146;56" dur="4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.7;0" dur="4s" repeatCount="indefinite" />
          </rect>
        )}
      </svg>

      {/* big index + media-kind badge */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
        {kind === "video" ? (
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full border"
            style={{ borderColor: accent, boxShadow: `0 0 24px -6px ${accent}` }}
          >
            <svg width="18" height="20" viewBox="0 0 18 20" fill={accent}>
              <path d="M0 1.5v17a1 1 0 0 0 1.5.87l15-8.5a1 1 0 0 0 0-1.74l-15-8.5A1 1 0 0 0 0 1.5Z" />
            </svg>
          </span>
        ) : (
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full border"
            style={{ borderColor: accent, boxShadow: `0 0 24px -6px ${accent}` }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="9" cy="10" r="1.6" />
              <path d="m3 17 5-5 4 4 3-3 6 6" />
            </svg>
          </span>
        )}
        <span className="mono text-[10px] uppercase tracking-[0.25em] text-white/60">
          {kind === "video" ? "video pending" : "screenshot pending"}
        </span>
      </div>
    </div>
  );
}
