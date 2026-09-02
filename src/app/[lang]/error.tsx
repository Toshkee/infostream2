"use client";

import { useEffect, useState } from "react";

type Copy = { title: string; body: string; retry: string };

// Last-resort strings if the data block is missing (e.g. the layout itself
// failed to render). Real copy lives in the dictionaries under `errorPage`.
const FALLBACK: Copy = {
  title: "Something went wrong",
  body: "An unexpected error interrupted this page. You can try again.",
  retry: "Try again",
};

// Branded error boundary for the [lang] segment. It renders inside the layout
// (so globals.css + fonts are available) but receives no route params and
// cannot load the dictionary; the layout hands it the localised copy through
// an inert <script id="i18n-error" type="application/json"> block instead.
function readCopy(): Copy {
  if (typeof document === "undefined") return FALLBACK;
  try {
    const raw = document.getElementById("i18n-error")?.textContent;
    const parsed = raw ? (JSON.parse(raw) as Partial<Copy>) : null;
    if (parsed && typeof parsed.title === "string" && typeof parsed.body === "string" && typeof parsed.retry === "string")
      return parsed as Copy;
  } catch {
    // fall through
  }
  return FALLBACK;
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [t] = useState<Copy>(readCopy);

  useEffect(() => {
    // Surface the error for observability without crashing the boundary.
    console.error(error);
  }, [error]);

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
