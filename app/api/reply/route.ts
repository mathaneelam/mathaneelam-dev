import { NextResponse } from "next/server";
import { generateReply, type Turn } from "@/lib/brain";
import { LIMITS, callerKey, claimLiveReply, mayStartCall } from "@/lib/limits";
import { LANGUAGES, type LanguageCode } from "@/lib/languages";
import { PERSONAS, type IndustryId } from "@/lib/personas";

/**
 * The only server route on the site.
 *
 * It exists for one reason: the API key must never reach the browser. It also
 * enforces the guardrails in lib/limits.ts, and it always returns a usable
 * reply — if anything at all goes wrong it answers from the scripted script
 * rather than returning an error. A visitor should never see a broken demo.
 */

// Next 16 deprecated the edge runtime, so this uses the Node runtime. The
// page itself stays fully static either way — only this route is dynamic.
export const dynamic = "force-dynamic";

const VALID_INDUSTRIES = new Set<string>(PERSONAS.map((p) => p.id));
const VALID_LANGUAGES = new Set<string>(LANGUAGES.map((l) => l.code));

interface Body {
  industry?: string;
  language?: string;
  history?: Turn[];
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const industry = (
    VALID_INDUSTRIES.has(body.industry ?? "") ? body.industry : "clinic"
  ) as IndustryId;
  const language = (
    VALID_LANGUAGES.has(body.language ?? "") ? body.language : "ta"
  ) as LanguageCode;

  // Sanitise the transcript. Never trust length or shape from the client.
  const history: Turn[] = Array.isArray(body.history)
    ? body.history
        .filter(
          (t): t is Turn =>
            !!t &&
            (t.role === "caller" || t.role === "agent") &&
            typeof t.text === "string",
        )
        .slice(-12)
        .map((t) => ({ role: t.role, text: t.text.slice(0, 500) }))
    : [];

  const callerTurns = history.filter((t) => t.role === "caller").length;

  // Opening the call is the moment we rate limit, not every turn — otherwise
  // a visitor gets cut off mid-conversation, which feels broken.
  if (history.length === 0 && !mayStartCall(callerKey(req))) {
    return NextResponse.json(
      { text: "", source: "scripted", rateLimited: true },
      { status: 200 },
    );
  }

  // Live AI is used only while there is budget left and the call is still
  // short. Otherwise the scripted path answers, free and instantly.
  const allowLive = callerTurns < LIMITS.maxTurnsPerCall && claimLiveReply();

  const reply = await generateReply(industry, language, history, { allowLive });

  return NextResponse.json(
    {
      ...reply,
      // Tell the client to wind the call up once the turn budget is spent.
      ended: reply.ended || callerTurns >= LIMITS.maxTurnsPerCall,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
