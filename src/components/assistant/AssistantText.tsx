import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";

/** Assistant reply that types itself in via GSAP (or appears instantly). */
export function AssistantText({ text, animate, onTick }: { text: string; animate: boolean; onTick?: () => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  useGSAP(() => {
    const el = ref.current;
    if (!el) return;
    if (!animate) { el.textContent = text; return; }
    const state = { i: 0 };
    el.textContent = "";
    el.classList.add("type-caret");
    gsap.to(state, {
      i: text.length, duration: Math.min(2.6, Math.max(0.5, text.length * 0.014)), ease: "none",
      onUpdate: () => { el.textContent = text.slice(0, Math.round(state.i)); onTick?.(); },
      onComplete: () => { el.textContent = text; el.classList.remove("type-caret"); onTick?.(); },
    });
  }, { dependencies: [] });
  return <span ref={ref} />;
}

export function ThinkingDots() {
  return <div className="flex items-center gap-1 py-1.5" aria-hidden>
    {["0s", "0.16s", "0.32s"].map((delay) => <span key={delay} className="h-1.5 w-1.5 rounded-full bg-white/45" style={{ animation: "pulseDot 1.1s ease-in-out infinite", animationDelay: delay }} />)}
  </div>;
}
