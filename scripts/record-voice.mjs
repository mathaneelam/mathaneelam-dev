/* ============================================================================
 *  ONE-TIME VOICE RECORDING
 *
 *  Reads every line in lib/personas.ts and generates an audio file for it,
 *  saving to public/voice/{language}/{industry}/{id}.mp3
 *
 *  Run once, commit the files, and they play free forever. Re-run only when
 *  you change a line in personas.ts.
 *
 *      npm run voice
 *
 *  Needs ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in .env.local.
 *  Skips any clip that already exists, so a failed run can be resumed and
 *  you never pay twice for the same line.
 * ========================================================================== */

import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/* Minimal .env.local reader — avoids adding a dependency for four lines. */
async function loadEnv() {
  try {
    const raw = await readFile(join(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    /* no .env.local — env vars may still be set another way */
  }
}

/* personas.ts is TypeScript, so pull the data out with a regex rather than
   pulling in a TS runtime just for this script. */
async function loadPersonas() {
  const src = await readFile(join(root, "lib", "personas.ts"), "utf8");
  const out = [];

  // Each persona block: id, then per-language `lines: { ... }`
  const personaRe = /id:\s*"(clinic|property|fitness)"[\s\S]*?byLanguage:\s*\{([\s\S]*?)\n    \},\n  \}/g;
  let p;
  while ((p = personaRe.exec(src))) {
    const industry = p[1];
    const langRe = /(ta|hi|en):\s*\{[\s\S]*?lines:\s*\{([\s\S]*?)\n        \},/g;
    let l;
    while ((l = langRe.exec(p[2]))) {
      const language = l[1];
      const lineRe = /(\w+):\s*\n?\s*"((?:[^"\\]|\\.)*)"/g;
      let entry;
      while ((entry = lineRe.exec(l[2]))) {
        out.push({
          industry,
          language,
          id: entry[1],
          text: entry[2].replace(/\\"/g, '"'),
        });
      }
    }
  }
  return out;
}

const exists = (p) => access(p).then(() => true).catch(() => false);

async function main() {
  await loadEnv();

  const key = process.env.ELEVENLABS_API_KEY;
  const voice = process.env.ELEVENLABS_VOICE_ID;

  const clips = await loadPersonas();
  const chars = clips.reduce((n, c) => n + c.text.length, 0);

  console.log(`Found ${clips.length} lines, ${chars} characters total.`);

  if (!key || !voice) {
    console.log(
      "\nNo ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID found in .env.local.\n" +
        "Nothing was generated — see SETUP.md section 5.\n\n" +
        "The site works without these: the demo falls back to the visitor's\n" +
        "own phone voice, which is free and needs no setup.",
    );
    process.exit(0);
  }

  let made = 0;
  let skipped = 0;

  for (const clip of clips) {
    const dir = join(root, "public", "voice", clip.language, clip.industry);
    const file = join(dir, `${clip.id}.mp3`);

    if (await exists(file)) {
      skipped++;
      continue;
    }

    await mkdir(dir, { recursive: true });

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
      {
        method: "POST",
        headers: { "xi-api-key": key, "content-type": "application/json" },
        body: JSON.stringify({
          text: clip.text,
          // Multilingual model — required for Tamil and Hindi.
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.45, similarity_boost: 0.8 },
        }),
      },
    );

    if (!res.ok) {
      console.error(
        `  FAILED ${clip.language}/${clip.industry}/${clip.id} — ${res.status} ${await res.text()}`,
      );
      console.error("\nStopping. Re-run to resume; finished clips are kept.");
      process.exit(1);
    }

    await writeFile(file, Buffer.from(await res.arrayBuffer()));
    made++;
    console.log(`  ${clip.language}/${clip.industry}/${clip.id}.mp3`);
  }

  console.log(`\nDone. ${made} generated, ${skipped} already existed.`);
  console.log("Commit public/voice to GitHub — they then play free, forever.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
