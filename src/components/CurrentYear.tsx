"use client";

import { useSyncExternalStore } from "react";

// The year never changes under us while the tab is open, so there is nothing
// to subscribe to — but useSyncExternalStore is still the right tool: it is
// what lets the server and client render different values without a hydration
// mismatch. Same pattern as usePrefersReducedMotion.
const subscribe = () => () => {};
const getSnapshot = () => new Date().getFullYear();

/**
 * The copyright year, corrected in the browser.
 *
 * The footer renders inside a statically generated page, so a bare
 * `new Date().getFullYear()` freezes at build time and reads a year out of
 * date every January until someone redeploys. The build-time value is what the
 * server renders and what hydration matches, so crawlers and no-JS visitors
 * still see a sensible year; the client then re-reads the real one.
 */
export default function CurrentYear({ buildYear }: { buildYear: number }) {
  return <>{useSyncExternalStore(subscribe, getSnapshot, () => buildYear)}</>;
}
