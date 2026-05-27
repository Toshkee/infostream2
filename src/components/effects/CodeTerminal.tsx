"use client";

import { useEffect, useRef, useState, useMemo, type ReactNode } from "react";

export type Lang = "csharp" | "sql";

export type CodeSnippet = {
  filename: string;
  code: string;
  /** prompt line shown when "running" the snippet, e.g. "$ dotnet run" */
  runCmd: string;
  /** output lines streamed after the run command */
  output: string[];
};

type Props = {
  title: string;
  lang: Lang;
  snippets: CodeSnippet[];
  active: boolean;
  /** ms per character while typing code */
  speed?: number;
  /** ms to hold after output finishes before cycling to next snippet */
  holdMs?: number;
};

type Phase = "code" | "running" | "output" | "hold";

const CSHARP_KEYWORDS = [
  "public", "private", "internal", "protected", "static", "readonly", "async",
  "await", "var", "void", "return", "new", "class", "record", "struct",
  "interface", "namespace", "using", "if", "else", "for", "foreach", "while",
  "in", "out", "ref", "this", "base", "true", "false", "null", "throw", "try",
  "catch", "finally", "switch", "case", "default", "break", "continue", "is",
  "as", "operator", "implicit", "explicit", "get", "set", "init", "yield",
  "sealed", "override", "virtual", "abstract", "const", "string", "int", "long",
  "double", "decimal", "bool", "object", "Task", "ValueTask",
];

const SQL_KEYWORDS = [
  "SELECT", "FROM", "WHERE", "AND", "OR", "NOT", "JOIN", "LEFT", "RIGHT",
  "INNER", "OUTER", "FULL", "CROSS", "ON", "USING", "GROUP", "BY", "ORDER",
  "ASC", "DESC", "LIMIT", "OFFSET", "AS", "WITH", "RECURSIVE", "CASE", "WHEN",
  "THEN", "ELSE", "END", "DISTINCT", "UNION", "ALL", "EXISTS", "IN", "BETWEEN",
  "LIKE", "IS", "NULL", "TRUE", "FALSE", "INSERT", "INTO", "VALUES", "UPDATE",
  "SET", "DELETE", "RETURNING", "CREATE", "TABLE", "INDEX", "VIEW", "PRIMARY",
  "KEY", "FOREIGN", "REFERENCES", "OVER", "PARTITION", "ROWS", "RANGE",
  "INTERVAL", "LATERAL", "COALESCE", "NULLIF", "CAST",
];

const SQL_FNS = [
  "SUM", "COUNT", "AVG", "MIN", "MAX", "ROUND", "ABS", "NOW", "DATE",
  "CURRENT_DATE", "CURRENT_TIMESTAMP", "EXTRACT", "DATE_TRUNC", "COALESCE",
];

function buildCsharpRegex() {
  return new RegExp(
    [
      `(?<cmt>\\/\\/[^\\n]*)`,
      `(?<str>"(?:[^"\\\\]|\\\\.)*")`,
      `(?<kw>\\b(?:${CSHARP_KEYWORDS.join("|")})\\b)`,
      `(?<num>\\b\\d+(?:\\.\\d+)?\\b)`,
      `(?<attr>\\[[A-Z][A-Za-z0-9_]*(?:\\([^\\]]*\\))?\\])`,
      `(?<type>\\b[A-Z][A-Za-z0-9_]*\\b)`,
    ].join("|"),
    "g"
  );
}

function buildSqlRegex() {
  return new RegExp(
    [
      `(?<cmt>--[^\\n]*)`,
      `(?<str>'(?:[^'\\\\]|\\\\.)*')`,
      `(?<kw>\\b(?:${SQL_KEYWORDS.join("|")})\\b)`,
      `(?<fn>\\b(?:${SQL_FNS.join("|")})\\b(?=\\s*\\())`,
      `(?<num>\\b\\d+(?:\\.\\d+)?\\b)`,
    ].join("|"),
    "gi"
  );
}

const CSHARP_RE = buildCsharpRegex();
const SQL_RE = buildSqlRegex();

const KIND_STYLE: Record<string, string> = {
  cmt: "text-white/35 italic",
  str: "text-amber-200/90",
  kw: "text-[var(--brand-teal-bright)]",
  fn: "text-violet-300",
  num: "text-orange-200/90",
  type: "text-sky-300/90",
  attr: "text-pink-300/80",
};

function highlight(code: string, lang: Lang): ReactNode[] {
  const re = lang === "csharp" ? CSHARP_RE : SQL_RE;
  re.lastIndex = 0;
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(code)) !== null) {
    if (m.index > last) {
      out.push(<span key={key++}>{code.slice(last, m.index)}</span>);
    }
    let kind = "txt";
    const g = m.groups;
    if (g) {
      for (const k of Object.keys(g)) {
        if (g[k] !== undefined) { kind = k; break; }
      }
    }
    out.push(
      <span key={key++} className={KIND_STYLE[kind] ?? ""}>
        {m[0]}
      </span>
    );
    last = re.lastIndex;
    if (m[0].length === 0) re.lastIndex++;
  }
  if (last < code.length) {
    out.push(<span key={key++}>{code.slice(last)}</span>);
  }
  return out;
}

// Light coloring for output lines (status codes, OK/ERROR, numbers)
function colorOutput(line: string): ReactNode {
  if (line.startsWith("$ ")) {
    return (
      <>
        <span className="text-[var(--brand-teal-bright)]">$ </span>
        <span className="text-white/85">{line.slice(2)}</span>
      </>
    );
  }
  if (/^\s*info:/i.test(line)) {
    return <span className="text-sky-300/85">{line}</span>;
  }
  if (/^\s*warn:/i.test(line)) {
    return <span className="text-amber-300/90">{line}</span>;
  }
  if (/^\s*(err|error|fail):/i.test(line)) {
    return <span className="text-[var(--brand-red)]">{line}</span>;
  }
  if (/(^|\s)(OK|POSTED|SETTLED|Done\.)\b/.test(line)) {
    return (
      <span className="text-white/80">
        {line.split(/(\bOK\b|\bPOSTED\b|\bSETTLED\b|Done\.)/).map((part, i) =>
          /^(OK|POSTED|SETTLED|Done\.)$/.test(part) ? (
            <span key={i} className="text-[var(--brand-teal-bright)]">{part}</span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  }
  if (/\bOVERDRAWN\b/.test(line)) {
    return (
      <span className="text-white/80">
        {line.split(/(\bOVERDRAWN\b)/).map((part, i) =>
          part === "OVERDRAWN" ? (
            <span key={i} className="text-[var(--brand-red)]">{part}</span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  }
  return <span className="text-white/80">{line}</span>;
}

export default function CodeTerminal({
  title,
  lang,
  snippets,
  active,
  speed = 4,
  holdMs = 5000,
}: Props) {
  const [snippetIdx, setSnippetIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("code");
  const [typed, setTyped] = useState(0);
  const [outLines, setOutLines] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  const snippet = snippets[snippetIdx];
  const code = snippet.code;
  const output = snippet.output;

  // Unified state machine — one effect drives all phases
  useEffect(() => {
    if (!active) return;

    if (phase === "code") {
      if (typed >= code.length) {
        const t = window.setTimeout(() => setPhase("running"), 350);
        return () => clearTimeout(t);
      }
      const ch = code[typed];
      const delay =
        ch === "\n" ? 18 :
        ch === ";" || ch === "." ? 14 :
        ch === " " ? speed * 0.5 :
        speed + (Math.random() - 0.5) * 3;
      const t = window.setTimeout(() => setTyped((n) => n + 1), delay);
      return () => clearTimeout(t);
    }

    if (phase === "running") {
      const t = window.setTimeout(() => setPhase("output"), 700);
      return () => clearTimeout(t);
    }

    if (phase === "output") {
      if (outLines >= output.length) {
        const t = window.setTimeout(() => setPhase("hold"), 200);
        return () => clearTimeout(t);
      }
      const t = window.setTimeout(() => setOutLines((n) => n + 1), 110);
      return () => clearTimeout(t);
    }

    if (phase === "hold") {
      const t = window.setTimeout(() => {
        setSnippetIdx((i) => (i + 1) % snippets.length);
        setTyped(0);
        setOutLines(0);
        setPhase("code");
      }, holdMs);
      return () => clearTimeout(t);
    }
  }, [active, phase, typed, outLines, code, output, snippets.length, speed, holdMs]);

  // Auto-scroll so the latest line stays visible
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [typed, outLines, phase]);

  const visible = code.slice(0, typed);
  const tokens = useMemo(() => highlight(visible, lang), [visible, lang]);

  const lineCount = visible.split("\n").length;
  const totalLines = code.split("\n").length;
  const inCodePhase = phase === "code";

  const statusLabel: Record<Phase, string> = {
    code: "typing",
    running: "running",
    output: "output",
    hold: "ready",
  };
  const statusDot: Record<Phase, string> = {
    code: "bg-[var(--brand-teal-bright)] animate-pulse",
    running: "bg-amber-300 animate-pulse",
    output: "bg-[var(--brand-teal-bright)]",
    hold: "bg-white/40",
  };

  return (
    <div className="relative border border-white/12 bg-black/55 rounded-md overflow-hidden shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)]">
      {/* chrome */}
      <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 rounded-full bg-[var(--brand-red)]/70" />
          <span className="h-2 w-2 rounded-full bg-amber-300/70" />
          <span className="h-2 w-2 rounded-full bg-[var(--brand-teal-bright)]/70" />
          <span className="ml-3 mono text-[11px] text-white/55 tracking-[0.04em] truncate">
            {title} <span className="text-white/30">·</span> {snippet.filename}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`h-1.5 w-1.5 rounded-full ${active ? statusDot[phase] : "bg-white/30"}`} />
          <span className="mono text-[10px] uppercase tracking-[0.22em] text-white/50">
            {active ? statusLabel[phase] : "paused"}
          </span>
        </div>
      </div>

      {/* body */}
      <div
        ref={bodyRef}
        className="relative h-[460px] md:h-[500px] overflow-y-auto mono text-[12.5px] leading-[1.65]"
        style={{
          maskImage:
            "linear-gradient(180deg, transparent 0, black 20px, black calc(100% - 8px), transparent 100%)",
        }}
      >
        <div className="flex">
          {/* gutter */}
          <div className="select-none pr-3 pl-3 py-3 text-right text-white/25 border-r border-white/5">
            {Array.from({ length: totalLines }, (_, i) => (
              <div key={i} className={i + 1 > lineCount ? "opacity-0" : ""}>
                {String(i + 1).padStart(2, "0")}
              </div>
            ))}
          </div>
          {/* code */}
          <pre className="flex-1 px-4 py-3 whitespace-pre overflow-x-auto text-white/90 min-w-0">
            <code>
              {tokens}
              {inCodePhase && (
                <span
                  className="inline-block align-middle h-[1em] w-[7px] -mb-[2px] ml-[1px] bg-[var(--brand-teal-bright)]"
                  style={{ animation: "lf-blink 1s steps(2) infinite" }}
                />
              )}
            </code>
          </pre>
        </div>

        {/* run / output */}
        {phase !== "code" && (
          <div className="border-t border-dashed border-white/10 mt-1 px-4 py-3">
            <div className="text-white/90 whitespace-pre">{colorOutput(snippet.runCmd)}</div>
            {phase === "running" && (
              <div className="mt-2 mono text-[12.5px] text-white/45 flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse" />
                executing…
              </div>
            )}
            {(phase === "output" || phase === "hold") && (
              <div className="mt-2 whitespace-pre overflow-x-auto">
                {output.slice(0, outLines).map((line, i) => (
                  <div key={i}>{colorOutput(line)}</div>
                ))}
                {phase === "hold" && (
                  <div className="mt-1 flex items-center gap-2 text-white/40">
                    <span className="text-[var(--brand-teal-bright)]">$</span>
                    <span
                      className="inline-block h-[1em] w-[7px] -mb-[2px] bg-[var(--brand-teal-bright)]"
                      style={{ animation: "lf-blink 1s steps(2) infinite" }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <style>{`@keyframes lf-blink { 50% { opacity: 0; } }`}</style>
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 bg-white/[0.02] mono text-[10px] uppercase tracking-[0.22em] text-white/40">
        <span className="truncate">{snippet.filename}</span>
        <span className="shrink-0">
          {statusLabel[phase]}
          <span className="ml-3">{snippetIdx + 1}/{snippets.length}</span>
        </span>
      </div>
    </div>
  );
}
