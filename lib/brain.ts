/* ============================================================================
 *  THE DEMO'S BRAIN
 *
 *  One function, `generateReply`, with two implementations behind it:
 *
 *    1. Gemini      - real AI, free tier, used when GEMINI_API_KEY is set.
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
  source: "gemini" | "scripted";
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
 * GEMINI PATH
 *
 * Uses the REST endpoint directly rather than the SDK - it is one fetch, and
 * it keeps the dependency list (and therefore the install and cold start)
 * smaller. Model id is configurable so it can be changed without a code edit.
 * ------------------------------------------------------------------------ */

/* Verified against a live free-tier key on 2026-08-13.
 *
 * Two things to know if you ever change this:
 *   - gemini-2.5-flash is retired for new accounts and returns 404.
 *   - Gemini 3.x models think by default, and thinking tokens are charged
 *     against maxOutputTokens. Left on, a 120-token budget gets eaten by
 *     thinking and the caller receives a half-finished sentence. A
 *     receptionist does not need to deliberate, so it is switched off below —
 *     which also takes the reply from ~23s down to ~1.2s. */
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";

async function geminiReply(
  industry: IndustryId,
  language: LanguageCode,
  history: Turn[],
  apiKey: string,
): Promise<ReplyResult> {
  const persona = getPersona(industry);
  const lang = getLanguage(language);
  const system = buildSystemPrompt(persona, lang.english);

  const contents = history.length
    ? history.map((t) => ({
        role: t.role === "caller" ? "user" : "model",
        parts: [{ text: t.text }],
      }))
    : [{ role: "user", parts: [{ text: "(the caller has just connected)" }] }];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: system }] },
        generationConfig: {
          // A receptionist is brief. This is also the main cost control.
          maxOutputTokens: 200,
          temperature: 0.7,
          // See the note on GEMINI_MODEL above - without this the reply
          // arrives truncated and slow.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      // Never let a slow upstream hold the caller waiting.
      signal: AbortSignal.timeout(8000),
    },
  );

  if (!res.ok) throw new Error(`gemini ${res.status}`);

  const data = await res.json();
  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join("").trim();

  if (!text) throw new Error("gemini returned nothing");

  return { text, source: "gemini" };
}

/* --------------------------------------------------------------------------
 * THE ONE ENTRY POINT
 * ------------------------------------------------------------------------ */

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
  const key = process.env.GEMINI_API_KEY;

  if (opts.allowLive && key) {
    try {
      const live = await geminiReply(industry, language, history, key);
      // If the live reply happens to match a recorded line, play the recording.
      const persona = getPersona(industry);
      if (isScriptedLanguage(language)) {
        const lines = persona.byLanguage[language].lines;
        const match = Object.entries(lines).find(([, v]) => v === live.text);
        if (match) live.clip = match[0];
      }
      return live;
    } catch {
      // Fall through. A visitor should never see an error where a
      // receptionist should be.
    }
  }

  // Non-flagship languages have no script, so fall back to English rather
  // than showing nothing at all.
  const lang: ScriptedLanguage = isScriptedLanguage(language) ? language : "en";
  return scriptedReply(industry, lang, history);
}
