import type { Dict } from "@/lib/dictionaries";

export default function Footer({ dict }: { dict: Dict }) {
  return (
    <footer className="relative overflow-hidden bg-[var(--bg-inset)] text-white">
      {/* Top scope sweep — thin teal beam traverses the edge */}
      <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
      <div className="absolute top-0 left-0 h-px w-1/3 bg-gradient-to-r from-transparent via-[var(--brand-teal-bright)] to-transparent scope-sweep" />

      {/* Faint grid backdrop for depth */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      <div className="relative mx-auto max-w-[1280px] px-6 lg:px-10 pt-16 pb-10">
        <div className="grid gap-12 md:grid-cols-3 items-start">
          {/* Lockup column */}
          <div>
            <div className="flex items-center gap-3">
              <svg width="32" height="28" viewBox="0 0 78 72" aria-hidden>
                <rect x="0"  y="40" width="10" height="32" rx="1.5" fill="var(--brand-teal)" className="footer-bar" style={{ animationDelay: "0s" }} />
                <rect x="14" y="24" width="10" height="48" rx="1.5" fill="var(--brand-teal)" className="footer-bar" style={{ animationDelay: "0.18s" }} />
                <rect x="28" y="4"  width="10" height="68" rx="1.5" fill="var(--brand-teal)" className="footer-bar" style={{ animationDelay: "0.36s" }} />
                <rect x="42" y="14" width="10" height="58" rx="1.5" fill="var(--brand-teal)" className="footer-bar" style={{ animationDelay: "0.54s" }} />
                <rect x="56" y="30" width="10" height="42" rx="1.5" fill="var(--brand-teal)" className="footer-bar" style={{ animationDelay: "0.72s" }} />
              </svg>
              <span
                className="font-semibold leading-none"
                style={{
                  fontSize: 24,
                  letterSpacing: "-0.025em",
                  color: "var(--brand-red)",
                  fontFamily: "var(--font-sans-stack), sans-serif",
                }}
              >
                infostream
              </span>
            </div>
            <p className="mt-5 text-sm text-white/55 max-w-xs leading-relaxed">{dict.footer.tagline}</p>

            {/* Live status pill */}
            <div className="mt-6 inline-flex items-center gap-2 mono text-[10px] tracking-[0.22em] uppercase text-white/55 border border-white/15 rounded-full px-3 py-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-[var(--brand-teal-bright)] viz-pulse" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--brand-teal-bright)]" />
              </span>
              {dict.footer.status}
            </div>
          </div>

          {/* Credentials column */}
          <div className="mono text-[11px] tracking-[0.18em] uppercase text-white/55 space-y-3">
            <div className="text-white/35 text-[10px]">{dict.footer.certifications}</div>
            <div className="text-white/80">ISO 27001 · ISO 9001</div>
            <div className="text-white/80">{dict.footer.partner}</div>
            <div className="text-white/80">Bitdefender Enterprise</div>
            <div className="text-white/80">{dict.footer.experience}</div>
          </div>

          {/* Contact / legal column */}
          <div className="md:text-right space-y-3">
            <div className="mono text-[10px] tracking-[0.22em] uppercase text-white/55">{dict.footer.location}</div>
            <a href={`mailto:${dict.contact.email}`} className="block mono text-[12px] tracking-[0.1em] text-white hover:text-[var(--brand-teal-bright)] transition-colors">
              {dict.contact.email}
            </a>
          </div>
        </div>

        {/* Bottom hairline + meta row */}
        <div className="mt-14 pt-6 border-t border-white/10 flex flex-col md:flex-row gap-3 md:items-center md:justify-between mono text-[10px] tracking-[0.22em] uppercase text-white/40">
          <div>© {new Date().getFullYear()} Infostream — {dict.footer.rights}</div>
          <div className="flex items-center gap-3">
            <span className="h-px w-6 bg-white/20" />
            <span>{dict.footer.ethos}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
