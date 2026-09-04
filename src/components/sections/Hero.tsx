"use client";

import Image from "next/image";
import type { Dict } from "@/lib/dictionaries";
import { EyebrowBars, tealPeriod } from "./visuals";

// The intro is pure CSS (`.hero-rise` in globals.css), not a GSAP timeline:
// it starts with the first painted frame — before the JS bundle hydrates —
// so slow devices never stare at an empty starfield, and a frozen/occluded
// tab can't strand it mid-fade the way rAF-driven time-tweens are.
// 16px thumbnail of the office photo, shown while the real file streams in
// so the backdrop surfaces softly instead of snapping from flat dark.
const HERO_BLUR =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAPABADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDJvZo9RukeFG2Jjdn0zitiOeCS1MTIdkKnqBhQO9ZqX/2Uuv2eORAeMfKauabbreN9o1AAk8YX6YwayUbm/NY//9k=";

export default function Hero({ hero }: { hero: Dict["hero"] }) {
  const titleWords = hero.title.split(" ");

  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-[var(--bg-inset)] text-white">
      {/* Quiet dark backdrop — deliberately free of the planets/orbits, which
         are the process section's visual identity further down the page. A
         seeded starfield and one soft brand glow keep it from reading flat. */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 50% 45%, #19223a 0%, #0d111c 70%, #07090f 100%)",
          }}
        />
        {/* One restrained brand glow keeps depth without adding another accent. */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 45% 40% at 78% 22%, rgba(72,184,177,0.07) 0%, transparent 70%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[var(--bg-inset)]" />
      </div>

      {/* Office photograph across the whole backdrop. Heavily darkened, with
          a left-to-right scrim so the copy on the left sits on near-solid
          dark and the room shows through more on the right; the bottom edge
          dissolves into the page background. Deliberately NOT part of the
          `hero-rise` stagger: the blur placeholder must be on screen from the
          first paint so the backdrop never shows bare before the photo. */}
      <div aria-hidden className="absolute inset-0 z-[1]">
        <Image
          src="/hero-office.webp"
          alt=""
          fill
          priority
          placeholder="blur"
          blurDataURL={HERO_BLUR}
          sizes="100vw"
          className="hero-drift object-cover object-[60%_45%] opacity-[0.58] saturate-[0.8]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(13,17,28,0.85) 0%, rgba(13,17,28,0.55) 45%, rgba(13,17,28,0.18) 100%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-[var(--bg-inset)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-[1280px] flex-col justify-center px-6 pt-20 pb-8 md:pt-24 md:pb-12 lg:px-10">
        <div className="hero-rise text-[10px] font-medium tracking-[0.2em] uppercase text-[var(--brand-teal-bright)] flex items-center gap-3 sm:text-[11px] sm:tracking-[0.25em]">
          <EyebrowBars />
          {hero.eyebrow}
        </div>
        <h1 className="font-display mt-6 text-[clamp(2.2rem,5.2vw,4.8rem)] leading-[1.02] tracking-[-0.025em] font-medium text-white max-w-4xl">
          {titleWords.map((w, i) => (
            <span
              key={i}
              className="hero-rise inline-block mr-[0.22em]"
              style={{ animationDelay: `${0.1 + i * 0.055}s` }}
            >
              {i === titleWords.length - 1 ? tealPeriod(w) : w}
            </span>
          ))}
        </h1>
        <p
          className="hero-rise mt-6 max-w-xl text-white/70 text-[16.5px] leading-relaxed"
          style={{ animationDelay: "0.45s" }}
        >
          {hero.body}
        </p>

        {/* Primary action — same red-pill affordance as the navbar CTA */}
        <div className="hero-rise mt-9" style={{ animationDelay: "0.52s" }}>
          <a
            href="#contact"
            className="inline-block text-[14px] font-medium px-6 py-3 rounded-xl bg-[var(--brand-red)] text-white hover:bg-[var(--brand-red-deep)] transition-colors duration-200"
            style={{ boxShadow: "0 1px 4px rgba(214,59,59,0.25)" }}
          >
            {hero.cta}
          </a>
        </div>

        {/* Key facts — hairline key/value rows in the expertise client-list
           register, no boxes or icons. A 2×2 grid on phones, where they also
           fill what was an empty lower half of the opening screen. */}
        <div className="mt-12 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-6 sm:mt-14 sm:grid-cols-4 sm:gap-x-10 sm:gap-y-7">
          {hero.meta.map((m, i) => (
            <div
              key={i}
              className="hero-rise border-t border-white/15 pt-3.5"
              style={{ animationDelay: `${0.62 + i * 0.07}s` }}
            >
              <div className="mono text-[9.5px] tracking-[0.2em] uppercase text-white/50 leading-tight">{m.k}</div>
              <div className="mono text-[15px] mt-1.5 text-white/90 leading-tight">{m.v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
