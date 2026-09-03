// Request-shape contract shared by /api/chat and the client widget.
//
// Client-safe on purpose: assistant.ts reaches the server-only dictionary and
// fact loaders, so the browser bundle can't import these from there. The route
// re-exports LIMITS from assistant.ts for continuity.

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/** Defends the public endpoint against oversized or runaway prompts. */
export const LIMITS = {
  maxMessages: 16,
  maxCharsPerMessage: 2_000,
  maxTotalChars: 8_000,
} as const;

/**
 * Machine-readable failure reasons. The route returns one of these next to its
 * English `error` text so the widget can render a string in the visitor's own
 * language instead of echoing a server message written in English.
 */
export type ChatErrorCode = "disabled" | "rateLimited" | "tooLong" | "busy" | "generic";

const CODES: readonly ChatErrorCode[] = ["disabled", "rateLimited", "tooLong", "busy", "generic"];

export const isChatErrorCode = (v: unknown): v is ChatErrorCode =>
  typeof v === "string" && (CODES as readonly string[]).includes(v);

/**
 * The trailing slice of a conversation that still satisfies the route's limits.
 *
 * The panel keeps the full transcript on screen, but sending all of it would
 * make the 9th exchange exceed maxMessages and fail every send from then on.
 * The route also demands strict user/assistant alternation starting with a
 * user turn, so the window may only start on an even index — histories are
 * always [user, assistant, user, …, user]. Whole pairs are dropped from the
 * front, which preserves that alignment.
 */
export function conversationWindow(history: readonly ChatMessage[]): ChatMessage[] {
  let win = history.map(({ role, content }) => ({ role, content }));

  // Leave room for the reply that comes back; keep the count odd (ends on user).
  const maxTurns = LIMITS.maxMessages % 2 === 0 ? LIMITS.maxMessages - 1 : LIMITS.maxMessages;
  if (win.length > maxTurns) win = win.slice(win.length - maxTurns);
  // Defensive: a window must open on a user turn whatever the caller handed us.
  if (win.length && win[0].role !== "user") win = win.slice(1);

  let total = win.reduce((n, m) => n + m.content.length, 0);
  while (total > LIMITS.maxTotalChars && win.length > 1) {
    total -= win[0].content.length + win[1].content.length;
    win = win.slice(2);
  }
  return win;
}
