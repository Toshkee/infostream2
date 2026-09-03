import type { ReactNode } from "react";

/* Hover / focus tooltip for icon-only controls. The trigger keeps its own
   aria-label (screen readers already announce it), so the bubble is
   decorative and hidden from the accessibility tree. Pure CSS transition:
   opacity + a short slide, cut to zero under reduced motion. */
export default function Tooltip({
  label,
  side = "top",
  children,
}: {
  label: string;
  side?: "top" | "bottom" | "left";
  children: ReactNode;
}) {
  const place =
    side === "left"
      ? "right-full top-1/2 mr-2.5 -translate-y-1/2 translate-x-1 group-hover/tip:translate-x-0 group-focus-within/tip:translate-x-0"
      : side === "bottom"
      ? "left-1/2 top-full mt-2 -translate-x-1/2 -translate-y-1 group-hover/tip:translate-y-0 group-focus-within/tip:translate-y-0"
      : "left-1/2 bottom-full mb-2 -translate-x-1/2 translate-y-1 group-hover/tip:translate-y-0 group-focus-within/tip:translate-y-0";

  return (
    <span className="group/tip relative inline-grid">
      {children}
      <span
        aria-hidden
        className={`pointer-events-none absolute z-20 whitespace-nowrap rounded-md border border-white/10 bg-[#0d111c] px-2.5 py-1.5 text-[11px] font-medium leading-none text-white/85 shadow-[0_6px_20px_-8px_rgba(0,0,0,0.6)]
          opacity-0 scale-[0.96] transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.19,1,0.22,1)] motion-reduce:transition-none
          group-hover/tip:opacity-100 group-hover/tip:scale-100 group-focus-within/tip:opacity-100 group-focus-within/tip:scale-100 ${place}`}
      >
        {label}
      </span>
    </span>
  );
}
