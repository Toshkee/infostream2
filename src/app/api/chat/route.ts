import { getDictionary, hasLocale, defaultLocale, type Locale } from "@/lib/dictionaries";
import { getAssistantFacts } from "@/lib/facts";
import { assistantEnabled } from "@/lib/assistantFlag";
import {
  buildSystemPrompt,
  GEMINI_MODELS,
  LIMITS,
  type ChatMessage,
} from "@/lib/assistant";
import type { ChatErrorCode } from "@/lib/chatLimits";

// Server route — proxies the browser to Gemini so the API key never ships to
// the client. POST is never cached by Next. The key is read from process.env.
//
// proxy.ts excludes /api from locale redirects, so /api/chat is reachable as-is.

// The key travels in the x-goog-api-key header, never the URL — query strings
// routinely end up in proxy/CDN/server logs.
const endpoint = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

// ── Best-effort in-memory rate limit ────────────────────────────────────────
// Per server instance (resets on cold start) — a soft guard against abuse of a
// public, key-backed endpoint, not a hard quota.
const RATE = { windowMs: 60_000, max: 20 };
// Aggregate ceiling across ALL callers. The per-IP key can be sidestepped by
// rotating a forged X-Forwarded-For, but every request still counts here, so
// this caps total upstream Gemini calls (and spend) under a forged-IP flood.
const GLOBAL = { windowMs: 60_000, max: 240 };
// With no trusted proxy there is no per-caller throttle at all, so the
// aggregate ceiling is the only thing bounding a single abuser's spend; halve
// it in that mode. Still far above what a small site's real visitors produce.
const GLOBAL_UNTRUSTED_MAX = 120;
const hits = new Map<string, number[]>();
// Hard cap on the raw request body, checked before it is read. Generous over
// LIMITS.maxTotalChars to leave room for JSON framing and multi-byte text.
const MAX_BODY_BYTES = 64_000;
let globalHits: number[] = [];

// `ip` is null when no trusted proxy identifies the caller — only the aggregate
// ceiling applies then, since every request would otherwise share one bucket.
function rateLimited(ip: string | null): boolean {
  const now = Date.now();

  globalHits = globalHits.filter((t) => now - t < GLOBAL.windowMs);
  globalHits.push(now);
  if (globalHits.length > (ip === null ? GLOBAL_UNTRUSTED_MAX : GLOBAL.max)) return true;

  if (ip === null) return false;

  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE.windowMs);
  recent.push(now);
  hits.set(ip, recent);
  // Bounded memory under a forged-IP flood: drop buckets whose newest hit has
  // aged out of the window, rather than wiping every live visitor's budget.
  if (hits.size > 5_000)
    for (const [k, ts] of hits) if (now - ts[ts.length - 1] >= RATE.windowMs) hits.delete(k);
  return recent.length > RATE.max;
}

// ── Minimal shape of the Gemini generateContent response ────────────────────
interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

// Statuses worth retrying or failing over to another model.
const TRANSIENT = new Set([429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type GeminiCall =
  | { ok: true; res: Response }
  | { ok: false; status: number; detail: string };

// Walk the model fallback chain. Retry server overload (5xx) once per model
// with a short backoff; on a per-model quota cap (429) move straight to the
// next model. The first model to answer wins.
async function callGemini(payload: unknown, apiKey: string): Promise<GeminiCall> {
  let status = 0;
  let detail = "";
  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; ; attempt++) {
      let res: Response;
      try {
        res = await fetch(endpoint(model), {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(20_000),
        });
      } catch (e) {
        status = 0;
        detail = String(e);
        break; // network/timeout → try the next model
      }
      if (res.ok) return { ok: true, res };
      status = res.status;
      detail = await res.text().catch(() => "");
      if (!TRANSIENT.has(status)) return { ok: false, status, detail }; // hard error
      if (status >= 500 && attempt < 1) {
        await sleep(400);
        continue; // quick retry on transient server overload
      }
      break; // 429 or retry spent → next model
    }
  }
  return { ok: false, status, detail };
}

function isChatMessage(m: unknown): m is ChatMessage {
  if (!m || typeof m !== "object") return false;
  const { role, content } = m as Record<string, unknown>;
  return (role === "user" || role === "assistant") && typeof content === "string";
}

// Markers from buildSystemPrompt — if any surfaces in a reply, the model has
// leaked its instructions; we swap in a safe fallback instead of returning it.
const LEAK_MARKERS = ["YOUR ONE JOB", "HARD RULES", "FACT BRIEF"];

export async function POST(request: Request) {
  const startedAt = Date.now();
  // Kill switch: ASSISTANT_ENABLED=0 hides the widget (layout) and refuses
  // the endpoint, so a misbehaving bot can be turned off without a code change.
  if (!assistantEnabled())
    return Response.json(
      { error: "The assistant is disabled.", code: "disabled" satisfies ChatErrorCode },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );

  // Verbose upstream error detail is opt-in (CHAT_DEBUG=1) and refused in
  // production outright, so a misconfigured deploy can't leak provider detail.
  const debug = process.env.CHAT_DEBUG === "1" && process.env.NODE_ENV !== "production";
  // Chat replies are per-conversation; make sure no CDN in front ever caches one.
  const json = (data: unknown, status = 200) =>
    Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
  // `error` stays English for logs and the network tab; `code` is what the
  // widget renders, mapped through the visitor's own dictionary.
  const fail = (status: number, error: string, code: ChatErrorCode, log?: unknown) => {
    if (log !== undefined) console.error("[/api/chat]", log);
    return json({ error, code }, status);
  };

  // Cross-site guard. The widget always sends a same-origin JSON fetch, so a
  // request from another site (a page firing "simple" text/plain POSTs at the
  // endpoint to burn quota) is refused before it costs anything. Requiring the
  // JSON content type also forces a CORS preflight for any cross-origin
  // browser caller, which this route never answers. Curl can still forge
  // these; the rate limits below are what bound that.
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none")
    return fail(403, "Cross-site requests are not accepted.", "generic");
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return fail(415, "Expected application/json.", "generic");
  // Reject oversized bodies before buffering/parsing them. The limits below
  // allow at most maxTotalChars of message text, so anything well beyond that
  // (JSON overhead, multi-byte characters) is not a legitimate widget request.
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES)
    return fail(413, "Request body is too large.", "tooLong");

  // Rate limit by client IP, read from forwarding headers ONLY when the deploy
  // declares that a trusted proxy sets them (TRUSTED_PROXY=1). A platform like
  // Vercel overwrites x-real-ip with a value the caller can't control, but on a
  // host that passes client headers through, an attacker rotating a forged
  // x-real-ip would get a fresh per-IP budget on every request. Without the
  // flag every caller shares the "anon" bucket, so the limit still bites; the
  // aggregate ceiling in rateLimited() backstops either way.
  // With no trusted proxy the request is NOT bucketed per IP at all: lumping
  // every visitor into one shared 20/min bucket would throttle a handful of
  // simultaneous legitimate readers off the assistant, which is worse than the
  // abuse it prevents. The global ceiling still bounds upstream spend.
  const trustProxy = process.env.TRUSTED_PROXY === "1";
  const ip = trustProxy
    ? request.headers.get("x-real-ip")?.trim() ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "anon"
    : null;
  if (rateLimited(ip)) return fail(429, "Too many requests. Please slow down.", "rateLimited");

  // Parse + validate the body.
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return fail(413, "Request body is too large.", "tooLong");
    body = JSON.parse(text);
  } catch {
    return fail(400, "Invalid request body.", "generic");
  }
  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  const langRaw = obj.lang;
  const lang: Locale =
    typeof langRaw === "string" && hasLocale(langRaw) ? langRaw : defaultLocale;

  const rawMessages = obj.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0)
    return fail(400, "No messages provided.", "generic");
  if (rawMessages.length > LIMITS.maxMessages)
    return fail(400, "Conversation is too long.", "tooLong");
  if (!rawMessages.every(isChatMessage)) return fail(400, "Malformed messages.", "generic");

  const messages = rawMessages as ChatMessage[];
  let total = 0;
  for (const m of messages) {
    if (m.content.length > LIMITS.maxCharsPerMessage)
      return fail(400, "Message is too long.", "tooLong");
    total += m.content.length;
  }
  if (total > LIMITS.maxTotalChars) return fail(400, "Conversation is too long.", "tooLong");
  // Enforce strict user/assistant alternation starting and ending with the user.
  // The client only ever sends well-formed histories, so this rejects forged
  // requests that inject self-attributed "assistant" turns to prime a jailbreak.
  for (let i = 0; i < messages.length; i++) {
    const expected = i % 2 === 0 ? "user" : "assistant";
    if (messages[i].role !== expected) return fail(400, "Malformed conversation.", "generic");
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey)
    return fail(500, "The assistant isn't configured yet.", "generic", "GEMINI_API_KEY is not set");

  const [dict, facts] = await Promise.all([getDictionary(lang), getAssistantFacts(lang)]);
  const payload = {
    systemInstruction: { parts: [{ text: buildSystemPrompt(dict, facts, lang) }] },
    contents: messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    generationConfig: { temperature: 0.3, topP: 0.9, maxOutputTokens: 800 },
  };

  const call = await callGemini(payload, apiKey);
  if (!call.ok) {
    // 429 (quota) / 5xx (overload) / 0 (network) are all "busy, try again";
    // anything else is a genuine problem with the request.
    const busy = call.status === 429 || call.status === 0 || call.status >= 500;
    return fail(
      busy ? 503 : 502,
      debug
        ? `Gemini error ${call.status}: ${call.detail.slice(0, 600)}`
        : busy
          ? "The assistant is busy right now. Please try again in a moment."
          : "The assistant had a problem. Please try again.",
      busy ? "busy" : "generic",
      `Gemini ${call.status}: ${call.detail.slice(0, 1000)}`
    );
  }

  let data: GeminiResponse;
  try {
    data = (await call.res.json()) as GeminiResponse;
  } catch (e) {
    return fail(502, "Unexpected response from the assistant.", "generic", e);
  }

  const parts = data.candidates?.[0]?.content?.parts;
  const reply = Array.isArray(parts)
    ? parts.map((p) => (typeof p?.text === "string" ? p.text : "")).join("").trim()
    : "";

  // One line per answered request, without message content: enough to see
  // volume, latency and how often the fallback fires, nothing to leak.
  const audit = (outcome: "ok" | "empty" | "leak") =>
    console.info(
      `[/api/chat] ${outcome} lang=${lang} turns=${messages.length} in=${total} out=${reply.length} ms=${Date.now() - startedAt}`
    );

  // Empty/blocked completions fall back to a safe, on-brand message.
  if (!reply) {
    audit("empty");
    return json({ reply: dict.assistant.fallback });
  }

  // Output-side guard: if the model ever echoes its own instructions, don't
  // hand that to the user — return the safe fallback instead.
  if (LEAK_MARKERS.some((m) => reply.includes(m))) {
    audit("leak");
    return json({ reply: dict.assistant.fallback });
  }

  audit("ok");
  return json({ reply });
}
