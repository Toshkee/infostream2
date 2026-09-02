"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Dict, Locale } from "@/lib/dictionaries";

// The chat widget carries its own GSAP-driven UI and is not part of the page
// content, so it is split out of the initial bundle and mounted once the
// browser is idle. Until then nothing renders — the launcher appears a beat
// after first paint instead of competing with hero/scroll work for it.
const Assistant = dynamic(() => import("./Assistant"), { ssr: false });

export default function AssistantLoader(props: { copy: Dict["assistant"]; lang: Locale }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Safari still lacks requestIdleCallback; fall back to a short timer.
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => setReady(true), 800);
    return () => window.clearTimeout(id);
  }, []);

  return ready ? <Assistant {...props} /> : null;
}
