import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const getSnapshot = () => window.matchMedia(QUERY).matches;
const getServerSnapshot = () => false;

/**
 * SSR-safe `prefers-reduced-motion`. `useSyncExternalStore` renders the server
 * snapshot (`false`) on the server and during hydration so markup matches — no
 * hydration warning — then immediately re-reads the real preference on the
 * client and tracks live changes.
 *
 * Reading `window.matchMedia` in a `useState` initializer would instead diverge
 * between server (`false`) and client (`true` for reduced-motion users), a
 * hydration mismatch whenever first-paint output depends on it.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * The live preference, read synchronously. Use this INSIDE a `useGSAP`
 * callback instead of the hook's value.
 *
 * `useGSAP` runs in a layout effect, which fires before `useSyncExternalStore`
 * has swapped the hydration snapshot (`false`) for the real one. A callback
 * branching on the hook value therefore runs the motion path once even for a
 * reduced-motion visitor, arming `mask-reveal-armed` / `proc-live`; the
 * follow-up re-render reverts the GSAP context (killing the ScrollTriggers that
 * would have released them) but leaves those classes on the DOM, so headings
 * stay clipped to zero width forever. Reading matchMedia here is correct on the
 * very first pass. Keep the hook as the `dependencies` entry so a mid-session
 * preference change still re-runs the callback.
 */
export const reducedMotionNow = (): boolean =>
  typeof window !== "undefined" && window.matchMedia(QUERY).matches;
