"use client";

import { useGSAP } from "@gsap/react";
import { AssistantPanel, type AssistantMessage } from "@/components/assistant/AssistantPanel";
import { conversationWindow, isChatErrorCode } from "@/lib/chatLimits";
import type { Dict, Locale } from "@/lib/dictionaries";
import gsap from "gsap";
import { useCallback, useEffect, useRef, useState } from "react";

gsap.registerPlugin(useGSAP);
let counter = 0;
const nextId = () => ++counter;
const prefersReduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function Assistant({ copy, lang }: { copy: Dict["assistant"]; lang: Locale }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
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
  const scrollToEnd = useCallback(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, []);

  useGSAP(() => {
    const button = launcherRef.current;
    if (!button) return;
    if (prefersReduced()) { gsap.set(button, { opacity: 1, scale: 1, y: 0 }); return; }
    gsap.fromTo(button, { opacity: 0, scale: 0.92, y: 10 }, { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: "power2.out", delay: 0.45 });
  }, { scope: rootRef });
  useGSAP(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const reduced = prefersReduced();
    if (iconChatRef.current && iconCloseRef.current) {
      gsap.to(iconChatRef.current, { autoAlpha: open ? 0 : 1, rotate: open ? -90 : 0, duration: reduced ? 0 : 0.3, ease: "power2.out" });
      gsap.to(iconCloseRef.current, { autoAlpha: open ? 1 : 0, rotate: open ? 0 : 90, duration: reduced ? 0 : 0.3, ease: "power2.out" });
    }
    if (open) {
      gsap.set(panel, { visibility: "visible", pointerEvents: "auto" });
      if (reduced) gsap.set(panel, { opacity: 1, scale: 1, y: 0 });
      else {
        gsap.fromTo(panel, { opacity: 0, scale: 0.86, y: 10, transformOrigin: "bottom right" }, { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "power3.out" });
        gsap.fromTo(panel.querySelectorAll("[data-stagger]"), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: "power2.out", delay: 0.12 });
      }
      scrollToEnd();
    } else if (reduced) gsap.set(panel, { opacity: 0, visibility: "hidden", pointerEvents: "none" });
    else gsap.to(panel, { opacity: 0, scale: 0.92, y: 10, duration: 0.28, ease: "power2.in", transformOrigin: "bottom right", onComplete: () => gsap.set(panel, { visibility: "hidden", pointerEvents: "none" }) });
  }, { dependencies: [open], scope: rootRef });
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); return; }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), textarea, a[href], [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1], inside = panelRef.current.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || !inside)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !inside)) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => { window.removeEventListener("keydown", onKey); window.clearTimeout(timer); };
  }, [open]);
  useEffect(() => { if (wasOpen.current && !open) launcherRef.current?.focus(); wasOpen.current = open; }, [open]);
  useEffect(() => { scrollToEnd(); }, [messages, loading, scrollToEnd]);
  const errorText = useCallback((code?: string) => isChatErrorCode(code) && code !== "generic" ? copy.errors[code] : copy.error, [copy]);
  const send = useCallback(async (text: string) => {
    const content = text.trim(); if (!content || loading) return;
    setError(null);
    const userMessage: AssistantMessage = { id: nextId(), role: "user", content };
    const history = [...messages, userMessage];
    setMessages(history); setInput(""); setLoading(true);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang, messages: conversationWindow(history) }), signal: AbortSignal.timeout(45_000) });
      const data: { reply?: string; code?: string } = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(errorText(data.code));
      const reply = typeof data.reply === "string" && data.reply ? data.reply : copy.error;
      setMessages((current) => [...current, { id: nextId(), role: "assistant", content: reply, animate: !prefersReduced() }]);
    } catch (reason) {
      setMessages((current) => current.filter((message) => message.id !== userMessage.id));
      setInput((current) => current || content);
      setError(reason instanceof Error ? reason.message : copy.error);
    } finally { setLoading(false); }
  }, [copy.error, errorText, lang, loading, messages]);
  const reset = useCallback(() => { setMessages([]); setInput(""); setError(null); inputRef.current?.focus(); }, []);
  const onSubmit = (event: React.FormEvent) => { event.preventDefault(); void send(input); };
  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(input); } };
  return <AssistantPanel copy={copy} lang={lang} open={open} messages={messages} input={input} loading={loading} error={error} rootRef={rootRef} panelRef={panelRef} launcherRef={launcherRef} iconChatRef={iconChatRef} iconCloseRef={iconCloseRef} listRef={listRef} inputRef={inputRef} setOpen={setOpen} setInput={setInput} send={send} reset={reset} scrollToEnd={scrollToEnd} onSubmit={onSubmit} onKeyDown={onKeyDown} />;
}
