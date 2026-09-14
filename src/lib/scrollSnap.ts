import type ScrollTrigger from "gsap/ScrollTrigger";
import { isScrollSettled, smoothScrollTo } from "@/components/providers/SmoothScroll";

/* ─── Stop snapping for the scrubbed pins ───
   Every reveal in the pinned sections is a pure function of scroll position,
   so wherever the visitor stops is where a crossfade freezes — release
   halfway between two stops and you get a half-clipped title over a ghost of
   the outgoing scene. This settles an idle scroll onto the nearest stop.

   Deliberately NOT ScrollTrigger's own `snap`: its tween drives the native
   scroller, which Lenis reverts from its own rAF loop — the observed result
   was the pin landing visibly offset, with a band of the next section showing
   above it. Movement goes through smoothScrollTo (Lenis when it is running)
   for the same reason. */

export function attachStopSnap(
  getTrigger: () => ScrollTrigger | null,
  /** Stop positions in trigger-progress space (0..1), ascending. */
  stops: number[],
  { idleMs = 160, tolerance = 0.005 }: { idleMs?: number; tolerance?: number } = {}
): () => void {
  let timer = 0;

  const settle = () => {
    const t = getTrigger();
    if (!t || !t.isActive) return;
    // Still travelling — wait for the gesture to actually land rather than
    // snapping from wherever a stalled frame left it (which reads as the page
    // yanking backwards mid-flick).
    if (!isScrollSettled()) {
      timer = window.setTimeout(settle, idleMs);
      return;
    }
    const p = t.progress;
    // Leave the pin edges alone — snapping there would trap the visitor
    // inside the section as they try to scroll past it.
    if (p <= 0.001 || p >= 0.999) return;
    const nearest = stops.reduce((a, b) => (Math.abs(b - p) < Math.abs(a - p) ? b : a));
    // Already settled (or landed within a pixel or two of the target — the
    // guard that keeps the smooth scroll from re-triggering itself).
    if (Math.abs(nearest - p) < tolerance) return;
    smoothScrollTo(t.start + nearest * (t.end - t.start), 0.5);
  };

  const onScroll = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(settle, idleMs);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  return () => {
    window.clearTimeout(timer);
    window.removeEventListener("scroll", onScroll);
  };
}
