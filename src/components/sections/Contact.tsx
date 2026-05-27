"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import type { Dict } from "@/lib/dictionaries";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function Contact({ dict }: { dict: Dict }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.to(".cta-h2", {
        clipPath: "inset(0 0% 0 0)",
        duration: 1.2,
        ease: "power4.out",
        scrollTrigger: { trigger: ".cta-h2", start: "top 85%" },
      });
      gsap.from(".cta-item", {
        opacity: 0,
        y: 18,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.1,
        scrollTrigger: { trigger: ".cta-list", start: "top 85%" },
      });

      gsap.fromTo(
        ".cta-underline",
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.1,
          scrollTrigger: { trigger: ".cta-list", start: "top 80%" },
        }
      );
    },
    { scope: ref }
  );

  // Magnetic hover on contact links
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const links = ref.current?.querySelectorAll<HTMLElement>("[data-magnetic]");
    if (!links) return;
    const cleanups: (() => void)[] = [];
    links.forEach((el) => {
      const onMove = (e: MouseEvent) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        gsap.to(el, { x: x * 0.25, y: y * 0.35, duration: 0.4, ease: "power3.out" });
      };
      const onLeave = () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1,0.4)" });
      };
      el.addEventListener("mousemove", onMove);
      el.addEventListener("mouseleave", onLeave);
      cleanups.push(() => {
        el.removeEventListener("mousemove", onMove);
        el.removeEventListener("mouseleave", onLeave);
      });
    });
    return () => cleanups.forEach((c) => c());
  }, []);

  return (
    <section id="contact" ref={ref} className="relative py-28 lg:py-36 border-t hairline overflow-hidden">
      <div className="relative z-10 mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-6 cta-heading">
            <div className="mono text-[11px] tracking-[0.25em] uppercase text-[var(--brand-red)] flex items-center gap-2">
              <span className="h-px w-6 bg-[var(--brand-red)]" />
              {dict.contact.eyebrow}
            </div>
            <h2 className="cta-h2 mask-reveal mt-5 text-[clamp(2rem,4vw,3.4rem)] leading-[1.04] tracking-[-0.02em] font-medium">
              {dict.contact.title}
            </h2>
            <p className="mt-6 text-[var(--fg-dim)] leading-relaxed max-w-md">
              {dict.contact.body}
            </p>
          </div>

          <div className="lg:col-span-6 lg:pl-10">
            <dl className="cta-list space-y-8">
              <div className="cta-item">
                <dt className="mono text-[11px] tracking-[0.22em] uppercase text-[var(--fg-dim)]">
                  {dict.contact.emailLabel}
                </dt>
                <dd className="mt-2 relative inline-block">
                  <a
                    data-magnetic
                    href={`mailto:${dict.contact.email}`}
                    className="inline-block text-2xl text-[var(--fg)] hover:text-[var(--brand-red)] transition-colors will-change-transform"
                  >
                    {dict.contact.email}
                  </a>
                  <span
                    aria-hidden
                    className="cta-underline absolute left-0 right-0 -bottom-1 h-px bg-[var(--brand-red)] origin-left"
                  />
                </dd>
              </div>
              <div className="cta-item">
                <dt className="mono text-[11px] tracking-[0.22em] uppercase text-[var(--fg-dim)]">
                  {dict.contact.phoneLabel}
                </dt>
                <dd className="mt-2 relative inline-block">
                  <a
                    data-magnetic
                    href={`tel:${dict.contact.phone.replace(/\s/g, "")}`}
                    className="inline-block text-2xl text-[var(--fg)] hover:text-[var(--brand-red)] transition-colors will-change-transform"
                  >
                    {dict.contact.phone}
                  </a>
                  <span
                    aria-hidden
                    className="cta-underline absolute left-0 right-0 -bottom-1 h-px bg-[var(--brand-red)] origin-left"
                  />
                </dd>
              </div>
              <div className="cta-item">
                <dt className="mono text-[11px] tracking-[0.22em] uppercase text-[var(--fg-dim)]">
                  Podgorica
                </dt>
                <dd className="mt-2 text-[var(--fg)] max-w-sm leading-relaxed">
                  {dict.contact.office}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
