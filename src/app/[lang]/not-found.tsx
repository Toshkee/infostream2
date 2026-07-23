import Link from "next/link";
import { headers } from "next/headers";
import { defaultLocale, getDictionary, hasLocale } from "@/lib/dictionaries";
import { Starfield } from "@/components/sections/visuals";

// Branded 404. Rendered inside the [lang] layout (globals + fonts loaded).
// not-found gets no route params — the proxy forwards the matched locale as
// x-locale; the eng fallback covers direct hits that bypass its matcher.
export default async function NotFound() {
  const requestHeaders = await headers();
  const fromProxy = requestHeaders.get("x-locale") ?? "";
  const lang = hasLocale(fromProxy) ? fromProxy : defaultLocale;
  const dict = await getDictionary(lang);
  const nf = dict.notFound;

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
        <h1 className="font-display mt-5 text-[clamp(1.9rem,4.5vw,3.4rem)] leading-[1.05] tracking-[-0.02em] font-medium">
          {nf.title}
        </h1>
        <p className="mt-5 max-w-md text-[15.5px] leading-relaxed text-white/60">{nf.body}</p>
        <Link
          href={`/${lang}`}
          className="mt-9 inline-block rounded-xl bg-[var(--brand-red)] px-6 py-3 text-[14px] font-medium text-white transition-colors duration-200 hover:bg-[var(--brand-red-deep)]"
        >
          {nf.cta}
        </Link>
      </div>
    </div>
  );
}
