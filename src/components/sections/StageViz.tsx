"use client";

import { useEffect, useState } from "react";

type Props = { stage: number; active: boolean };

// Replays internal animations whenever `active` flips to true.
export default function StageViz({ stage, active }: Props) {
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (active) setKey((k) => k + 1);
  }, [active]);

  const Comp = [Discovery, Architecture, Build, Operate][stage] ?? Discovery;
  return (
    <div className="relative w-full max-w-[560px] mx-auto lg:ml-auto lg:mr-0">
      {/* Solid card — no backdrop bleed-through. Subtle teal-tinted border + soft outer glow */}
      <div
        className="aspect-[4/3] w-full rounded-lg border border-white/15 overflow-hidden relative"
        style={{
          background:
            "linear-gradient(180deg, rgba(19,26,42,0.98), rgba(13,17,28,0.98))",
          boxShadow:
            "0 24px 60px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(72,184,177,0.08), 0 0 32px -12px rgba(72,184,177,0.25)",
        }}
      >
        <Comp key={key} active={active} />
      </div>
    </div>
  );
}

const TEAL = "#48b8b1";
const TEAL_BRIGHT = "#7ad8d2";
const RED = "#d63b3b";
const DIM = "rgba(255,255,255,0.35)";
const LINE = "rgba(255,255,255,0.18)";

/* ───────────────── DISCOVERY ───────────────── */
function Discovery({ active }: { active: boolean }) {
  if (!active) return null;
  const nodes = [
    { x: 80,  y: 70,  label: "stakeholders" },
    { x: 320, y: 70,  label: "constraints" },
    { x: 50,  y: 200, label: "users" },
    { x: 350, y: 200, label: "risk" },
    { x: 200, y: 245, label: "compliance" },
  ];
  return (
    <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full">
      {/* dotted grid */}
      <defs>
        <pattern id="dGrid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.6" fill="rgba(255,255,255,0.08)" />
        </pattern>
      </defs>
      <rect width="400" height="300" fill="url(#dGrid)" />

      {/* connecting lines from center to satellites */}
      {nodes.map((n, i) => (
        <line
          key={`l-${i}`}
          x1={200} y1={150} x2={n.x} y2={n.y}
          stroke={TEAL} strokeWidth={1} strokeOpacity={0.55}
          className="viz-draw"
          style={{ ["--dash" as never]: 200, animationDelay: `${0.3 + i * 0.1}s` }}
        />
      ))}

      {/* satellite nodes */}
      {nodes.map((n, i) => (
        <g key={`n-${i}`} className="viz-pop" style={{ animationDelay: `${0.45 + i * 0.1}s` }}>
          <circle cx={n.x} cy={n.y} r={6} fill={TEAL} />
          <circle cx={n.x} cy={n.y} r={11} fill="none" stroke={TEAL} strokeOpacity={0.4} />
        </g>
      ))}

      {/* labels */}
      {nodes.map((n, i) => (
        <text
          key={`t-${i}`}
          x={n.x} y={n.y - 18}
          textAnchor="middle"
          fill="rgba(255,255,255,0.55)"
          fontSize="9"
          fontFamily="ui-monospace, monospace"
          letterSpacing="0.15em"
          className="viz-fade"
          style={{ animationDelay: `${0.65 + i * 0.1}s` }}
        >
          {n.label.toUpperCase()}
        </text>
      ))}

      {/* center node */}
      <g className="viz-pop" style={{ animationDelay: "0.1s" }}>
        <circle cx={200} cy={150} r={26} fill="none" stroke={RED} strokeWidth={1.5} />
        <circle cx={200} cy={150} r={12} fill={RED} />
        <text
          x={200} y={154}
          textAnchor="middle"
          fill="white"
          fontSize="8"
          fontFamily="ui-monospace, monospace"
          letterSpacing="0.18em"
        >
          PROJECT
        </text>
      </g>

      {/* annotation note */}
      <g className="viz-fade" style={{ animationDelay: "1.4s" }}>
        <line x1={306} y1={148} x2={360} y2={148} stroke={DIM} strokeDasharray="2 3" />
        <text
          x={365} y={146}
          fill="rgba(255,255,255,0.5)"
          fontSize="8"
          fontFamily="ui-monospace, monospace"
          letterSpacing="0.1em"
        >
          ┐
        </text>
        <text
          x={310} y={138}
          fill={TEAL_BRIGHT}
          fontSize="8"
          fontFamily="ui-monospace, monospace"
          letterSpacing="0.15em"
        >
          MAPPED
        </text>
      </g>
    </svg>
  );
}

/* ───────────────── ARCHITECTURE ───────────────── */
function Architecture({ active }: { active: boolean }) {
  if (!active) return null;
  // Boxes: x,y,w,h,label
  const boxes = [
    { x: 20,  y: 130, w: 70, h: 40, label: "CITIZENS" },
    { x: 120, y: 130, w: 70, h: 40, label: "GATEWAY" },
    { x: 220, y: 130, w: 70, h: 40, label: "SERVICE" },
    { x: 320, y: 130, w: 60, h: 40, label: "LEDGER" },
    { x: 170, y: 40,  w: 70, h: 36, label: "IDENTITY" },
    { x: 170, y: 220, w: 70, h: 36, label: "AUDIT" },
  ];
  const wires = [
    { d: "M90,150 L120,150", delay: 1.0 },
    { d: "M190,150 L220,150", delay: 1.15 },
    { d: "M290,150 L320,150", delay: 1.3 },
    { d: "M205,76 L155,130",  delay: 1.45 },
    { d: "M205,220 L255,170", delay: 1.6 },
  ];
  return (
    <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full">
      <defs>
        <pattern id="aGrid" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M16 0 L0 0 0 16" fill="none" stroke="rgba(122,216,210,0.05)" strokeWidth="0.5" />
        </pattern>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={TEAL_BRIGHT} />
        </marker>
      </defs>
      <rect width="400" height="300" fill="url(#aGrid)" />

      {/* corner marks */}
      {[[8,8],[392,8],[8,292],[392,292]].map(([x,y],i)=>(
        <g key={i} className="viz-fade" style={{ animationDelay: `${0.1+i*0.05}s` }}>
          <line x1={x-4} y1={y} x2={x+4} y2={y} stroke={DIM} />
          <line x1={x} y1={y-4} x2={x} y2={y+4} stroke={DIM} />
        </g>
      ))}

      {/* boxes */}
      {boxes.map((b, i) => (
        <g key={i} className="viz-pop" style={{ animationDelay: `${0.3 + i * 0.13}s`, transformOrigin: `${b.x + b.w/2}px ${b.y + b.h/2}px` }}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="rgba(72,184,177,0.08)" stroke={TEAL} strokeWidth={1} />
          <text
            x={b.x + b.w/2} y={b.y + b.h/2 + 3}
            textAnchor="middle"
            fill="white"
            fontSize="8"
            fontFamily="ui-monospace, monospace"
            letterSpacing="0.18em"
          >
            {b.label}
          </text>
        </g>
      ))}

      {/* wires with arrows */}
      {wires.map((w, i) => (
        <path
          key={i}
          d={w.d}
          stroke={TEAL_BRIGHT} strokeWidth={1.2}
          fill="none"
          markerEnd="url(#arrow)"
          className="viz-draw"
          style={{ ["--dash" as never]: 100, animationDelay: `${w.delay}s` }}
        />
      ))}
    </svg>
  );
}

/* ───────────────── BUILD ───────────────── */
// C# code typed into editor → `dotnet build` succeeds → `dotnet run` prints output.
// Three sequential phases, advanced by a single rAF-driven clock.
const CSHARP_CODE: { text: string; kind: "comment" | "kw" | "type" | "str" | "code" }[] = [
  { text: "using Infostream.Core;", kind: "code" },
  { text: "using Infostream.Core.Ledger;", kind: "code" },
  { text: "", kind: "code" },
  { text: "namespace Treasury.Settlement;", kind: "code" },
  { text: "", kind: "code" },
  { text: "public sealed class SettlementService", kind: "code" },
  { text: "{", kind: "code" },
  { text: "    private readonly ILedger _ledger;", kind: "code" },
  { text: "", kind: "code" },
  { text: "    public async Task<Receipt> SettleAsync(Batch batch)", kind: "code" },
  { text: "    {", kind: "code" },
  { text: "        await using var audit = await AuditTrail.BeginAsync(batch.Id);", kind: "code" },
  { text: "        var result = await _ledger.CommitAsync(batch);", kind: "code" },
  { text: "        if (!result.Ok) throw new SettlementException(result.Error);", kind: "code" },
  { text: "        return await audit.CloseAsync(result);", kind: "code" },
  { text: "    }", kind: "code" },
  { text: "}", kind: "code" },
];

const BUILD_OUTPUT: { text: string; tone: "dim" | "info" | "ok" | "cmd" }[] = [
  { text: "$ dotnet build Treasury.Settlement.csproj -c Release", tone: "cmd" },
  { text: "  Determining projects to restore...", tone: "dim" },
  { text: "  Restored Treasury.Settlement.csproj (in 248ms).", tone: "dim" },
  { text: "  Treasury.Settlement -> bin/Release/net8.0/Treasury.Settlement.dll", tone: "info" },
  { text: "Build succeeded.   0 Warning(s)   0 Error(s)", tone: "ok" },
  { text: "", tone: "dim" },
  { text: "$ dotnet run -- --batch 7f2a-091b", tone: "cmd" },
  { text: "[info]  audit trail opened · batch 7f2a-091b", tone: "info" },
  { text: "[info]  committing 3,841 entries to ledger…", tone: "info" },
  { text: "[ok]    batch 7f2a-091b settled in 14ms", tone: "ok" },
];

function syntaxColor(line: string, kind: string): React.ReactNode {
  if (!line) return " ";
  if (kind === "code") {
    // Light tokenization — keywords + types + strings, rest is plain.
    const kw = /\b(using|namespace|public|sealed|class|private|readonly|async|await|var|return|if|throw|new|null)\b/g;
    const types = /\b(Task|Receipt|Batch|ILedger|AuditTrail|SettlementService|SettlementException|Infostream|Core|Ledger|Treasury|Settlement)\b/g;
    const parts: React.ReactNode[] = [];
    let last = 0;
    const matches: { i: number; len: number; cls: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = kw.exec(line))) matches.push({ i: m.index, len: m[0].length, cls: "text-[#c876d6]" });
    while ((m = types.exec(line))) matches.push({ i: m.index, len: m[0].length, cls: "text-[#7ad8d2]" });
    matches.sort((a, b) => a.i - b.i);
    // Resolve overlaps: keyword wins
    const filtered = matches.filter((mm, idx) =>
      !matches.some((other, oi) => oi !== idx && other.i <= mm.i && other.i + other.len > mm.i && other.cls === "text-[#c876d6]")
    );
    filtered.forEach((mm, idx) => {
      if (mm.i > last) parts.push(<span key={`p-${idx}`} className="text-white/80">{line.slice(last, mm.i)}</span>);
      parts.push(<span key={`m-${idx}`} className={mm.cls}>{line.slice(mm.i, mm.i + mm.len)}</span>);
      last = mm.i + mm.len;
    });
    if (last < line.length) parts.push(<span key="end" className="text-white/80">{line.slice(last)}</span>);
    return parts;
  }
  return <span className="text-white/80">{line}</span>;
}

function Build({ active }: { active: boolean }) {
  const [linesShown, setLinesShown] = useState(0);
  const [outShown, setOutShown] = useState(0);

  useEffect(() => {
    if (!active) { setLinesShown(0); setOutShown(0); return; }
    setLinesShown(0); setOutShown(0);
    const timers: number[] = [];
    // Phase 1: type code line-by-line
    CSHARP_CODE.forEach((_, i) => {
      timers.push(window.setTimeout(() => setLinesShown((n) => Math.max(n, i + 1)), 140 + i * 95));
    });
    // Phase 2: terminal output starts ~once code is mostly written
    const start = 140 + CSHARP_CODE.length * 95 + 250;
    BUILD_OUTPUT.forEach((_, i) => {
      timers.push(window.setTimeout(() => setOutShown((n) => Math.max(n, i + 1)), start + i * 260));
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [active]);

  if (!active) return null;

  return (
    <div className="absolute inset-0 flex flex-col text-[9.5px]" style={{ fontFamily: "ui-monospace, monospace" }}>
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/10 bg-black/30">
        <span className="w-2 h-2 rounded-full bg-[#ff5f57]" />
        <span className="w-2 h-2 rounded-full bg-[#febc2e]" />
        <span className="w-2 h-2 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-white/55 tracking-[0.14em] uppercase text-[9px]">SettlementService.cs</span>
        <span className="ml-auto flex items-center gap-1.5 text-white/40 text-[9px]">
          <span className="text-[var(--brand-teal-bright)]">●</span> .NET 8 · main
        </span>
      </div>

      {/* Editor pane */}
      <div className="flex-1 min-h-0 px-3 py-2 leading-[1.5] overflow-hidden border-b border-white/10">
        {CSHARP_CODE.slice(0, linesShown).map((ln, i) => {
          const isLast = i === linesShown - 1 && linesShown < CSHARP_CODE.length;
          return (
            <div key={i} className="flex gap-2.5">
              <span className="text-white/20 w-4 text-right select-none">{i + 1}</span>
              <span>
                {syntaxColor(ln.text, ln.kind)}
                {isLast && (
                  <span className="viz-caret inline-block w-[5px] h-[9px] bg-[var(--brand-teal-bright)] align-middle ml-0.5" />
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Terminal pane */}
      <div className="h-[44%] min-h-0 px-3 py-2 bg-black/40 overflow-hidden">
        <div className="text-white/35 text-[8px] tracking-[0.2em] uppercase mb-1.5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-teal-bright)] viz-pulse" />
          terminal · zsh
        </div>
        {BUILD_OUTPUT.slice(0, outShown).map((ln, i) => {
          const isLast = i === outShown - 1 && outShown < BUILD_OUTPUT.length;
          const color =
            ln.tone === "cmd" ? "text-white/85" :
            ln.tone === "ok"  ? "text-[#7ce38b]" :
            ln.tone === "info" ? "text-white/65" :
            "text-white/40";
          return (
            <div key={i} className="leading-[1.5]">
              <span className={color}>{ln.text || " "}</span>
              {isLast && (
                <span className="viz-caret inline-block w-[5px] h-[9px] bg-[var(--brand-teal-bright)] align-middle ml-0.5" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────── OPERATE ───────────────── */
// Realistic throughput series — combines a slow trend, a daily-ish swell, faster
// oscillation and seeded jitter so it reads as real telemetry rather than a sine wave.
function buildOpsSeries(samples: number): { tx: number[]; p95: number[] } {
  const rand = seededRand(0x71ae);
  const tx: number[] = [];
  const p95: number[] = [];
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    const base = 1180 + Math.sin(t * Math.PI * 1.2) * 220;       // wide swell
    const wave = Math.sin(t * Math.PI * 6) * 90;                  // mid frequency
    const ripple = Math.sin(t * Math.PI * 18) * 35;               // fast ripple
    const noise = (rand() - 0.5) * 70;                            // jitter
    const spike = t > 0.74 && t < 0.78 ? -260 : 0;                // brief dip — looks real
    const val = base + wave + ripple + noise + spike;
    tx.push(val);
    // p95 latency loosely correlates inversely with throughput, with jitter
    const latBase = 22 - (val - 1180) / 60;
    p95.push(Math.max(9, latBase + (rand() - 0.4) * 6));
  }
  return { tx, p95 };
}

function seededRand(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const OPS_SAMPLES = 96; // ~one point per 37.5s over 60m

function Operate({ active }: { active: boolean }) {
  const [tx, setTx] = useState(1284);
  const [logs, setLogs] = useState<string[]>([]);
  // Pre-compute series once per activation; keeps the chart shape stable
  // while the live "tx/s" tile keeps updating.
  const [series] = useState(() => buildOpsSeries(OPS_SAMPLES));

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setTx(v => v + Math.floor(Math.random() * 9) + 1), 180);
    return () => window.clearInterval(id);
  }, [active]);
  useEffect(() => {
    if (!active) { setLogs([]); return; }
    const samples = [
      "200 POST /api/v1/settle/batch · 14ms · 0.4KB",
      "200 GET  /api/v1/ledger/7f2a · 9ms  · 2.1KB",
      "200 POST /api/v1/audit/seal  · 22ms · 0.3KB",
      "200 POST /api/v1/idp/verify  · 31ms · 0.6KB",
      "200 GET  /api/v1/reports/eod · 47ms · 12KB",
      "204 POST /api/v1/heartbeat   · 4ms  · -",
    ];
    let i = 0;
    const id = window.setInterval(() => {
      setLogs(prev => [samples[i % samples.length], ...prev].slice(0, 4));
      i++;
    }, 700);
    return () => window.clearInterval(id);
  }, [active]);

  if (!active) return null;

  // Chart geometry — leave room on the left for y-axis labels, bottom for x labels.
  const W = 380, H = 100;
  const PAD_L = 28, PAD_R = 8, PAD_T = 8, PAD_B = 14;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const txMin = Math.min(...series.tx);
  const txMax = Math.max(...series.tx);
  const yLo = Math.floor(txMin / 200) * 200;
  const yHi = Math.ceil(txMax / 200) * 200;
  const yTicks: number[] = [];
  for (let v = yLo; v <= yHi; v += 200) yTicks.push(v);

  const xAt = (i: number) => PAD_L + (i / (OPS_SAMPLES - 1)) * innerW;
  const yAt = (v: number) => PAD_T + (1 - (v - yLo) / (yHi - yLo)) * innerH;

  const linePath = "M " + series.tx.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" L ");
  const areaPath = `${linePath} L ${xAt(OPS_SAMPLES - 1).toFixed(1)},${(PAD_T + innerH).toFixed(1)} L ${xAt(0).toFixed(1)},${(PAD_T + innerH).toFixed(1)} Z`;

  // p95 latency mini-band (rescaled to bottom 25% of chart)
  const p95Max = Math.max(...series.p95);
  const p95Min = Math.min(...series.p95);
  const p95yAt = (v: number) => PAD_T + innerH - 4 - ((v - p95Min) / (p95Max - p95Min)) * 14;
  const p95Path = "M " + series.p95.map((v, i) => `${xAt(i).toFixed(1)},${p95yAt(v).toFixed(1)}`).join(" L ");

  const stats = [
    { k: "tx/s", v: tx.toLocaleString(), color: TEAL_BRIGHT },
    { k: "p95 lat", v: `${series.p95[series.p95.length - 1].toFixed(0)}ms`, color: "white" },
    { k: "error rate", v: "0.00%", color: "white" },
  ];

  return (
    <div className="absolute inset-0 p-3 flex flex-col gap-2.5 text-[10px]" style={{ fontFamily: "ui-monospace, monospace" }}>
      {/* Stat tiles */}
      <div className="grid grid-cols-3 gap-2">
        {stats.map((s, i) => (
          <div
            key={i}
            className="viz-fade border border-white/10 bg-black/20 px-2 py-2 rounded-sm"
            style={{ animationDelay: `${0.1 + i * 0.12}s` }}
          >
            <div className="text-white/35 text-[8px] tracking-[0.2em] uppercase">{s.k}</div>
            <div className="text-[13px] mt-0.5" style={{ color: s.color }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Chart panel */}
      <div className="relative border border-white/10 rounded-sm bg-black/25 flex-1 min-h-0 p-2 flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <div className="text-white/40 text-[8px] tracking-[0.2em] uppercase">throughput · tx/s · last 60m</div>
          <div className="flex items-center gap-3 text-[8px] text-white/45">
            <span className="flex items-center gap-1"><span className="w-2 h-px bg-[var(--brand-teal-bright)]" /> tx/s</span>
            <span className="flex items-center gap-1"><span className="w-2 h-px bg-white/35" style={{ borderTop: "1px dashed rgba(255,255,255,0.35)" }} /> p95 ms</span>
          </div>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full flex-1 min-h-0" preserveAspectRatio="none">
          <defs>
            <linearGradient id="opsArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={TEAL_BRIGHT} stopOpacity="0.28" />
              <stop offset="100%" stopColor={TEAL_BRIGHT} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Horizontal grid + y-axis tick labels */}
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={PAD_L} y1={yAt(v)} x2={W - PAD_R} y2={yAt(v)} stroke="rgba(255,255,255,0.07)" />
              <text x={PAD_L - 4} y={yAt(v) + 3} textAnchor="end" fontSize="7" fill="rgba(255,255,255,0.4)">
                {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
              </text>
            </g>
          ))}

          {/* X-axis time labels */}
          {[
            { label: "-60m", t: 0 },
            { label: "-45m", t: 0.25 },
            { label: "-30m", t: 0.5 },
            { label: "-15m", t: 0.75 },
            { label: "now", t: 1 },
          ].map((tk) => {
            const x = PAD_L + tk.t * innerW;
            return (
              <g key={tk.label}>
                <line x1={x} y1={PAD_T + innerH} x2={x} y2={PAD_T + innerH + 2} stroke="rgba(255,255,255,0.25)" />
                <text x={x} y={PAD_T + innerH + 10} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.4)">
                  {tk.label}
                </text>
              </g>
            );
          })}

          {/* Area fill under throughput line */}
          <path d={areaPath} fill="url(#opsArea)" className="viz-fade" style={{ animationDelay: "0.5s" }} />

          {/* Throughput line */}
          <path
            d={linePath}
            stroke={TEAL_BRIGHT}
            strokeWidth={1.3}
            fill="none"
            className="viz-chart-draw"
            style={{ animationDelay: "0.25s" }}
          />

          {/* p95 latency overlay — dashed white, sits low in the chart */}
          <path
            d={p95Path}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth={0.9}
            fill="none"
            strokeDasharray="2 2"
            className="viz-chart-draw"
            style={{ animationDelay: "0.55s" }}
          />

          {/* "Now" cursor on the right edge */}
          <line
            x1={xAt(OPS_SAMPLES - 1)}
            y1={PAD_T}
            x2={xAt(OPS_SAMPLES - 1)}
            y2={PAD_T + innerH}
            stroke={TEAL_BRIGHT}
            strokeOpacity="0.5"
            strokeDasharray="2 3"
          />
          <circle
            cx={xAt(OPS_SAMPLES - 1)}
            cy={yAt(series.tx[series.tx.length - 1])}
            r={2.5}
            fill={TEAL_BRIGHT}
            style={{ filter: "drop-shadow(0 0 4px var(--brand-teal-bright))" }}
          />
        </svg>
      </div>

      {/* Service health row */}
      <div className="flex items-center gap-3 text-[9px]">
        {["api","oracle","queue","idp","cdc"].map((s, i) => (
          <span
            key={s}
            className="viz-fade flex items-center gap-1.5 text-white/60"
            style={{ animationDelay: `${0.4 + i * 0.08}s` }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-teal-bright)] viz-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
            {s}
          </span>
        ))}
      </div>

      {/* Log stream */}
      <div className="border border-white/10 rounded-sm bg-black/35 px-2 py-1.5 text-[9px] text-white/60 h-[60px] overflow-hidden">
        {logs.map((l, i) => (
          <div
            key={`${l}-${i}`}
            className="viz-fade truncate leading-[1.45]"
            style={{ opacity: 1 - i * 0.22, animationDelay: "0s" }}
          >
            <span className="text-[var(--brand-teal-bright)]">›</span> {l}
          </div>
        ))}
      </div>
    </div>
  );
}
