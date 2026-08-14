/* ============================================================================
 *  KEY CHECKER  â€”  npm run check-keys
 *
 *  Tells you whether your Sarvam key actually works, for both the
 *  conversation and the voice, before you rely on it.
 *
 *  It never prints the key, so this is safe to run and safe to screenshot.
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

const ok = (m) => console.log(`  âœ“ ${m}`);
const bad = (m) => console.log(`  âœ— ${m}`);
const info = (m) => console.log(`    ${m}`);

await loadEnv();

const key = process.env.SARVAM_API_KEY;
// `||` not `??` â€” a variable created in a dashboard and left blank is "".
const model = process.env.SARVAM_MODEL?.trim() || "sarvam-105b-conversations";

console.log("Checking your key. Nothing here is printed to screen or saved.\n");

if (!key) {
  bad("No SARVAM_API_KEY set.");
  info("Get one at https://sarvam.ai and put it in .env.local");
  info("Without it the demo answers from a script, which still works.");
  process.exit(0);
}

/* ------------------------------------------------------- 1. the conversation */
console.log("THE CONVERSATION");
try {
  const r = await fetch("https://api.sarvam.ai/v1/chat/completions", {
    method: "POST",
    headers: { "api-subscription-key": key, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Reply with the single word: ready" }],
      max_tokens: 20,
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (r.status === 401 || r.status === 403) {
    bad("The key was rejected. Check you copied the whole thing.");
  } else if (r.status === 429) {
    ok("Key is valid, but you have hit the rate limit. Try again shortly.");
  } else if (!r.ok) {
    const body = await r.text();
    bad(`Sarvam replied ${r.status}.`);
    info(body.slice(0, 200).replace(/\s+/g, " "));
  } else {
    const d = await r.json();
    ok(`Working. Replied: "${d?.choices?.[0]?.message?.content?.trim() ?? "(empty)"}"`);
    info(`Model: ${model}`);
  }
} catch {
  bad("Could not reach Sarvam. Check your internet connection.");
}

/* ------------------------------------------------------------- 2. the voice */
console.log("\nTHE VOICE");
try {
  const t0 = Date.now();
  const r = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: { "api-subscription-key": key, "content-type": "application/json" },
    body: JSON.stringify({
      text: "à®µà®£à®•à¯à®•à®®à¯",
      target_language_code: "ta-IN",
      speaker: process.env.SARVAM_SPEAKER?.trim() || "ritu",
      model: "bulbul:v3",
      output_audio_codec: "mp3",
    }),
    signal: AbortSignal.timeout(30000),
  });
  const ms = Date.now() - t0;

  if (!r.ok) {
    bad(`Sarvam replied ${r.status}.`);
    info((await r.text()).slice(0, 200).replace(/\s+/g, " "));
  } else {
    const d = await r.json();
    const bytes = d?.audios?.[0] ? Buffer.from(d.audios[0], "base64").length : 0;
    if (!bytes) bad("No audio came back.");
    else {
      ok(`Working. Spoke Tamil in ${ms}ms (${(bytes / 1024).toFixed(0)}KB).`);
      info("This is what lets Tamil play on a PC or an iPhone, neither of");
      info("which can install a Tamil voice of its own.");
    }
  }
} catch {
  bad("Could not reach Sarvam text-to-speech.");
}

console.log("");
