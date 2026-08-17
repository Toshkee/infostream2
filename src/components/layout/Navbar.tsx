"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Dict, Locale } from "@/lib/dictionaries";
import { smoothScrollTo } from "@/components/providers/SmoothScroll";

const SECTIONS = ["expertise", "platform", "clients", "technology", "security", "contact"] as const;
type Section = (typeof SECTIONS)[number];

export default function Navbar({ dict, lang }: { dict: Dict; lang: Locale }) {
  const other: Locale = lang === "eng" ? "mne" : "eng";
  const [scrolled, setScrolled] = useState(false);
  // The pill stays hidden over the hero and slides in as the visitor scrolls
  // toward the expertise section (~60% of the first viewport).
  const [shown, setShown] = useState(false);
  const [active, setActive] = useState<Section | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const intersecting = useRef(new Set<Section>());
  const prevNearTop = useRef(true);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      setShown(y > window.innerHeight * 0.6);
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
    return () => window.removeEventListener("scroll", close);
  }, [mobileOpen]);

  const links = [
    { id: "expertise",  label: dict.nav.expertise },
    { id: "platform",   label: dict.nav.platform },
    { id: "clients",    label: dict.nav.clients },
    { id: "technology", label: dict.nav.technology },
    { id: "security",   label: dict.nav.security },
    { id: "contact",    label: dict.nav.contact },
  ] as const;

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ease-out ${
        shown ? "translate-y-0 opacity-100" : "-translate-y-[120%] opacity-0 pointer-events-none"
      }`}
    >
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
            onClick={(e) => { e.preventDefault(); smoothScrollTo(0); }}
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
            className="hidden lg:flex items-center gap-7 text-[13.5px] font-medium"
          >
            {links.map(({ id, label }) => {
              const isActive = active === id;
              return (
                <a
                  key={id}
                  href={`#${id}`}
                  aria-current={isActive ? "true" : undefined}
                  className={`transition-colors duration-200 ${
                    isActive ? "text-[var(--brand-teal-bright)]" : "text-white/60 hover:text-white"
                  }`}
                >
                  {label}
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
              className="hidden sm:flex items-center text-[11px] font-semibold tracking-[0.12em] uppercase text-white/60 hover:text-white px-3 py-2.5 rounded-lg hover:bg-white/[0.05] transition-all duration-200"
            >
              {other}
            </Link>

            <a
              href="#contact"
              className="text-[13px] font-medium px-4 py-2.5 rounded-xl bg-[var(--brand-red)] text-white hover:bg-[var(--brand-red-deep)] transition-colors duration-200"
              style={{ boxShadow: "0 1px 4px rgba(214,59,59,0.25)" }}
            >
              {dict.nav.cta}
            </a>

            {/* Hamburger */}
            <button
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileOpen((o) => !o)}
              className="lg:hidden flex flex-col justify-center items-center w-9 h-9 gap-[5px] rounded-lg hover:bg-white/[0.06] transition-colors ml-1"
            >
              <span className={`block w-[18px] h-px bg-white/65 transition-all duration-300 origin-center ${mobileOpen ? "rotate-45 translate-y-[6px]" : ""}`} />
              <span className={`block w-[18px] h-px bg-white/65 transition-all duration-150 ${mobileOpen ? "opacity-0 scale-x-0" : ""}`} />
              <span className={`block w-[18px] h-px bg-white/65 transition-all duration-300 origin-center ${mobileOpen ? "-rotate-45 -translate-y-[6px]" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── Mobile dropdown ── */}
        <div
          className={`lg:hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
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
                    aria-current={isActive ? "true" : undefined}
                    className={`flex items-center gap-3 px-3 py-3.5 rounded-xl text-[14px] font-medium transition-colors duration-150 ${
                      isActive
                        ? "text-[var(--brand-teal-bright)] bg-[rgba(72,184,177,0.08)]"
                        : "text-white/60 hover:text-white hover:bg-white/[0.04]"
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
                    {label}
                  </a>
                );
              })}
            </nav>

            <div className="mt-2 pt-3 border-t border-white/[0.06] flex items-center justify-between px-3">
              <Link
                href={`/${other}`}
                className="text-[12px] font-medium text-white/60 hover:text-white transition-colors px-3 py-3 -mx-3 rounded-lg"
              >
                {other === "mne" ? "Crnogorski" : "English"}
              </Link>
              <a
                href="#contact"
                onClick={() => setMobileOpen(false)}
                className="text-[13px] font-medium px-5 py-2 rounded-xl bg-[var(--brand-red)] text-white"
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
