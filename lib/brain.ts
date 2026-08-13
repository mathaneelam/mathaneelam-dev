/* ============================================================================
 *  THE DEMO'S BRAIN
 *
 *  One function, `generateReply`, with two implementations behind it:
 *
 *    1. Sarvam      - real AI, used whenever SARVAM_API_KEY is set.
 *    2. Scripted    - a keyword-matched conversation that needs no key,
 *                     no network and no quota. It can never fail.
 *
 *  The scripted path is not a stub. It is the guarantee that this demo works
 *  on the day the free quota runs out, and it is what runs if the site is
 *  deployed before Mathan has any keys at all.
 *
 *  Swapping to Claude or any other provider later is a matter of adding one
 *  more function here and one line in `generateReply`.
 * ========================================================================== */

import {
  buildSystemPrompt,
  getPersona,
  type IndustryId,
  type ScriptedLanguage,
} from "./personas";
import { getLanguage, type LanguageCode } from "./languages";

export interface Turn {
  role: "caller" | "agent";
  text: string;
}

export interface ReplyResult {
  text: string;
  /** Clip id when the reply matches a recorded line, so it plays instantly. */
  clip?: string;
  /** Which path answered - shown nowhere, used for debugging and logging. */
  source: "sarvam" | "scripted";
  /** True when the receptionist has wrapped the call up. */
  ended?: boolean;
}

/* --------------------------------------------------------------------------
 * SCRIPTED PATH
 *
 * Intent matching by keyword. The keywords are listed in all three scripts
 * plus the English loanwords Indians actually type mid-sentence ("appointment",
 * "timing", "fees") - which is how people really write, and what a naive
 * English-only keyword list would miss completely.
 * ------------------------------------------------------------------------ */

type Intent = "timings" | "price" | "booking" | "trial" | "bye";

const INTENT_KEYWORDS: Record<Intent, string[]> = {
  timings: [
    "time", "timing", "open", "close", "hour", "when", "sunday", "shift",
    "நேரம்", "எப்போ", "திற", "ஞாயி",
    "समय", "कब", "खुल", "बंद", "रविवार",
  ],
  price: [
    "price", "cost", "fee", "fees", "charge", "rate", "how much", "rupee", "lakh",
    "விலை", "எவ்வளவு", "கட்டணம்", "ரூபாய்", "லட்ச",
    "कीमत", "कितना", "फीस", "खर्च", "रुपये", "लाख", "दाम",
  ],
  booking: [
    "book", "appointment", "slot", "visit", "come", "today", "tomorrow", "pain",
    "பதிவு", "வலி", "இன்னைக்கு", "நாளை", "வர",
    "बुक", "अपॉइंटमेंट", "दर्द", "आज", "कल", "आना",
  ],
  trial: [
    "trial", "free", "demo", "try", "sample",
    "இலவச", "முயற்சி",
    "ट्रायल", "मुफ़्त", "फ्री",
  ],
  bye: [
    "thank", "thanks", "bye", "ok fine", "okay fine",
    "நன்றி", "சரி", "வணக்கம்",
    "धन्यवाद", "शुक्रिया", "ठीक",
  ],
};

/** Which recorded clip answers which intent, per industry. */
const INTENT_TO_CLIP: Record<IndustryId, Partial<Record<Intent, string>>> = {
  clinic: { timings: "timings", price: "consultation", booking: "pain", bye: "bye" },
  property: { timings: "visit", price: "price", booking: "visit", trial: "visit", bye: "bye" },
  fitness: { timings: "timings", price: "fees", booking: "trial", trial: "trial", bye: "bye" },
};

function detectIntent(input: string): Intent | null {
  const text = input.toLowerCase();
  let best: { intent: Intent; score: number } | null = null;

  for (const [intent, words] of Object.entries(INTENT_KEYWORDS) as [Intent, string[]][]) {
    const score = words.reduce((n, w) => (text.includes(w) ? n + w.length : n), 0);
    if (score > 0 && (!best || score > best.score)) best = { intent, score };
  }
  return best?.intent ?? null;
}

export function scriptedReply(
  industry: IndustryId,
  language: ScriptedLanguage,
  history: Turn[],
): ReplyResult {
  const persona = getPersona(industry);
  const locale = persona.byLanguage[language];
  const last = [...history].reverse().find((t) => t.role === "caller");

  // Opening the call.
  if (!last) {
    return { text: locale.greeting, clip: "greeting", source: "scripted" };
  }

  const intent = detectIntent(last.text);

  if (intent === "bye") {
    return { text: locale.lines.bye, clip: "bye", source: "scripted", ended: true };
  }

  const clip = intent ? INTENT_TO_CLIP[industry][intent] : undefined;
  if (clip && locale.lines[clip]) {
    return { text: locale.lines[clip], clip, source: "scripted" };
  }

  // Second time we cannot place the question, offer a callback and wrap up -
  // exactly what the real product should do rather than guessing.
  const misses = history.filter((t) => t.role === "agent" && t.text === locale.lines.unsure).length;
  if (misses >= 1) {
    return { text: locale.lines.booking, clip: "booking", source: "scripted", ended: true };
  }

  return { text: locale.lines.unsure, clip: "unsure", source: "scripted" };
}

/* --------------------------------------------------------------------------
 * SARVAM PATH
 *
 * Uses the REST endpoint directly rather than the SDK - it is one fetch, and
 * it keeps the dependency list (and therefore the install and cold start)
 * smaller. Model id is configurable so it can be changed without a code edit.
 * ------------------------------------------------------------------------ */

/* Verified against a live key on 2026-08-13: an unscripted Tamil question was
 * answered in 1.7s, in natural spoken Tamil, correctly using the given facts.
 *
 * Two things to know if you change the model:
 *   - `sarvam-m` is deprecated and returns 400.
 *   - plain `sarvam-105b` returns a response shape this code does not read.
 *     The `-conversations` variant is the one tuned for dialogue.
 *
 * `||` with .trim(), deliberately, NOT `??`. An env var that exists but is
 * blank — which is what you get from creating the variable in a dashboard and
 * leaving the value empty — is `""`, and `??` would happily accept it. That
 * exact mistake previously sent an empty model name upstream and produced a
 * silent fallback to the script with no visible symptom. */
const SARVAM_MODEL = process.env.SARVAM_MODEL?.trim() || "sarvam-105b-conversations";

async function sarvamReply(
  industry: IndustryId,
  language: LanguageCode,
  history: Turn[],
  apiKey: string,
): Promise<ReplyResult> {
  const persona = getPersona(industry);
  const lang = getLanguage(language);
  const system = buildSystemPrompt(persona, lang.english);

  const messages: { role: string; content: string }[] = [
    { role: "system", content: system },
    ...history.map((t) => ({
      role: t.role === "caller" ? "user" : "assistant",
      content: t.text,
    })),
  ];

  // On the opening turn there is nothing to answer yet, so prompt her to pick
  // up rather than sending a conversation with no user message in it.
  if (!history.length) {
    messages.push({ role: "user", content: "(the caller has just connected)" });
  }

  const res = await fetch("https://api.sarvam.ai/v1/chat/completions", {
    method: "POST",
    headers: { "api-subscription-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      model: SARVAM_MODEL,
      messages,
      // A receptionist is brief. This is also the main cost control.
      max_tokens: 200,
      temperature: 0.7,
    }),
    // Never let a slow upstream hold the caller waiting in silence.
    signal: AbortSignal.timeout(9000),
  });

  if (!res.ok) throw new Error(`sarvam ${res.status}`);

  const data = await res.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("sarvam returned nothing");

  return { text, source: "sarvam" };
}

/* --------------------------------------------------------------------------
 * THE ONE ENTRY POINT
 * ------------------------------------------------------------------------ */

/* Why the last request did NOT use live AI. Surfaced only via ?debug=1 on the
 * API route, and only ever as a category — never the key or any user text.
 * Exists because the fallback is deliberately silent, which makes a
 * misconfigured deployment impossible to tell apart from a working one. */
export const diagnostics: { lastReason: string | null } = { lastReason: null };

const SCRIPTED_LANGUAGES: ScriptedLanguage[] = ["ta", "hi", "en"];

export function isScriptedLanguage(code: LanguageCode): code is ScriptedLanguage {
  return (SCRIPTED_LANGUAGES as LanguageCode[]).includes(code);
}

export async function generateReply(
  industry: IndustryId,
  language: LanguageCode,
  history: Turn[],
  opts: { allowLive: boolean },
): Promise<ReplyResult> {
  const key = process.env.SARVAM_API_KEY;

  if (!key) diagnostics.lastReason = "no SARVAM_API_KEY in this build";
  else if (!opts.allowLive) diagnostics.lastReason = "live disabled (turn or daily cap reached)";

  if (opts.allowLive && key) {
    try {
      const live = await sarvamReply(industry, language, history, key);
      diagnostics.lastReason = null;
      // If the live reply happens to match a recorded line, play the recording.
      const persona = getPersona(industry);
      if (isScriptedLanguage(language)) {
        const lines = persona.byLanguage[language].lines;
        const match = Object.entries(lines).find(([, v]) => v === live.text);
        if (match) live.clip = match[0];
      }
      return live;
    } catch (err) {
      // Fall through. A visitor should never see an error where a
      // receptionist should be — but record why, so `?debug=1` can say.
      diagnostics.lastReason =
        err instanceof Error ? `sarvam call failed: ${err.message}` : "sarvam call failed";
    }
  }

  // Non-flagship languages have no script, so fall back to English rather
  // than showing nothing at all.
  const lang: ScriptedLanguage = isScriptedLanguage(language) ? language : "en";
  return scriptedReply(industry, lang, history);
}
