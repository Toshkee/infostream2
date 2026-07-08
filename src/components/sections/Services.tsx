"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import type { Dict } from "@/lib/dictionaries";

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MotionPathPlugin, useGSAP);

const MOTION_OK = "(prefers-reduced-motion: no-preference)";
// Connectors are drawn between the two zigzag columns, which only exist at lg+.
const ZIGZAG = "(min-width: 1024px)";

// One line icon per service, 24×24 stroke space — order matches dict items.
const ICONS: ReactNode[] = [
  // Software development — app window + code
  <>
    <rect x="2.5" y="4" width="19" height="16" rx="2.5" />
    <path d="M2.5 8.5h19" />
    <path d="M9.5 12 7 14.5 9.5 17M14.5 12l2.5 2.5-2.5 2.5" />
  </>,
  // Oracle APEX — app window + dashboard
  <>
    <rect x="2.5" y="4" width="19" height="16" rx="2.5" />
    <path d="M2.5 8.5h19" />
    <circle cx="8.5" cy="14.25" r="2.9" />
    <path d="M8.5 11.35v2.9h2.9" />
    <path d="M14.75 12.5h4M14.75 16h4" />
  </>,
  // Digital transformation — document
  <>
    <path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8z" />
    <path d="M14 2.5V8h5.5" />
    <path d="M8.5 12.5h7M8.5 16h5" />
  </>,
  // IT infrastructure — server rack
  <>
    <rect x="2.5" y="3" width="19" height="7.5" rx="2" />
    <rect x="2.5" y="13.5" width="19" height="7.5" rx="2" />
    <path d="M6.5 6.75h.01M6.5 17.25h.01" />
  </>,
  // System integrations — joined pieces
  <>
    <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
    <path d="M12 3.5v17M3.5 12h17" />
    <circle cx="12" cy="7.75" r="1.5" />
    <circle cx="16.25" cy="12" r="1.5" />
  </>,
  // Consulting — people
  <>
    <circle cx="9" cy="7.5" r="3.5" />
    <path d="M2.5 20.5v-1.5a4.5 4.5 0 0 1 4.5-4.5h4a4.5 4.5 0 0 1 4.5 4.5v1.5" />
    <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M21.5 20.5v-1.5a4.5 4.5 0 0 0-3-4.25" />
  </>,
];

const SVG_NS = "http://www.w3.org/2000/svg";

export default function Services({ dict }: { dict: Dict }) {
  const s = dict.services;
  const ref = useRef<HTMLElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const overlay = useRef<SVGSVGElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        gsap.to(".srv-h2", {
          clipPath: "inset(0 0% 0 0)",
          duration: 1.1,
          ease: "power4.out",
          scrollTrigger: { trigger: ref.current, start: "top 75%" },
        });
        gsap.utils.toArray<HTMLElement>(".svc-item").forEach((el) => {
          gsap.from(el, {
            y: 28,
            autoAlpha: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        });
      });

      // Decorative connectors between cards. Endpoints are anchored to real
      // elements (icon tiles, number chips, titles), so they're measured from
      // the DOM and rebuilt on resize.
      mm.add(ZIGZAG, () => {
        const gridEl = grid.current;
        const svg = overlay.current;
        if (!gridEl || !svg) return;

        const motionOk = window.matchMedia(MOTION_OK).matches;
        let played = !motionOk; // reduced motion: render final state, never animate
        let anims: (gsap.core.Tween | gsap.core.Timeline)[] = [];

        const build = () => {
          anims.forEach((a) => {
            a.scrollTrigger?.kill();
            a.kill();
          });
          anims = [];

          const gr = gridEl.getBoundingClientRect();
          if (gr.width === 0) return;
          svg.setAttribute("viewBox", `0 0 ${gr.width} ${gr.height}`);
          svg.replaceChildren();

          // Rects compensated for the owning card's in-flight entrance
          // transform, so connectors anchor to where elements settle, not
          // where they happen to be mid-animation.
          const rel = (target: Element) => {
            const r = target.getBoundingClientRect();
            const host = target.closest(".svc-item");
            const dx = host ? Number(gsap.getProperty(host, "x")) || 0 : 0;
            const dy = host ? Number(gsap.getProperty(host, "y")) || 0 : 0;
            return {
              left: r.left - gr.left - dx,
              right: r.right - gr.left - dx,
              top: r.top - gr.top - dy,
              bottom: r.bottom - gr.top - dy,
              cx: (r.left + r.right) / 2 - gr.left - dx,
              cy: (r.top + r.bottom) / 2 - gr.top - dy,
            };
          };
          const el = <K extends keyof SVGElementTagNameMap>(
            tag: K,
            attrs: Record<string, string | number>
          ) => {
            const node = document.createElementNS(SVG_NS, tag);
            for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, `${v}`);
            svg.appendChild(node);
            return node;
          };

          type Connector = {
            path: SVGPathElement;
            dots: SVGCircleElement[];
            signal: SVGCircleElement;
            length: number;
          };
          const connectors: Connector[] = [];

          const items = Array.from(gridEl.querySelectorAll<HTMLElement>(".svc-item"));
          for (let k = 0; k * 2 + 1 < items.length; k++) {
            const left = items[k * 2];
            const right = items[k * 2 + 1];
            const next = items[k * 2 + 2];
            const leftIcon = left.querySelector("[data-svc-icon]");
            const rightIcon = right.querySelector("[data-svc-icon]");
            if (!leftIcon || !rightIcon) continue;

            // Horizontal run: from directly under the left card's icon to the
            // bottom-left edge of the right card's (lower-offset) icon.
            const li = rel(leftIcon);
            const ri = rel(rightIcon);
            const x1 = li.cx;
            const x2 = ri.left - 14;
            // Sits at the bottom corner of the right icon tile, but never
            // higher than just below the left card's text.
            const y = Math.max(rel(left).bottom + 24, ri.bottom - 6);
            let d = `M ${x1} ${y} L ${x2} ${y}`;
            const pts: [number, number][] = [
              [x1, y],
              [x2, y],
            ];

            // Diagonal sweep down-left, pointing at the next pair's number
            // chip (ends just above it, clear of the text).
            if (next) {
              const chip = next.querySelector("[data-svc-chip]");
              if (chip) {
                const c = rel(chip);
                const ex = c.cx;
                const ey = c.top - 12;
                d += ` L ${ex} ${ey}`;
                pts.push([ex, ey]);
              }
            }

            const path = el("path", { d, class: "svc-line", fill: "none" }) as SVGPathElement;
            const dots = pts.map(
              ([x, cy]) => el("circle", { cx: x, cy, r: 3.5, class: "svc-dot" }) as SVGCircleElement
            );
            const signal = el("circle", { cx: 0, cy: 0, r: 2.5, class: "svc-signal" }) as SVGCircleElement;
            connectors.push({ path, dots, signal, length: path.getTotalLength() });
          }

          // Ambient motion once the connectors are visible: node dots breathe,
          // and a signal pulse periodically travels down each connector.
          const startAmbient = () => {
            if (!motionOk) return;
            connectors.forEach(({ path, dots, signal, length }, k) => {
              dots.forEach((dotEl, j) => {
                anims.push(
                  gsap.to(dotEl, {
                    attr: { r: 5 },
                    opacity: 0.45,
                    duration: 1.3 + j * 0.2,
                    ease: "sine.inOut",
                    repeat: -1,
                    yoyo: true,
                    delay: k * 0.35 + j * 0.5,
                  })
                );
              });
              const travel = gsap
                .timeline({ repeat: -1, repeatDelay: 2.4 + k * 0.6, delay: 1 + k * 1.1 })
                .set(signal, { autoAlpha: 1 })
                .to(signal, {
                  motionPath: { path, alignOrigin: [0.5, 0.5] },
                  duration: Math.max(length / 260, 1),
                  ease: "power1.inOut",
                })
                .to(signal, { autoAlpha: 0, duration: 0.25 }, "<90%");
              anims.push(travel);
            });
          };

          if (played) {
            startAmbient();
            return;
          }

          // First reveal: each connector draws in, its dots pop, then ambient
          // motion takes over.
          const paths = connectors.map((c) => c.path);
          const allDots = connectors.flatMap((c) => c.dots);
          gsap.set(paths, { drawSVG: "0%" });
          gsap.set(allDots, { autoAlpha: 0, attr: { r: 1 } });
          const tl = gsap.timeline({
            scrollTrigger: { trigger: gridEl, start: "top 70%", once: true },
            onComplete: () => {
              played = true;
              startAmbient();
            },
          });
          connectors.forEach(({ path, dots }, k) => {
            const at = k * 0.45;
            tl.to(path, { drawSVG: "100%", duration: 1, ease: "power2.inOut" }, at);
            dots.forEach((dotEl, j) => {
              tl.to(
                dotEl,
                { autoAlpha: 1, attr: { r: 3.5 }, duration: 0.35, ease: "back.out(3)" },
                at + 0.15 + j * 0.3
              );
            });
          });
          anims.push(tl);
        };

        build();
        const ro = new ResizeObserver(() => build());
        ro.observe(gridEl);
        return () => {
          anims.forEach((a) => {
            a.scrollTrigger?.kill();
            a.kill();
          });
          ro.disconnect();
          svg.replaceChildren();
        };
      });
    },
    { scope: ref }
  );

  const title = s.title.replace(/\.$/, "");

  return (
    <section
      id="services"
      ref={ref}
      className="relative overflow-hidden bg-[var(--bg-inset)] py-24 text-white lg:py-32"
    >
      {/* Dotted wave, bottom-left — decorative */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage: "radial-gradient(rgba(122,216,210,0.55) 1px, transparent 1.5px)",
          backgroundSize: "18px 18px",
          maskImage: "radial-gradient(ellipse 55% 45% at 0% 100%, black, transparent 72%)",
        }}
      />

      <div className="relative mx-auto grid max-w-[1280px] gap-16 px-6 lg:grid-cols-[minmax(250px,310px)_1fr] lg:gap-16 lg:px-10">
        {/* Intro column */}
        <div className="lg:sticky lg:top-32 lg:self-start">
          <div className="mono flex items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-[var(--brand-teal-bright)]">
            <span aria-hidden className="h-px w-6 bg-[var(--brand-teal-bright)]" />
            {s.eyebrow}
          </div>
          <h2 className="srv-h2 mask-reveal mt-6 text-[clamp(2.2rem,3.6vw,3.3rem)] font-medium leading-[1.08] tracking-[-0.02em]">
            {title}
            <span className="text-[var(--brand-teal-bright)]">.</span>
          </h2>
          <div aria-hidden className="mt-9 h-[2px] w-14 bg-[var(--brand-teal-bright)]" />
          <p className="mt-9 max-w-[280px] text-[17px] leading-relaxed text-white/60">{s.body}</p>
        </div>

        {/* Zigzag service list */}
        <div ref={grid} className="relative">
          <svg
            ref={overlay}
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
          />
          <div className="flex flex-col gap-14 lg:gap-28">
            {Array.from({ length: Math.ceil(s.items.length / 2) }, (_, k) => (
              <div key={k} className="grid items-start gap-14 lg:grid-cols-2 lg:gap-x-10">
                {s.items.slice(k * 2, k * 2 + 2).map((it, j) => {
                  const i = k * 2 + j;
                  return (
                    <div key={i} className={`svc-item flex items-start gap-6 ${j === 1 ? "lg:mt-24" : ""}`}>
                      <div
                        data-svc-icon
                        className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.01] text-[var(--brand-teal-soft)]"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-10 w-10"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          {ICONS[i]}
                        </svg>
                      </div>
                      <div className="pt-1">
                        <div className="flex items-center gap-3">
                          <span
                            data-svc-chip
                            className="mono grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--brand-teal-bright)]/50 text-[11px] text-[var(--brand-teal-bright)]"
                          >
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <h3 data-svc-title className="text-[1.2rem] font-medium leading-tight tracking-[-0.01em]">
                            {it.k}
                          </h3>
                        </div>
                        <p className="mt-3 max-w-[280px] text-[15px] leading-relaxed text-white/60 lg:pl-12">
                          {it.v}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
