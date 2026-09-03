"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Dict, Locale } from "@/lib/dictionaries";
import { htmlLang, localeNames } from "@/lib/locales";
import { smoothScrollTo } from "@/components/providers/SmoothScroll";

const SECTIONS = ["expertise", "platform", "clients", "technology", "security", "contact"] as const;
type Section = (typeof SECTIONS)[number];

// `home` is the homepage: section links are in-page anchors and the pill
// stays hidden over the hero. Elsewhere (the expertise subpages) the links
// point back to the homepage sections and the pill is present from the start.
export default function Navbar({ nav, lang, home = true }: { nav: Dict["nav"]; lang: Locale; home?: boolean }) {
  const other: Locale = lang === "eng" ? "mne" : "eng";
  // Swap the locale segment and stay on the same page rather than dumping the
  // visitor on the other locale's homepage. Expertise slugs are identical in
  // every dictionary, so the rest of the path carries over verbatim.
  const pathname = usePathname();
  const otherHref = pathname ? pathname.replace(/^\/[^/]*/, `/${other}`) : `/${other}`;
  const target = (id: string) => (home ? `#${id}` : `/${lang}#${id}`);
  const [scrolled, setScrolled] = useState(false);
  // The pill stays hidden over the hero and slides in as the visitor scrolls
  // toward the expertise section (~60% of the first viewport).
  const [shown, setShown] = useState(!home);
  const [active, setActive] = useState<Section | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const intersecting = useRef(new Set<Section>());
  const prevNearTop = useRef(true);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      setShown(!home || y > window.innerHeight * 0.6);
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
  }, [home]);

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
    { id: "expertise",  label: nav.expertise },
    { id: "platform",   label: nav.platform },
    { id: "clients",    label: nav.clients },
    { id: "technology", label: nav.technology },
    { id: "security",   label: nav.security },
    { id: "contact",    label: nav.contact },
  ] as const;

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ease-out ${
        // Keep the compact navigation available on phones from the first frame.
        // Desktop still introduces it after the hero, leaving that opening view quiet.
        // lg:invisible matters as much as the transform: an off-screen header
        // that is merely transparent still takes focus, so the first Tab
        // presses on the homepage would land on a nav nobody can see.
        // visibility is transitionable, so the pill still fades out smoothly.
        shown
          ? "translate-y-0 opacity-100 visible"
          : "translate-y-0 opacity-100 lg:-translate-y-[120%] lg:opacity-0 lg:pointer-events-none lg:invisible"
      }`}
    >
      <div className="mx-auto max-w-[1280px] px-4 max-sm:px-3 sm:px-6 lg:px-10 pt-5 max-sm:pt-3">

        {/* ── Pill ── */}
        <div
          className={`relative flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[rgba(10,14,22,0.82)] backdrop-blur-2xl px-4 max-sm:px-3 sm:px-6 py-3 max-sm:py-2.5 transition-all duration-500 ${
            scrolled
              ? "shadow-[0_20px_60px_-12px_rgba(0,0,0,0.75)]"
              : "shadow-[0_4px_20px_-8px_rgba(0,0,0,0.5)]"
          }`}
        >
          {/* Logo — click scrolls to top */}
          <Link
            href={`/${lang}`}
            onClick={(e) => { if (!home) return; e.preventDefault(); smoothScrollTo(0); }}
            className="flex items-center gap-2 group flex-none"
          >
            <Image
              src="/infostream-logo.webp"
              alt="Infostream"
              width={140}
              height={26}
              priority
              className="h-[22px] max-sm:h-[19px] w-auto transition-opacity duration-200 group-hover:opacity-75"
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
                  href={target(id)}
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
              href={otherHref}
              hrefLang={htmlLang[other]}
              aria-label={localeNames[other].switchLabel}
              className="hidden sm:flex items-center text-[11px] font-semibold tracking-[0.12em] uppercase text-white/60 hover:text-white px-3 py-2.5 rounded-lg hover:bg-white/[0.05] transition-all duration-200"
            >
              {other}
            </Link>

            <a
              href={target("contact")}
              className="text-[13px] max-sm:text-[12px] font-medium px-4 max-sm:px-3 py-2.5 max-sm:py-2 rounded-xl bg-[var(--brand-red)] text-white hover:bg-[var(--brand-red-deep)] transition-colors duration-200"
              style={{ boxShadow: "0 1px 4px rgba(214,59,59,0.25)" }}
            >
              {nav.cta}
            </a>

            {/* Hamburger */}
            <button
              aria-label={mobileOpen ? nav.closeMenu : nav.openMenu}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              onClick={() => setMobileOpen((o) => !o)}
              className="lg:hidden flex flex-col justify-center items-center w-9 max-sm:w-8 h-9 max-sm:h-8 gap-[5px] rounded-lg hover:bg-white/[0.06] transition-colors ml-1"
            >
              <span className={`block w-[18px] h-px bg-white/65 transition-all duration-300 origin-center ${mobileOpen ? "rotate-45 translate-y-[6px]" : ""}`} />
              <span className={`block w-[18px] h-px bg-white/65 transition-all duration-150 ${mobileOpen ? "opacity-0 scale-x-0" : ""}`} />
              <span className={`block w-[18px] h-px bg-white/65 transition-all duration-300 origin-center ${mobileOpen ? "-rotate-45 -translate-y-[6px]" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── Mobile dropdown ── */}
        <div
          id="mobile-menu"
          // Collapsed it is only clipped to zero height, so without `inert` its
          // links stay focusable and a keyboard user tabs through a menu that
          // isn't on screen.
          inert={!mobileOpen}
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
                    href={target(id)}
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
                href={otherHref}
                className="text-[12px] font-medium text-white/60 hover:text-white transition-colors px-3 py-3 -mx-3 rounded-lg"
              >
                {localeNames[other].native}
              </Link>
              <a
                href={target("contact")}
                onClick={() => setMobileOpen(false)}
                className="text-[13px] font-medium px-5 py-2 rounded-xl bg-[var(--brand-red)] text-white"
              >
                {nav.cta}
              </a>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}
