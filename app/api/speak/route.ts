import { LIMITS } from "@/lib/limits";
import { LANGUAGES, type LanguageCode } from "@/lib/languages";

/**
 * Turns a line of text into audio, using Sarvam's Bulbul model.
 *
 * This exists because the browser's own speech engine can only use voices
 * installed in the operating system — and Windows ships no Tamil voice at
 * all, which left the receptionist completely silent on a PC. Generating the
 * audio on the server is what lets her speak Tamil on any device, including
 * iPhones, where the browser could never do it.
 *
 * Sarvam rather than Google or ElevenLabs because it is built for Indian
 * languages specifically and covers all ten in the picker from one provider.
 *
 * The API key never reaches the browser. That is the whole point of this file.
 */

export const dynamic = "force-dynamic";

/* The Sarvam voice used for every receptionist.
 * Override with SARVAM_SPEAKER without touching code — other options on
 * bulbul:v3 include priya, neha, pooja, simran and aditya. */
const SPEAKER = process.env.SARVAM_SPEAKER?.trim() || "ritu";
const MODEL = process.env.SARVAM_TTS_MODEL?.trim() || "bulbul:v3";

const VALID = new Set<string>(LANGUAGES.map((l) => l.code));

export async function POST(req: Request) {
  const key = process.env.SARVAM_API_KEY;
  // No key configured — the caller falls back to the device's own voice.
  if (!key) return new Response(null, { status: 204 });

  let body: { text?: string; language?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const text = (body.text ?? "").trim().slice(0, LIMITS.maxSpokenChars);
  if (!text) return new Response(null, { status: 400 });

  const code = (VALID.has(body.language ?? "") ? body.language : "ta") as LanguageCode;
  const locale = LANGUAGES.find((l) => l.code === code)?.locale ?? "ta-IN";

  try {
    const res = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: { "api-subscription-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        text,
        target_language_code: locale,
        speaker: SPEAKER,
        model: MODEL,
        // mp3 rather than the default wav — roughly a tenth of the bytes over
        // a 4G connection, which is what most visitors are on.
        output_audio_codec: "mp3",
      }),
      // Long enough for Tamil (~2.9s measured), short enough that a stalled
      // upstream never leaves the caller listening to silence.
      signal: AbortSignal.timeout(9000),
    });

    if (!res.ok) return new Response(null, { status: 204 });

    const data = await res.json();
    const b64: string | undefined = data?.audios?.[0];
    if (!b64) return new Response(null, { status: 204 });

    return new Response(Buffer.from(b64, "base64"), {
      headers: {
        "content-type": "audio/mpeg",
        // The same line recurs constantly, so let the CDN and the browser
        // keep it rather than paying to synthesise it twice.
        "cache-control": "public, max-age=86400",
      },
    });
  } catch {
    // Never surface an error here. A silent 204 makes the caller fall through
    // to the device's own voice, and the conversation carries on.
    return new Response(null, { status: 204 });
  }
}
