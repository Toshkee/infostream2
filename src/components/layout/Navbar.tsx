"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { Dict, Locale } from "@/lib/dictionaries";

export default function Navbar({ dict, lang }: { dict: Dict; lang: Locale }) {
  const other: Locale = lang === "eng" ? "mne" : "eng";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10 pt-4">
        <div
          className={`flex items-center justify-between rounded-full border hairline-strong bg-white backdrop-blur-xl px-3 sm:px-4 py-2 transition-shadow duration-500 ${
            scrolled ? "shadow-[0_10px_40px_-20px_rgba(10,14,22,0.35)]" : "shadow-[0_6px_24px_-12px_rgba(10,14,22,0.18)]"
          }`}
        >
          <Link href={`/${lang}`} className="flex items-center gap-2 group pl-1">
            <Image
              src="/infostream-logo.webp"
              alt="Infostream"
              width={140}
              height={26}
              priority
              className="h-6 w-auto group-hover:scale-[1.02] transition-transform"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-7 mono text-[11px] tracking-[0.2em] uppercase text-[var(--fg-dim)]">
            <a href="#platform" className="hover:text-[var(--brand-red)] transition-colors">{dict.nav.platform}</a>
            <a href="#clients" className="hover:text-[var(--brand-red)] transition-colors">{dict.nav.clients}</a>
            <a href="#security" className="hover:text-[var(--brand-red)] transition-colors">{dict.nav.security}</a>
            <a href="#contact" className="hover:text-[var(--brand-red)] transition-colors">{dict.nav.contact}</a>
          </nav>

          <div className="flex items-center gap-1.5">
            <Link
              href={`/${other}`}
              className="mono text-[11px] tracking-[0.2em] uppercase text-[var(--fg-dim)] hover:text-[var(--fg)] px-2.5 py-1 transition-colors"
            >
              {other}
            </Link>
            <a
              href="#contact"
              className="mono text-[11px] tracking-[0.2em] uppercase px-4 py-2 rounded-full bg-[var(--brand-red)] text-white hover:bg-[var(--brand-red-deep)] transition-colors"
            >
              {dict.nav.cta}
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
