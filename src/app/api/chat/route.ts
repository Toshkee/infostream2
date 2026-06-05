import { getDictionary, hasLocale, defaultLocale, type Locale } from "@/lib/dictionaries";
import {
  buildSystemPrompt,
  GEMINI_MODELS,
  LIMITS,
  type ChatMessage,
} from "@/lib/assistant";

// Server route — proxies the browser to Gemini so the API key never ships to
// the client. POST is never cached by Next. The key is read from process.env.
//
// proxy.ts excludes /api from locale redirects, so /api/chat is reachable as-is.

const endpoint = (model: string, key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
    key
  )}`;

// ── Best-effort in-memory rate limit ────────────────────────────────────────
// Per server instance (resets on cold start) — a soft guard against abuse of a
// public, key-backed endpoint, not a hard quota.
const RATE = { windowMs: 60_000, max: 20 };
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE.windowMs);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5_000) hits.clear(); // opportunistic cleanup
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
        res = await fetch(endpoint(model, apiKey), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

function fallbackReply(lang: Locale): string {
  return lang === "mne"
    ? "Izvinite, trenutno ne mogu da odgovorim na to. Pokušajte da preformulišete pitanje o Infostreamu ili nas kontaktirajte na contact@infostream.me."
    : "Sorry, I couldn't answer that just now. Try rephrasing your question about Infostream, or reach us at contact@infostream.me.";
}

// Markers from buildSystemPrompt — if any surfaces in a reply, the model has
// leaked its instructions; we swap in a safe fallback instead of returning it.
const LEAK_MARKERS = ["YOUR ONE JOB", "HARD RULES", "FACT BRIEF"];

export async function POST(request: Request) {
  // Verbose upstream error detail is opt-in (CHAT_DEBUG=1) — never tied to
  // NODE_ENV, so a misconfigured deploy can't leak provider detail to clients.
  const debug = process.env.CHAT_DEBUG === "1";
  const fail = (status: number, error: string, log?: unknown) => {
    if (log !== undefined) console.error("[/api/chat]", log);
    return Response.json({ error }, { status });
  };

  // Rate limit by client IP (first hop in x-forwarded-for).
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anon";
  if (rateLimited(ip)) return fail(429, "Too many requests — please slow down.");

  // Parse + validate the body.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid request body.");
  }
  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  const langRaw = obj.lang;
  const lang: Locale =
    typeof langRaw === "string" && hasLocale(langRaw) ? langRaw : defaultLocale;

  const rawMessages = obj.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0)
    return fail(400, "No messages provided.");
  if (rawMessages.length > LIMITS.maxMessages)
    return fail(400, "Conversation is too long.");
  if (!rawMessages.every(isChatMessage)) return fail(400, "Malformed messages.");

  const messages = rawMessages as ChatMessage[];
  let total = 0;
  for (const m of messages) {
    if (m.content.length > LIMITS.maxCharsPerMessage)
      return fail(400, "Message is too long.");
    total += m.content.length;
  }
  if (total > LIMITS.maxTotalChars) return fail(400, "Conversation is too long.");
  // Enforce strict user/assistant alternation starting and ending with the user.
  // The client only ever sends well-formed histories, so this rejects forged
  // requests that inject self-attributed "assistant" turns to prime a jailbreak.
  for (let i = 0; i < messages.length; i++) {
    const expected = i % 2 === 0 ? "user" : "assistant";
    if (messages[i].role !== expected) return fail(400, "Malformed conversation.");
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey)
    return fail(500, "The assistant isn't configured yet.", "GEMINI_API_KEY is not set");

  const dict = await getDictionary(lang);
  const payload = {
    systemInstruction: { parts: [{ text: buildSystemPrompt(dict, lang) }] },
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
          ? "The assistant is busy right now — please try again in a moment."
          : "The assistant had a problem. Please try again.",
      `Gemini ${call.status}: ${call.detail.slice(0, 1000)}`
    );
  }

  let data: GeminiResponse;
  try {
    data = (await call.res.json()) as GeminiResponse;
  } catch (e) {
    return fail(502, "Unexpected response from the assistant.", e);
  }

  const parts = data.candidates?.[0]?.content?.parts;
  const reply = Array.isArray(parts)
    ? parts.map((p) => (typeof p?.text === "string" ? p.text : "")).join("").trim()
    : "";

  // Empty/blocked completions fall back to a safe, on-brand message.
  if (!reply) return Response.json({ reply: fallbackReply(lang) });

  // Output-side guard: if the model ever echoes its own instructions, don't
  // hand that to the user — return the safe fallback instead.
  if (LEAK_MARKERS.some((m) => reply.includes(m))) {
    console.error("[/api/chat] suppressed a reply that echoed system-prompt markers");
    return Response.json({ reply: fallbackReply(lang) });
  }

  return Response.json({ reply });
}
