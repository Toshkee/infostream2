import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Arms a `.mask-reveal` heading (clips it via the `.mask-reveal-armed` class)
 * and releases it as a CSS clip-path transition when it scrolls into view.
 *
 * Call inside a useGSAP() context AFTER any reduced-motion early-return —
 * reduced-motion and no-JS clients then simply keep the heading visible.
 * The ScrollTrigger created here is tracked by the surrounding context, so
 * cleanup stays automatic.
 */
export function maskReveal(selector: string) {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return;
  el.classList.add("mask-reveal-armed");
  ScrollTrigger.create({
    trigger: el,
    start: "top 85%",
    once: true,
    onEnter: () => {
      // Next frame, so "armed" and "go" never land in the same style flush.
      requestAnimationFrame(() => el.classList.add("mask-reveal-go"));
    },
  });
}
