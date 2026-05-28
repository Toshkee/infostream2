"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Dict, Locale } from "@/lib/dictionaries";

const SECTIONS = ["platform", "clients", "technology", "security", "contact"] as const;
type Section = (typeof SECTIONS)[number];

export default function Navbar({ dict, lang }: { dict: Dict; lang: Locale }) {
  const other: Locale = lang === "eng" ? "mne" : "eng";
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<Section | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const intersecting = useRef(new Set<Section>());
  const prevNearTop = useRef(true);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      const nearTop = y < 80;
      if (nearTop) {
        setActive(null);
      } else if (prevNearTop.current) {
        // Just crossed 80px threshold downward — pick whichever section is already intersecting
        const found = SECTIONS.find((id) => intersecting.current.has(id));
        if (found) setActive(found);
      }
      prevNearTop.current = nearTop;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    SECTIONS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            intersecting.current.add(id);
            if (window.scrollY >= 80) setActive(id);
          } else {
            intersecting.current.delete(id);
          }
        },
        { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const close = () => setMobileOpen(false);
    window.addEventListener("scroll", close, { passive: true, once: true });
  }, [mobileOpen]);

  const links = [
    { id: "platform",   label: dict.nav.platform },
    { id: "clients",    label: dict.nav.clients },
    { id: "technology", label: dict.nav.technology },
    { id: "security",   label: dict.nav.security },
    { id: "contact",    label: dict.nav.contact },
  ] as const;

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10 pt-5">

        {/* ── Pill ── */}
        <div
          className={`relative flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[rgba(10,14,22,0.82)] backdrop-blur-2xl px-4 sm:px-6 py-3 transition-all duration-500 ${
            scrolled
              ? "shadow-[0_20px_60px_-12px_rgba(0,0,0,0.75)]"
              : "shadow-[0_4px_20px_-8px_rgba(0,0,0,0.5)]"
          }`}
        >
          {/* Logo — click scrolls to top */}
          <Link
            href={`/${lang}`}
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="flex items-center gap-2 group flex-none"
          >
            <Image
              src="/infostream-logo.webp"
              alt="Infostream"
              width={140}
              height={26}
              priority
              className="h-[22px] w-auto transition-opacity duration-200 group-hover:opacity-75"
            />
          </Link>

          {/* Desktop nav */}
          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-6 mono text-[11px] tracking-[0.18em] uppercase"
          >
            {links.map(({ id, label }) => {
              const isActive = active === id;
              return (
                <a
                  key={id}
                  href={`#${id}`}
                  className={`relative pb-0.5 transition-colors duration-200 ${
                    isActive ? "text-white" : "text-white/38 hover:text-white/70"
                  }`}
                >
                  {label}
                  {/* Teal underline for active */}
                  <span
                    className="absolute bottom-0 left-0 right-0 h-px rounded-full transition-all duration-300"
                    style={{
                      background: "var(--brand-teal-bright)",
                      boxShadow: "0 0 6px var(--brand-teal-bright)",
                      opacity: isActive ? 1 : 0,
                      transform: isActive ? "scaleX(1)" : "scaleX(0)",
                      transformOrigin: "center",
                    }}
                  />
                </a>
              );
            })}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-2 flex-none">
            <Link
              href={`/${other}`}
              hrefLang={other === "mne" ? "sr-ME" : "en"}
              aria-label={other === "mne" ? "Pređi na crnogorski" : "Switch to English"}
              className="hidden sm:flex items-center mono text-[10px] tracking-[0.22em] uppercase text-white/28 hover:text-white/60 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] transition-all duration-200"
            >
              {other}
            </Link>

            <a
              href="#contact"
              className="mono text-[11px] tracking-[0.18em] uppercase px-4 py-[7px] rounded-xl bg-[var(--brand-red)] text-white hover:bg-[var(--brand-red-deep)] transition-colors duration-200"
              style={{ boxShadow: "0 2px 14px rgba(214,59,59,0.3)" }}
            >
              {dict.nav.cta}
            </a>

            {/* Hamburger */}
            <button
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-[5px] rounded-lg hover:bg-white/[0.06] transition-colors ml-1"
            >
              <span className={`block w-[18px] h-px bg-white/65 transition-all duration-300 origin-center ${mobileOpen ? "rotate-45 translate-y-[6px]" : ""}`} />
              <span className={`block w-[18px] h-px bg-white/65 transition-all duration-150 ${mobileOpen ? "opacity-0 scale-x-0" : ""}`} />
              <span className={`block w-[18px] h-px bg-white/65 transition-all duration-300 origin-center ${mobileOpen ? "-rotate-45 -translate-y-[6px]" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── Mobile dropdown ── */}
        <div
          className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
            mobileOpen ? "max-h-[30rem] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
          }`}
        >
          <div
            className="mt-2 rounded-2xl border border-white/[0.07] bg-[rgba(10,14,22,0.96)] backdrop-blur-2xl px-3 py-3"
            style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.65)" }}
          >
            <nav className="flex flex-col">
              {links.map(({ id, label }, i) => {
                const isActive = active === id;
                const delay = `${i * 40}ms`;
                return (
                  <a
                    key={id}
                    href={`#${id}`}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3.5 rounded-xl mono text-[11px] tracking-[0.2em] uppercase transition-colors duration-150 ${
                      isActive
                        ? "text-[var(--brand-teal-bright)] bg-[rgba(72,184,177,0.08)]"
                        : "text-white/42 hover:text-white/80 hover:bg-white/[0.04]"
                    }`}
                    style={{
                      transitionDelay: mobileOpen ? delay : "0ms",
                      opacity: mobileOpen ? 1 : 0,
                      transform: mobileOpen ? "translateX(0)" : "translateX(-10px)",
                      // Use long-hand properties only — no 'transition' shorthand in style
                      transitionProperty: "opacity, transform",
                      transitionDuration: "260ms, 260ms",
                      transitionTimingFunction: "ease, ease",
                    }}
                  >
                    <span
                      className="w-1 h-1 rounded-full flex-none"
                      style={{
                        background: isActive ? "var(--brand-teal-bright)" : "rgba(255,255,255,0.18)",
                        boxShadow: isActive ? "0 0 5px var(--brand-teal-bright)" : "none",
                      }}
                    />
                    {label}
                  </a>
                );
              })}
            </nav>

            <div className="mt-2 pt-3 border-t border-white/[0.06] flex items-center justify-between px-3">
              <Link
                href={`/${other}`}
                className="mono text-[10px] tracking-[0.22em] uppercase text-white/28 hover:text-white/60 transition-colors"
              >
                {other === "mne" ? "Crnogorski" : "English"}
              </Link>
              <a
                href="#contact"
                onClick={() => setMobileOpen(false)}
                className="mono text-[11px] tracking-[0.18em] uppercase px-5 py-2 rounded-xl bg-[var(--brand-red)] text-white"
              >
                {dict.nav.cta}
              </a>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}
