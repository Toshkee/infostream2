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
