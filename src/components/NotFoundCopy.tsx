"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

type Copy = { title: string; body: string; cta: string };

// The not-found boundary receives no route params, so the locale has to come
// from somewhere else. Reading it from a request header (the old x-locale hop
// through the proxy) works, but headers() is a dynamic API and opting the
// [lang] segment into it costs the homepage its static render — for a page
// almost nobody sees. So the copy for every locale is baked in at build time
// and the right one is picked on the client from the URL.
//
// The prerendered HTML can only carry one locale, so the server snapshot is
// the default one and the client corrects it on hydration; a mne visitor on a
// dead URL sees English for one frame. That is the whole cost, and it buys a
// prerendered homepage.
const subscribe = () => () => {};
const getSnapshot = () => window.location.pathname;

export default function NotFoundCopy({
  copy,
  defaultLocale,
}: {
  copy: Record<string, Copy>;
  defaultLocale: string;
}) {
  const pathname = useSyncExternalStore(subscribe, getSnapshot, () => "/");
  const seg = pathname.split("/")[1] ?? "";
  const lang = seg in copy ? seg : defaultLocale;

  const nf = copy[lang] ?? copy[defaultLocale];

  return (
    <>
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
    </>
  );
}
