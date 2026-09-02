// Cheap, dependency-free guards for the things that have silently broken
// before. Run with `npm run check`; CI runs it on every push.
//
//  1. Every locale in src/lib/locales.ts has a dictionary file, and every
//     dictionary has an identical key tree (same keys, same array lengths).
//  2. MOTION_QUERY in visuals.tsx is byte-identical to the @media query that
//     gates .expertise-pinned in globals.css — the pinned scenes are built
//     against one and shown/hidden by the other.
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");
const failures = [];

// ── 1. Locales ↔ dictionaries ──────────────────────────────────────────────
const localesSrc = read("src/lib/locales.ts");
const localesMatch = localesSrc.match(/export const locales = \[([^\]]+)\] as const/);
if (!localesMatch) failures.push("locales.ts: could not find `export const locales = [...] as const`");
const locales = localesMatch ? [...localesMatch[1].matchAll(/"([a-z]+)"/g)].map((m) => m[1]) : [];

const dictFiles = readdirSync(resolve(root, "src/lib/dict")).filter((f) => f.endsWith(".json"));
for (const l of locales) {
  if (!dictFiles.includes(`${l}.json`)) failures.push(`locale "${l}" has no src/lib/dict/${l}.json`);
}
for (const f of dictFiles) {
  const code = f.replace(/\.json$/, "");
  if (!locales.includes(code)) failures.push(`src/lib/dict/${f} is not listed in locales.ts`);
}

function shape(value, path = "") {
  const out = new Set();
  if (Array.isArray(value)) {
    out.add(`${path}[${value.length}]`);
    value.forEach((v, i) => {
      if (v && typeof v === "object") for (const k of shape(v, `${path}[${i}]`)) out.add(k);
    });
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) for (const s of shape(v, `${path}.${k}`)) out.add(s);
  } else {
    out.add(`${path}:${typeof value}`);
  }
  return out;
}

const dicts = Object.fromEntries(dictFiles.map((f) => [f, JSON.parse(read(`src/lib/dict/${f}`))]));
const [baseName, ...others] = dictFiles;
if (baseName) {
  const base = shape(dicts[baseName]);
  for (const name of others) {
    const other = shape(dicts[name]);
    for (const k of base) if (!other.has(k)) failures.push(`${name} is missing ${k} (present in ${baseName})`);
    for (const k of other) if (!base.has(k)) failures.push(`${baseName} is missing ${k} (present in ${name})`);
  }
}

// ── 2. MOTION_QUERY ↔ globals.css ──────────────────────────────────────────
const visuals = read("src/components/sections/visuals.tsx");
const mq = visuals.match(/export const MOTION_QUERY = "([^"]+)"/)?.[1];
if (!mq) {
  failures.push("visuals.tsx: could not find `export const MOTION_QUERY = \"...\"`");
} else {
  const css = read("src/app/globals.css");
  const gate = `@media ${mq} {`;
  if (!css.includes(gate)) {
    failures.push(
      `globals.css has no \`${gate}\` block — the .expertise-pinned gate must use exactly MOTION_QUERY from visuals.tsx`
    );
  }
}

// ── Report ─────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error("Invariant check failed:\n" + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
console.log(
  `Invariants OK: ${locales.length} locales, ${dictFiles.length} dictionaries with matching key trees, motion query in sync.`
);
