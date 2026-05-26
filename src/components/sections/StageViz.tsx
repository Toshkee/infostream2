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
          {/* tiny meta */}
          <text
            x={b.x + 4} y={b.y - 4}
            fill={DIM} fontSize="6.5"
            fontFamily="ui-monospace, monospace"
          >
            {String(i+1).padStart(2,"0")}
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
function Build({ active }: { active: boolean }) {
  const [lines, setLines] = useState<string[]>([]);
  const code = [
    "// treasury-core/settlement.ts",
    "import { Ledger, AuditTrail } from \"@infostream/core\";",
    "",
    "export async function settle(batch: Batch) {",
    "  await AuditTrail.begin(batch.id);",
    "  const result = await Ledger.commit(batch);",
    "  if (!result.ok) throw new SettlementError();",
    "  return AuditTrail.close(result);",
    "}",
  ];

  useEffect(() => {
    if (!active) { setLines([]); return; }
    setLines([]);
    let i = 0;
    const id = window.setInterval(() => {
      setLines((prev) => {
        if (i >= code.length) { window.clearInterval(id); return prev; }
        const next = [...prev, code[i]];
        i++;
        return next;
      });
    }, 220);
    return () => window.clearInterval(id);
  }, [active]);

  if (!active) return null;

  const commits = [
    { hash: "9a2c1f8", msg: "feat: batch settlement", t: "2m" },
    { hash: "e8b7d31", msg: "test: ledger invariants", t: "14m" },
    { hash: "4c91a02", msg: "fix: audit trail close on err", t: "47m" },
    { hash: "1b5f0ee", msg: "chore: bump @infostream/core", t: "1h" },
  ];

  return (
    <div className="absolute inset-0 flex flex-col text-[10px]" style={{ fontFamily: "ui-monospace, monospace" }}>
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-black/30">
        <span className="w-2 h-2 rounded-full bg-[#ff5f57]" />
        <span className="w-2 h-2 rounded-full bg-[#febc2e]" />
        <span className="w-2 h-2 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-white/50 tracking-[0.15em] uppercase text-[9px]">treasury-core.ts</span>
        <span className="ml-auto text-white/30 text-[9px]">main · build passing</span>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Code area */}
        <div className="flex-1 px-3 py-2 leading-[1.55] overflow-hidden">
          {lines.map((ln, i) => {
            const isComment = ln.trim().startsWith("//");
            const isLast = i === lines.length - 1;
            return (
              <div key={i} className="flex gap-3">
                <span className="text-white/20 w-4 text-right">{i + 1}</span>
                <span className={isComment ? "text-white/35" : "text-white/85"}>
                  {ln}
                  {isLast && <span className="viz-caret inline-block w-[5px] h-[10px] bg-[var(--brand-teal-bright)] align-middle ml-0.5" />}
                </span>
              </div>
            );
          })}
        </div>

        {/* Commit sidebar */}
        <div className="w-[140px] border-l border-white/10 px-3 py-2 bg-black/20">
          <div className="text-white/30 tracking-[0.18em] uppercase text-[8px] mb-2">recent commits</div>
          {commits.map((c, i) => (
            <div
              key={i}
              className="viz-fade mb-2"
              style={{ animationDelay: `${0.5 + i * 0.15}s` }}
            >
              <div className="text-[var(--brand-teal-bright)] text-[9px]">{c.hash}</div>
              <div className="text-white/65 truncate text-[9px]">{c.msg}</div>
              <div className="text-white/25 text-[8px]">{c.t} ago</div>
            </div>
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-white/10 bg-black/30 text-white/40 text-[9px]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-teal-bright)] viz-pulse" />
            CI green
          </span>
          <span>2,847 commits</span>
          <span>0 vulns</span>
        </div>
        <span>v4.12.0</span>
      </div>
    </div>
  );
}

/* ───────────────── OPERATE ───────────────── */
function Operate({ active }: { active: boolean }) {
  const [tx, setTx] = useState(1284);
  const [logs, setLogs] = useState<string[]>([]);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setTx(v => v + Math.floor(Math.random() * 9) + 1), 180);
    return () => window.clearInterval(id);
  }, [active]);
  useEffect(() => {
    if (!active) { setLogs([]); return; }
    const samples = [
      "200 GET /settle/batch/7f2 · 14ms",
      "200 POST /audit/seal · 22ms",
      "200 GET /ledger/balance · 9ms",
      "200 POST /idp/verify · 31ms",
      "200 GET /reports/eod · 47ms",
    ];
    let i = 0;
    const id = window.setInterval(() => {
      setLogs(prev => [samples[i % samples.length], ...prev].slice(0, 4));
      i++;
    }, 700);
    return () => window.clearInterval(id);
  }, [active]);

  if (!active) return null;

  // Synthetic chart path — sine + drift, drawn on viewBox 0..380 x 0..70
  const points: string[] = [];
  for (let x = 0; x <= 380; x += 4) {
    const y = 35 + Math.sin(x * 0.05) * 14 + Math.sin(x * 0.13) * 6 - x * 0.03;
    points.push(`${x},${y.toFixed(1)}`);
  }
  const pathD = "M " + points.join(" L ");

  const stats = [
    { k: "tx/s", v: tx.toLocaleString(), color: TEAL_BRIGHT },
    { k: "uptime", v: "99.99%", color: "white" },
    { k: "incidents", v: "0", color: "white" },
  ];

  return (
    <div className="absolute inset-0 p-4 flex flex-col gap-3 text-[10px]" style={{ fontFamily: "ui-monospace, monospace" }}>
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

      {/* Line chart */}
      <div className="relative border border-white/10 rounded-sm bg-black/20 flex-1 min-h-0 p-2">
        <div className="text-white/35 text-[8px] tracking-[0.2em] uppercase mb-1">throughput · last 60m</div>
        <svg viewBox="0 0 380 70" className="w-full h-[calc(100%-14px)]" preserveAspectRatio="none">
          {/* grid */}
          {[10,25,40,55].map((y) => (
            <line key={y} x1={0} y1={y} x2={380} y2={y} stroke="rgba(255,255,255,0.06)" />
          ))}
          {/* area fill */}
          <path
            d={`${pathD} L 380,70 L 0,70 Z`}
            fill={TEAL}
            opacity={0.12}
            className="viz-fade"
            style={{ animationDelay: "0.6s" }}
          />
          {/* line */}
          <path
            d={pathD}
            stroke={TEAL_BRIGHT}
            strokeWidth={1.4}
            fill="none"
            className="viz-chart-draw"
            style={{ animationDelay: "0.3s" }}
          />
        </svg>
      </div>

      {/* Status row */}
      <div className="flex items-center gap-3 text-[9px]">
        {["api","db","queue","auth","idp"].map((s, i) => (
          <span
            key={s}
            className="viz-fade flex items-center gap-1.5 text-white/55"
            style={{ animationDelay: `${0.4 + i * 0.08}s` }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-teal-bright)] viz-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
            {s}
          </span>
        ))}
      </div>

      {/* Log stream */}
      <div className="border border-white/10 rounded-sm bg-black/30 px-2 py-1.5 text-[9px] text-white/55 h-[64px] overflow-hidden">
        {logs.map((l, i) => (
          <div
            key={`${l}-${i}`}
            className="viz-fade truncate"
            style={{ opacity: 1 - i * 0.22, animationDelay: "0s" }}
          >
            <span className="text-[var(--brand-teal-bright)]">›</span> {l}
          </div>
        ))}
      </div>
    </div>
  );
}
