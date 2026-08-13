/* ============================================================================
 *  ONE-TIME VOICE RECORDING  —  npm run voice
 *
 *  Generates an audio file for every line in lib/personas.ts and saves it to
 *      public/voice/{language}/{industry}/{id}.wav
 *
 *  Uses GOOGLE GEMINI, on the same free key the demo already uses. This
 *  matters more than it sounds: the browser's own speech engine can only use
 *  voices installed in the operating system, and Windows ships no Tamil voice
 *  at all. Generating the audio on a server is how ChatGPT and Gemini speak
 *  Tamil on a PC that has no Tamil voice — and now this does too.
 *
 *  Run once, commit public/voice, and every line plays instantly and free
 *  forever. Re-run only when you change a line in personas.ts.
 *
 *  Already-generated clips are skipped, so a failed run can be resumed.
 * ========================================================================== */

import { mkdir, readFile, writeFile, access, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/* A female voice, for a receptionist. Other Gemini options include Aoede,
   Leda and Zephyr — change VOICE below to try them. */
const VOICE = process.env.GEMINI_TTS_VOICE?.trim() || "Kore";
const MODEL = process.env.GEMINI_TTS_MODEL?.trim() || "gemini-2.5-flash-preview-tts";

async function loadEnv() {
  try {
    const raw = await readFile(join(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    /* no .env.local — the key may be set another way */
  }
}

/* personas.ts is TypeScript, so the lines are pulled out with a regex rather
   than pulling in a TS runtime just for this script. */
async function loadPersonas() {
  const src = await readFile(join(root, "lib", "personas.ts"), "utf8");
  const out = [];
  const personaRe =
    /id:\s*"(clinic|property|fitness)"[\s\S]*?byLanguage:\s*\{([\s\S]*?)\n    \},\n  \}/g;
  let p;
  while ((p = personaRe.exec(src))) {
    const industry = p[1];
    const langRe = /(ta|hi|en):\s*\{[\s\S]*?lines:\s*\{([\s\S]*?)\n        \},/g;
    let l;
    while ((l = langRe.exec(p[2]))) {
      const language = l[1];
      const lineRe = /(\w+):\s*\n?\s*"((?:[^"\\]|\\.)*)"/g;
      let e;
      while ((e = lineRe.exec(l[2]))) {
        out.push({ industry, language, id: e[1], text: e[2].replace(/\\"/g, '"') });
      }
    }
  }
  return out;
}

/** Gemini returns raw PCM. Browsers need a container, so add a WAV header. */
function toWav(pcm, rate) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

const exists = (p) => access(p).then(() => true).catch(() => false);

async function main() {
  await loadEnv();
  const key = process.env.GEMINI_API_KEY;
  const clips = await loadPersonas();

  console.log(`${clips.length} lines to generate, voice "${VOICE}".\n`);

  if (!key) {
    console.log(
      "No GEMINI_API_KEY found in .env.local — nothing generated.\n" +
        "Get one free at https://aistudio.google.com/apikey\n\n" +
        "The site still works without this: it falls back to the voice built\n" +
        "into the visitor's device, where one exists for that language.",
    );
    process.exit(0);
  }

  let made = 0;
  let skipped = 0;
  let bytes = 0;

  for (const clip of clips) {
    const dir = join(root, "public", "voice", clip.language, clip.industry);
    const file = join(dir, `${clip.id}.wav`);

    if (await exists(file)) {
      skipped++;
      bytes += (await stat(file)).size;
      continue;
    }
    await mkdir(dir, { recursive: true });

    /* Generation is slow and occasionally times out. Over 63 clips a single
       hiccup is near certain, so retry rather than throwing the whole batch
       away — the earlier version died on clip 9 of 63. */
    let res = null;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
          {
            method: "POST",
            headers: { "content-type": "application/json", "x-goog-api-key": key },
            body: JSON.stringify({
              contents: [{ parts: [{ text: clip.text }] }],
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } },
                },
              },
            }),
            signal: AbortSignal.timeout(90000),
          },
        );
        if (res.ok || res.status === 429) break;
      } catch {
        /* timed out or the connection dropped */
      }
      if (attempt < 4) {
        console.log(`    retrying ${clip.id} (attempt ${attempt + 1})`);
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }

    if (!res) {
      console.error(`  gave up on ${clip.language}/${clip.industry}/${clip.id} — run again to retry`);
      continue;
    }

    if (!res.ok) {
      const body = await res.text();
      console.error(`\n  FAILED ${clip.language}/${clip.industry}/${clip.id}`);
      console.error(`  HTTP ${res.status} — ${body.slice(0, 200).replace(/\s+/g, " ")}`);
      if (res.status === 429) {
        console.error("\n  That is the free daily limit. Run this again tomorrow —");
        console.error("  finished clips are kept, so it picks up where it stopped.");
      }
      process.exit(1);
    }

    const data = await res.json();
    const part = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!part) {
      console.error(`  no audio returned for ${clip.id} — skipping`);
      continue;
    }

    const pcm = Buffer.from(part.inlineData.data, "base64");
    const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType)?.[1] ?? 24000);
    const wav = toWav(pcm, rate);
    await writeFile(file, wav);

    made++;
    bytes += wav.length;
    console.log(
      `  ${clip.language}/${clip.industry}/${clip.id}.wav  ${(wav.length / 1024).toFixed(0)}KB`,
    );
  }

  console.log(`\nDone. ${made} generated, ${skipped} already existed.`);
  console.log(`Total ${(bytes / 1024 / 1024).toFixed(1)}MB in public/voice.`);
  console.log("\nThese are only fetched when a visitor actually hears that line,");
  console.log("never on page load. Commit public/voice and they play free forever.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
