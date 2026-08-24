import { defaultLocale, getDictionary, locales } from "@/lib/dictionaries";
import { Starfield } from "@/components/sections/visuals";
import NotFoundCopy from "@/components/NotFoundCopy";

// Branded 404, thrown here by notFound() in [lang]/[...rest] (which is what
// gives the response a real 404 status — rendering this UI from a page would
// return 200). not-found gets no route params, so the localised strings for
// every locale are loaded at build time and NotFoundCopy picks one from the
// URL on the client. Nothing here touches a request, so the [lang] segment
// still prerenders.
export default async function NotFound() {
  const dicts = await Promise.all(locales.map((l) => getDictionary(l)));
  const copy = Object.fromEntries(
    locales.map((l, i) => [l, dicts[i].notFound]),
  );

  return (
    <div className="relative min-h-[100svh] overflow-hidden flex flex-col items-center justify-center bg-[var(--bg-inset)] text-white px-6 text-center">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% 45%, #19223a 0%, #0d111c 70%, #07090f 100%)",
        }}
      />
      <Starfield count={70} seed={0x404} strength={0.5} bias={false} />
      <div className="relative z-10 flex flex-col items-center">
        <div className="mono text-[35px] tracking-[0.3em] uppercase text-[var(--brand-teal-bright)]">
          404
        </div>
        <NotFoundCopy copy={copy} defaultLocale={defaultLocale} />
      </div>
    </div>
  );
}
