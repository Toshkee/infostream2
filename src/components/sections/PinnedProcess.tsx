"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Dict } from "@/lib/dictionaries";
import { maskReveal } from "@/lib/maskReveal";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { EyebrowBars, Icon, tealPeriod, type CSSVars } from "./visuals";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ─── Process — the delivery ledger ───
   Four stages read as one sequence, not four boxes: hairline-divided rows
   beside a vertical rail whose teal fill tracks the scroll. The row crossing
   the reading line is the active one; rows already passed stay lit, rows
   ahead wait dimmed. Each stage names what the client actually receives, so
   the process reads as accountable rather than as method-speak.

   Every state change is a class flip on the row; the visuals are CSS
   transitions keyed off `--pa` (see `.proc-*` in globals.css), never GSAP
   time-tweens, so an occluded tab or Lenis' lagSmoothing can't strand them.
   Without JS (or with reduced motion) `.proc-live` is never added and every
   row renders fully lit. */

// Reading line — the viewport fraction a row must cross to become active.
// The same line closes the previous row, so exactly one row is active.
const READ_LINE = "58%";

export default function PinnedProcess({ dict }: { dict: Dict }) {
  const { platform } = dict;
  const root = useRef<HTMLElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reducedMotion || !list.current) return;
      maskReveal(".proc-h2");

      const ol = list.current;
      ol.classList.add("proc-live");

      // Rail fill — scrubbed 0..1 across the list, written as a CSS var.
      const fill = (self: ScrollTrigger) => ol.style.setProperty("--fill", self.progress.toFixed(4));
      ScrollTrigger.create({
        trigger: ol,
        start: `top ${READ_LINE}`,
        end: `bottom ${READ_LINE}`,
        scrub: true,
        onUpdate: fill,
        onRefresh: fill,
      });

      // Row states — active while it straddles the reading line, past once
      // its bottom edge has crossed it. Derived from the trigger's progress
      // on every update (and on refresh), not from enter/leave edges, so a
      // deep link or restored scroll position lands on the right state.
      ol.querySelectorAll<HTMLElement>(".proc-row").forEach((row) => {
        const sync = (self: ScrollTrigger) => {
          row.classList.toggle("is-active", self.isActive);
          row.classList.toggle("is-past", !self.isActive && self.progress >= 1);
        };
        ScrollTrigger.create({
          trigger: row,
          start: `top ${READ_LINE}`,
          end: `bottom ${READ_LINE}`,
          onUpdate: sync,
          onToggle: sync,
          onRefresh: sync,
        });
      });
    },
    { scope: root, dependencies: [reducedMotion] }
  );

  return (
    <section
      id="platform"
      ref={root}
      className="relative bg-[var(--bg-inset)] py-20 text-white sm:py-28 lg:py-36"
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
          <header className="lg:sticky lg:top-32 lg:self-start">
            <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.25em] text-[var(--brand-teal-bright)]">
              <EyebrowBars />
              {platform.eyebrow}
            </div>
            <h2 className="proc-h2 mask-reveal font-display mt-6 max-w-lg text-[clamp(2.3rem,4vw,3.9rem)] font-medium leading-[1.02] tracking-[-0.03em]">
              {tealPeriod(platform.title)}
            </h2>
            <p className="mt-6 max-w-md text-[16px] leading-relaxed text-white/65">{platform.body}</p>

            {/* The one method claim we make, stated quietly under the framing. */}
            <div className="mt-9 flex max-w-md items-center gap-3 border-t border-white/15 pt-4 text-[13px] text-white/60">
              <Icon name="check" className="h-4 w-4 shrink-0 text-[var(--brand-teal-bright)]" />
              {platform.framework}
            </div>
          </header>

          <ol
            ref={list}
            className="proc-list relative lg:pl-12"
            aria-label={platform.title}
            style={{ "--fill": 0 } as CSSVars}
          >
            {/* Rail — hairline track with a scroll-scrubbed teal fill. */}
            <div aria-hidden className="absolute inset-y-0 left-0 hidden w-px bg-white/10 lg:block">
              <div
                className="absolute left-0 top-0 w-px bg-[var(--brand-teal-bright)]"
                style={{ height: "calc(var(--fill) * 100%)" }}
              />
            </div>

            {platform.stages.map((stage, index) => (
              <li
                key={stage.name}
                className={`proc-row relative border-t border-white/10 py-9 sm:py-10 lg:py-11 ${
                  index === platform.stages.length - 1 ? "border-b" : ""
                }`}
              >
                {/* Rail node — centred on the track by a plain left offset (half its
                   8px width past the -3rem list padding); no translate/transform,
                   so the active-state scale can never shift it sideways. */}
                <span
                  aria-hidden
                  className="proc-node absolute top-[calc(2.75rem+0.55em)] hidden h-2 w-2 rounded-full border border-white/25 bg-[var(--bg-inset)] lg:block"
                  style={{ left: "calc(-3rem - 0.25rem)" }}
                />

                {/* Name + deliverables sit in the left column, the description
                   in the right; on narrow screens they stack in reading order
                   (name, description, deliverables). */}
                <div className="grid gap-x-10 gap-y-5 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.55fr)] md:grid-rows-[auto_1fr] lg:gap-x-12">
                  <h3 className="proc-title font-display text-[clamp(1.6rem,2.2vw,2.05rem)] font-medium leading-[1.05] tracking-[-0.03em]">
                    {stage.name}
                  </h3>

                  <p className="proc-body max-w-lg text-[15px] leading-relaxed md:col-start-2 md:row-span-2 md:row-start-1">
                    {stage.description}
                  </p>

                  {/* Deliverables — the concrete hand-over of the stage. */}
                  <div className="md:col-start-1 md:row-start-2 md:mt-1">
                    <div className="mono text-[10px] uppercase tracking-[0.3em] text-white/40">
                      {platform.outcomesLabel}
                    </div>
                    <ul className="mt-3 space-y-1.5">
                      {stage.outcomes.map((o) => (
                        <li key={o} className="proc-chip text-[13px] leading-snug">
                          {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
