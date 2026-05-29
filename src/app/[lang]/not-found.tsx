import Link from "next/link";

// Branded 404. Rendered inside the [lang] layout (globals + fonts loaded).
// not-found has no access to the lang param, so it shows both locales.
export default function NotFound() {
  return (
    <div className="min-h-[100svh] flex flex-col items-center justify-center bg-[var(--bg-inset)] text-white px-6 text-center">
      <div className="mono text-[11px] tracking-[0.3em] uppercase text-[var(--brand-teal-bright)]">
        404
      </div>
      <h1 className="mt-5 text-[clamp(1.8rem,5vw,3rem)] font-semibold tracking-[-0.025em] leading-tight">
        Page not found
      </h1>
      <p className="mt-4 text-white/60 max-w-md leading-relaxed">
        The page you’re looking for doesn’t exist or has moved.
        <br />
        <span className="text-white/40">
          Stranica koju tražite ne postoji ili je premještena.
        </span>
      </p>
      <Link
        href="/eng"
        className="mt-9 mono text-[11px] tracking-[0.2em] uppercase px-5 py-3 rounded-full bg-[var(--brand-red)] text-white hover:bg-[var(--brand-red-deep)] transition-colors"
      >
        Back to home
      </Link>
    </div>
  );
}
