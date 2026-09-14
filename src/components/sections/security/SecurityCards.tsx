import type { Dict } from "@/lib/dictionaries";

function CardBadge({ id }: { id: string }) {
  return <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full border border-black/[0.06] bg-[var(--bg)]">
    {id === "bitdefender" ? <svg width="24" height="26" viewBox="0 0 24 26" aria-hidden><path d="M12 1l10 3.6v7.6c0 6.2-4.1 10.4-10 12.8C6.1 22.6 2 18.4 2 12.2V4.6L12 1z" fill="var(--brand-teal)" /><path d="M9 7h4.1c2 0 3.4 1.1 3.4 2.9 0 1.1-.6 2-1.5 2.4 1.2.4 2 1.4 2 2.7 0 2-1.5 3-3.6 3H9V7zm4 4.5c.8 0 1.4-.5 1.4-1.2S13.8 9 13 9h-1.9v2.5H13zm.3 4.5c.9 0 1.5-.5 1.5-1.3s-.6-1.3-1.5-1.3h-2.2V16h2.2z" fill="#ffffff" /></svg> : <div className="text-center leading-none"><div className="text-[13px] font-semibold tracking-[0.02em] text-[var(--fg)]">ISO</div><div className="mono mt-1 text-[8px] tracking-[0.06em] text-[var(--fg-dim)]">{id.replace("iso", "")}</div></div>}
  </div>;
}

export function SecurityCards({ cards }: { cards: Dict["security"]["cards"] }) {
  return <div className="sec-cards mt-16 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <div key={card.id} className="sec-card group relative rounded-2xl border border-black/[0.08] bg-white p-6 shadow-[0_1px_2px_rgba(10,14,22,0.04)] transition-colors duration-300 hover:border-[rgba(58,165,160,0.45)]"><div className="flex items-start gap-4"><CardBadge id={card.id} /><div className="min-w-0"><div className="mono text-[12px] tracking-[0.18em] text-[var(--brand-teal-ink)] uppercase">{card.name}</div><p className="mt-2 text-[13.5px] leading-relaxed text-[var(--fg-dim)]">{card.desc}</p></div></div><div className="mt-5 flex items-center gap-2.5 border-t border-black/[0.07] pt-4"><svg width="17" height="17" viewBox="0 0 17 17" aria-hidden><circle cx="8.5" cy="8.5" r="8.5" fill="var(--brand-teal)" /><path d="M5.2 8.7l2.2 2.2 4.2-4.7" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg><span className="mono text-[10.5px] tracking-[0.22em] text-[var(--fg-dim)] uppercase">{card.status}</span></div></div>)}</div>;
}
