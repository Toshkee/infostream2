import { useEffect, useRef, useState } from "react";

/**
 * Tracks whether an element is within (or near) the viewport.
 *
 * Used to gate the R3F render loop: when the canvas scrolls offscreen we flip
 * `frameloop` to "never" so no GPU/CPU work happens until it returns. Starts
 * `true` so the scene renders on first paint before the observer fires, and
 * uses a positive rootMargin so rendering resumes just before it re-enters view
 * (avoids a blank frame on the way in).
 */
export function useInView<T extends Element>(rootMargin = "200px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return [ref, inView] as const;
}
