"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Dict, Locale } from "@/lib/dictionaries";

gsap.registerPlugin(useGSAP);

type Role = "user" | "assistant";
interface Msg {
  id: number;
  role: Role;
  content: string;
  /** Newly-arrived assistant reply that should type itself in via GSAP. */
  animate?: boolean;
}

let counter = 0;
const nextId = () => ++counter;

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function Assistant({ dict, lang }: { dict: Dict; lang: Locale }) {
  const t = dict.assistant;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const iconChatRef = useRef<SVGSVGElement>(null);
  const iconCloseRef = useRef<SVGSVGElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const wasOpen = useRef(false);

  const scrollToEnd = useCallback(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // ── Launcher entrance + idle pulse ring (once, on mount) ──────────────────
  useGSAP(
    () => {
      const btn = launcherRef.current;
      if (!btn) return;
      if (prefersReduced()) {
        gsap.set(btn, { opacity: 1, scale: 1, y: 0 });
        return;
      }
      gsap.fromTo(
        btn,
        { opacity: 0, scale: 0.4, y: 24 },
        { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: "back.out(1.7)", delay: 0.7 }
      );
      const ring = btn.querySelector("[data-ring]");
      if (ring) {
        gsap.fromTo(
          ring,
          { opacity: 0.5, scale: 0.85 },
          {
            opacity: 0,
            scale: 1.9,
            duration: 2.2,
            ease: "power2.out",
            repeat: -1,
            delay: 1.4,
          }
        );
      }
    },
    { scope: rootRef }
  );

  // ── Open / close the panel ────────────────────────────────────────────────
  useGSAP(
    () => {
      const panel = panelRef.current;
      const chat = iconChatRef.current;
      const close = iconCloseRef.current;
      if (!panel) return;
      const reduced = prefersReduced();

      // Morph the launcher glyph between chat ↔ chevron.
      if (chat && close) {
        gsap.to(chat, { autoAlpha: open ? 0 : 1, rotate: open ? -90 : 0, duration: reduced ? 0 : 0.3, ease: "power2.out" });
        gsap.to(close, { autoAlpha: open ? 1 : 0, rotate: open ? 0 : 90, duration: reduced ? 0 : 0.3, ease: "power2.out" });
      }

      if (open) {
        gsap.set(panel, { visibility: "visible", pointerEvents: "auto" });
        if (reduced) {
          gsap.set(panel, { opacity: 1, scale: 1, y: 0 });
        } else {
          gsap.fromTo(
            panel,
            { opacity: 0, scale: 0.86, y: 10, transformOrigin: "bottom right" },
            { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "power3.out" }
          );
          gsap.fromTo(
            panel.querySelectorAll("[data-stagger]"),
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: "power2.out", delay: 0.12 }
          );
        }
        scrollToEnd();
      } else {
        if (reduced) {
          gsap.set(panel, { opacity: 0, visibility: "hidden", pointerEvents: "none" });
        } else {
          gsap.to(panel, {
            opacity: 0,
            scale: 0.92,
            y: 10,
            duration: 0.28,
            ease: "power2.in",
            transformOrigin: "bottom right",
            onComplete: () => gsap.set(panel, { visibility: "hidden", pointerEvents: "none" }),
          });
        }
      }
    },
    { dependencies: [open], scope: rootRef }
  );

  // ── Esc to close + focus the input on open + contain Tab within the panel ──
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const f = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea, a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      const here = document.activeElement;
      const inside = panel.contains(here);
      if (e.shiftKey && (here === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (here === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const id = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(id);
    };
  }, [open]);

  // Return focus to the launcher when the panel closes.
  useEffect(() => {
    if (wasOpen.current && !open) launcherRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  // Keep the transcript pinned to the latest message.
  useEffect(() => {
    scrollToEnd();
  }, [messages, loading, scrollToEnd]);

  // ── Send a message ────────────────────────────────────────────────────────
  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || loading) return;
      setError(null);

      const userMsg: Msg = { id: nextId(), role: "user", content };
      const history = [...messages, userMsg];
      setMessages(history);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lang,
            messages: history.map(({ role, content }) => ({ role, content })),
          }),
        });
        const data: { reply?: string; error?: string } = await res
          .json()
          .catch(() => ({}));
        if (!res.ok) throw new Error(data.error || t.error);
        const reply = typeof data.reply === "string" && data.reply ? data.reply : t.error;
        setMessages((m) => [
          ...m,
          { id: nextId(), role: "assistant", content: reply, animate: !prefersReduced() },
        ]);
      } catch (e) {
        setError(e instanceof Error ? e.message : t.error);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, lang, t.error]
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  const empty = messages.length === 0;
  // Announce the full assistant reply once, in a dedicated polite region — the
  // visible transcript is NOT a live region, so the GSAP typewriter's
  // per-character mutations are never read out incrementally.
  const latest = messages[messages.length - 1];
  const announce = latest && latest.role === "assistant" ? latest.content : "";

  return (
    <div ref={rootRef} className="fixed bottom-5 right-5 z-[60] print:hidden">
      {/* ── Panel ── */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label={t.title}
        style={{ opacity: 0, visibility: "hidden" }}
        className="absolute bottom-[72px] right-0 flex flex-col overflow-hidden
                   w-[min(380px,calc(100vw-2.5rem))] h-[min(560px,calc(100vh-9rem))]
                   rounded-[20px] border border-white/[0.09]
                   bg-[rgba(10,14,22,0.94)] backdrop-blur-2xl
                   shadow-[0_30px_90px_-24px_rgba(0,0,0,0.85)]"
      >
        {/* Teal top hairline glow — matches the instrument-panel aesthetic */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--brand-teal-bright), transparent)",
            opacity: 0.7,
          }}
        />

        {/* Header */}
        <div
          data-stagger
          className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-white/[0.07]"
        >
          <div className="min-w-0">
            <div className="mono text-[10px] tracking-[0.24em] uppercase text-[var(--brand-teal-bright)] flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span
                  aria-hidden
                  className="absolute inline-flex h-full w-full rounded-full bg-[var(--brand-teal-bright)]"
                  style={{ animation: "pulseDot 1.6s ease-in-out infinite" }}
                />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--brand-teal-bright)]" />
              </span>
              {t.eyebrow}
            </div>
            <h2 className="mt-1 text-white font-medium text-[15px] leading-tight tracking-[-0.01em] truncate">
              {t.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t.close}
            className="flex-none grid place-items-center h-8 w-8 rounded-lg text-white/55 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Transcript */}
        <div
          ref={listRef}
          aria-busy={loading}
          className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3.5 no-scrollbar"
        >
          {empty ? (
            <div data-stagger className="space-y-4">
              <p className="text-white/80 text-[14px] leading-relaxed">{t.greeting}</p>
              <ul className="flex flex-col gap-2">
                {t.suggestions.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => void send(s)}
                      className="group w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl
                                 border border-white/[0.09] bg-white/[0.02] hover:bg-white/[0.05]
                                 hover:border-[var(--brand-teal)]/40 transition-colors"
                    >
                      <span className="text-[var(--brand-teal-bright)] mono text-[12px] leading-none transition-transform group-hover:translate-x-0.5">
                        →
                      </span>
                      <span className="text-white/75 text-[13.5px] leading-snug group-hover:text-white">
                        {s}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2.5 bg-white/[0.08] text-white text-[14px] leading-relaxed whitespace-pre-wrap break-words">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex justify-start gap-2.5">
                  <span
                    aria-hidden
                    className="mt-1.5 flex-none h-1.5 w-1.5 rounded-full bg-[var(--brand-red)]"
                    style={{ boxShadow: "0 0 6px rgba(214,59,59,0.8)" }}
                  />
                  <div className="max-w-[88%] text-white/85 text-[14px] leading-relaxed whitespace-pre-wrap break-words">
                    <AssistantText text={m.content} animate={!!m.animate} onTick={scrollToEnd} />
                  </div>
                </div>
              )
            )
          )}

          {loading && (
            <div className="flex justify-start gap-2.5" role="status">
              <span className="sr-only">{t.thinking}</span>
              <span
                aria-hidden
                className="mt-1.5 flex-none h-1.5 w-1.5 rounded-full bg-[var(--brand-red)]"
                style={{ boxShadow: "0 0 6px rgba(214,59,59,0.8)" }}
              />
              <div className="flex items-center gap-1 py-1.5" aria-hidden>
                <Dot delay="0s" />
                <Dot delay="0.16s" />
                <Dot delay="0.32s" />
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="text-[#f3867f] text-[13px] leading-snug">
              {error}
            </p>
          )}
        </div>

        {/* Screen-reader announcement of the full reply (visual transcript above
            is intentionally not a live region, so typing isn't read per-char). */}
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {announce}
        </p>

        {/* Composer */}
        <form
          onSubmit={onSubmit}
          data-stagger
          className="border-t border-white/[0.07] p-3"
        >
          <div className="flex items-end gap-2 rounded-xl border border-white/[0.1] bg-white/[0.03] focus-within:border-[var(--brand-teal)]/50 transition-colors px-3 py-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t.placeholder}
              aria-label={t.title}
              maxLength={2000}
              className="flex-1 resize-none bg-transparent text-white text-[14px] leading-relaxed placeholder:text-white/45 outline-none max-h-28 no-scrollbar"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              aria-label={t.send}
              className="flex-none grid place-items-center h-8 w-8 rounded-lg bg-[var(--brand-red)] text-white
                         hover:bg-[var(--brand-red-deep)] disabled:opacity-35 disabled:cursor-not-allowed
                         transition-colors"
              style={{ boxShadow: "0 2px 12px rgba(214,59,59,0.3)" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <p className="mt-2 px-1 mono text-[9.5px] tracking-[0.14em] uppercase text-white/55">
            {t.tag}
          </p>
        </form>
      </div>

      {/* ── Launcher ── */}
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? t.close : t.launch}
        aria-expanded={open}
        style={{ opacity: 0 }}
        className="relative grid place-items-center h-14 w-14 rounded-full
                   bg-[var(--brand-red)] text-white hover:bg-[var(--brand-red-deep)]
                   transition-colors"
      >
        <span
          data-ring
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ border: "1.5px solid var(--brand-teal-bright)", opacity: 0 }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ boxShadow: "0 8px 26px -6px rgba(214,59,59,0.6)" }}
        />
        {/* chat glyph */}
        <svg
          ref={iconChatRef}
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className="absolute"
        >
          <path
            d="M4 5.5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3.5V16.5H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M7.5 10h9M7.5 13h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        {/* chevron-down glyph (shown when open) */}
        <svg
          ref={iconCloseRef}
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className="absolute"
          style={{ opacity: 0 }}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

/** Assistant reply that types itself in via GSAP (or appears instantly). */
function AssistantText({
  text,
  animate,
  onTick,
}: {
  text: string;
  animate: boolean;
  onTick?: () => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (!animate) {
        el.textContent = text;
        return;
      }
      const state = { i: 0 };
      el.textContent = "";
      el.classList.add("type-caret");
      gsap.to(state, {
        i: text.length,
        duration: Math.min(2.6, Math.max(0.5, text.length * 0.014)),
        ease: "none",
        onUpdate: () => {
          el.textContent = text.slice(0, Math.round(state.i));
          onTick?.();
        },
        onComplete: () => {
          el.textContent = text;
          el.classList.remove("type-caret");
          onTick?.();
        },
      });
    },
    // Run once for this message; identity is fixed by the keyed parent.
    { dependencies: [] }
  );

  return <span ref={ref} />;
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-1.5 w-1.5 rounded-full bg-white/45"
      style={{ animation: "pulseDot 1.1s ease-in-out infinite", animationDelay: delay }}
    />
  );
}
