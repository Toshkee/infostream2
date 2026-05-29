"use client";

import { useEffect, useState } from "react";

// Read the locale once, at mount, from the <html lang> the layout set.
function detectLocale(): "eng" | "mne" {
  if (typeof document === "undefined") return "eng";
  return document.documentElement.lang.startsWith("sr") ? "mne" : "eng";
}

// Branded error boundary for the [lang] segment. Rendered inside the layout,
// so globals.css + fonts are available. It can't read the server `dict`, so it
// derives locale from the <html lang> the layout already set and picks copy.
const COPY = {
  eng: {
    title: "Something went wrong",
    body: "An unexpected error interrupted this page. You can try again.",
    retry: "Try again",
  },
  mne: {
    title: "Došlo je do greške",
    body: "Neočekivana greška je prekinula ovu stranicu. Možete pokušati ponovo.",
    retry: "Pokušaj ponovo",
  },
} as const;

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale] = useState<"eng" | "mne">(detectLocale);

  useEffect(() => {
    // Surface the error for observability without crashing the boundary.
    console.error(error);
  }, [error]);

  const t = COPY[locale];

  return (
    <div className="min-h-[100svh] flex flex-col items-center justify-center bg-[var(--bg-inset)] text-white px-6 text-center">
      <div className="mono text-[11px] tracking-[0.3em] uppercase text-[var(--brand-red)]">
        error
      </div>
      <h1 className="mt-5 text-[clamp(1.8rem,5vw,3rem)] font-semibold tracking-[-0.025em] leading-tight">
        {t.title}
      </h1>
      <p className="mt-4 text-white/60 max-w-md leading-relaxed">{t.body}</p>
      {error.digest && (
        <code className="mt-3 mono text-[10px] tracking-[0.15em] text-white/30">
          {error.digest}
        </code>
      )}
      <button
        onClick={reset}
        className="mt-9 mono text-[11px] tracking-[0.2em] uppercase px-5 py-3 rounded-full bg-[var(--brand-red)] text-white hover:bg-[var(--brand-red-deep)] transition-colors"
      >
        {t.retry}
      </button>
    </div>
  );
}
