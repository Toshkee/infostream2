"use client";

import { useEffect, useRef } from "react";

export default function Magnetic({
  children,
  strength = 0.35,
  className = "",
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // No magnetic pull for reduced-motion users or coarse (touch) pointers —
    // there's no hover to track, and the rAF loop would run for nothing.
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(pointer: coarse)").matches
    )
      return;
    let raf = 0;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    let prev = 0;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      tx = x * strength;
      ty = y * strength;
    };
    const onLeave = () => { tx = 0; ty = 0; };

    const tick = (now: number) => {
      // Frame-rate-independent damping: 0.18 is the per-frame blend at 60fps;
      // scaling the exponent by dt*60 keeps the feel identical at any refresh rate.
      const dt = prev ? Math.min(0.05, (now - prev) / 1000) : 1 / 60;
      prev = now;
      const k = 1 - Math.pow(1 - 0.18, dt * 60);
      cx += (tx - cx) * k;
      cy += (ty - cy) * k;
      el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [strength]);

  return (
    <span ref={ref} className={`magnet ${className}`}>
      {children}
    </span>
  );
}
