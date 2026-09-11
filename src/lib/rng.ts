/**
 * Deterministic LCG → [0, 1). The same seed always yields the same sequence,
 * so the Starfield backdrop is stable across renders (and identical on every
 * reload), which keeps server and client markup in agreement.
 */
export function seededRng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
