/* ============================================================================
 *  KEY CHECKER
 *
 *      npm run check-keys
 *
 *  Tells you whether each key actually works, before you rely on it.
 *  It never prints a key, so this is safe to run and safe to screenshot.
 * ========================================================================== */

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function loadEnv() {
  try {
    const raw = await readFile(join(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    console.log("No .env.local file found.\n");
  }
}

const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => console.log(`  ✗ ${m}`);
const info = (m) => console.log(`    ${m}`);

async function checkGemini() {
  console.log("\nSTEP 1 — the demo's brain (Gemini)");
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    bad("No key set yet.");
    info("Get one at https://aistudio.google.com/apikey and paste it into");
    info(".env.local after GEMINI_API_KEY=");
    info("Until then the demo answers from its script, which still works.");
    return;
  }
  // Google issues two formats: the older "AIza..." and the newer "AQ....".
  // Only flag the obvious mix-up — an ElevenLabs key on the Gemini line.
  if (key.startsWith("sk_")) {
    bad("That is an ElevenLabs key, not a Google one.");
    info("It belongs on the ELEVENLABS_API_KEY line instead.");
    return;
  }

  // `||` not `??` — a blank env var is "" and must fall back. See lib/brain.ts.
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Reply with the single word: ready" }] }],
          generationConfig: { maxOutputTokens: 50, thinkingConfig: { thinkingBudget: 0 } },
        }),
        signal: AbortSignal.timeout(15000),
      },
    );

    if (res.status === 400 || res.status === 403) {
      bad("The key was rejected by Google.");
      info("Check you copied the whole thing, with no spaces.");
      return;
    }
    if (res.status === 404) {
      bad(`Google does not know the model "${model}".`);
      info("Remove the GEMINI_MODEL line from .env.local to use the default.");
      return;
    }
    if (res.status === 429) {
      ok("Key is valid.");
      info("You have hit today's free limit. It resets tomorrow.");
      return;
    }
    if (!res.ok) {
      bad(`Google replied ${res.status}. Try again in a minute.`);
      return;
    }

    const data = await res.json();
    const said = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    ok(`Working. Gemini replied: "${said ?? "(empty)"}"`);
    info(`Model: ${model}`);
    info("Your demo now uses real AI. Restart `npm run dev` to pick it up.");
  } catch {
    bad("Could not reach Google. Check your internet connection.");
  }
}

async function checkElevenLabs() {
  console.log("\nSTEP 2 — the recorded voices (ElevenLabs)");
  const key = process.env.ELEVENLABS_API_KEY;
  const voice = process.env.ELEVENLABS_VOICE_ID;

  if (!key) {
    bad("No key set yet.");
    info("Optional. Without it the demo uses the visitor's own phone voice.");
    info("Get one at https://elevenlabs.io → profile icon → API Keys");
    return;
  }

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
      headers: { "xi-api-key": key },
      signal: AbortSignal.timeout(15000),
    });

    if (res.status === 401) {
      const body = await res.text();
      if (body.includes("missing the permission")) {
        bad("The key works, but was created with no permissions.");
        info("On elevenlabs.io → API Keys → edit your key, and switch on");
        info("'Text to Speech', 'Voices: read' and 'User: read'.");
      } else {
        bad("The key was rejected. Check you copied the whole thing.");
      }
      info("");
      info("Worth knowing before you spend time on this: ElevenLabs' FREE");
      info("plan cannot use their voices through the API at all — it returns");
      info("'paid_plan_required'. Recording the clips needs a paid plan.");
      info("Without it the demo uses the visitor's own phone voice, free.");
      return;
    }
    if (!res.ok) {
      bad(`ElevenLabs replied ${res.status}.`);
      return;
    }

    const sub = await res.json();
    const used = sub.character_count ?? 0;
    const limit = sub.character_limit ?? 0;
    const left = limit - used;

    ok("Key is working.");
    info(`Allowance: ${left.toLocaleString()} of ${limit.toLocaleString()} characters left.`);

    if (left < 5297) {
      info(`You need 5,297 to record everything. Not enough left this month.`);
    } else {
      info("That is enough to record all 63 lines (5,297 characters).");
    }

    if (!voice) {
      bad("No ELEVENLABS_VOICE_ID set — needed before recording.");
      const vres = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: { "xi-api-key": key },
      });
      if (vres.ok) {
        const { voices = [] } = await vres.json();
        info("\n    Voices on your account — copy one of these IDs:");
        for (const v of voices.slice(0, 12)) {
          info(`      ${v.voice_id}   ${v.name}`);
        }
      }
      return;
    }

    ok(`Voice ID set. Ready — run: npm run voice`);
  } catch {
    bad("Could not reach ElevenLabs. Check your internet connection.");
  }
}

await loadEnv();
console.log("Checking your keys. Nothing here is printed to screen or saved.");
await checkGemini();
await checkElevenLabs();
console.log("");
