/* ============================================================================
 *  COST GUARDRAILS
 *
 *  Everything that stops this demo from ever producing a bill lives here.
 *  Change the numbers, nothing else.
 *
 *  When any limit is reached the demo does not break and does not show an
 *  error - it quietly drops to the scripted conversation, which is free and
 *  unlimited. A visitor cannot tell the difference.
 * ========================================================================== */

export const LIMITS = {
  /** Longest a single demo call can run. A real enquiry is shorter than this. */
  maxTurnsPerCall: 6,

  /** One visitor may start a call this often. */
  callsPerWindow: 2,
  windowMinutes: 10,

  /** Ceiling on live AI replies per day across all visitors. Set well below
   *  Gemini's free allowance so the free tier is never actually exhausted. */
  liveRepliesPerDay: 150,

  /** Longest reply we will speak aloud, in characters. */
  maxSpokenChars: 320,
} as const;

/* --------------------------------------------------------------------------
 * In-memory counters.
 *
 * Deliberately not a database. On Vercel's free tier each serverless instance
 * keeps its own copy and they reset when instances recycle - which makes these
 * limits approximate rather than exact. That is the right trade here: the
 * limits exist to prevent runaway cost, not to bill anyone, and adding a
 * database to enforce them precisely would cost more than it saves.
 * ------------------------------------------------------------------------ */

const callers = new Map<string, number[]>();
let dayStamp = today();
let liveRepliesToday = 0;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function rollDayIfNeeded(): void {
  const now = today();
  if (now !== dayStamp) {
    dayStamp = now;
    liveRepliesToday = 0;
  }
}

/** Rough per-visitor identity. Good enough to stop casual hammering; it is
 *  not a security control and is not stored anywhere. */
export function callerKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return fwd.split(",")[0].trim() || req.headers.get("x-real-ip") || "anon";
}

/** True when this visitor may start another call. */
export function mayStartCall(key: string): boolean {
  const now = Date.now();
  const windowMs = LIMITS.windowMinutes * 60_000;
  const recent = (callers.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= LIMITS.callsPerWindow) {
    callers.set(key, recent);
    return false;
  }

  recent.push(now);
  callers.set(key, recent);

  // Keep the map from growing without bound on a long-lived instance.
  if (callers.size > 5000) callers.clear();
  return true;
}

/** True when we still have live-AI budget left today. Reserves one as it
 *  answers, so concurrent requests cannot both slip past the ceiling. */
export function claimLiveReply(): boolean {
  rollDayIfNeeded();
  if (liveRepliesToday >= LIMITS.liveRepliesPerDay) return false;
  liveRepliesToday += 1;
  return true;
}

export function budgetStatus() {
  rollDayIfNeeded();
  return { used: liveRepliesToday, limit: LIMITS.liveRepliesPerDay };
}
