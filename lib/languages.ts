/* ============================================================================
 *  LANGUAGES THE DEMO CAN SPEAK
 *
 *  Tamil, Hindi and English are the "flagship" three - they have properly
 *  recorded voice clips committed into public/voice, so they sound good and
 *  cost nothing to play.
 *
 *  Every other language runs on the phone's own built-in voice. Free and
 *  unlimited, slightly more robotic. Adding a language to the flagship list
 *  is a matter of recording its clips - see SETUP.md.
 * ========================================================================== */

export type LanguageCode =
  | "ta"
  | "hi"
  | "en"
  | "te"
  | "ml"
  | "kn"
  | "mr"
  | "bn"
  | "gu"
  | "pa";

export interface Language {
  code: LanguageCode;
  /** Written in its own script, because that is what people look for. */
  native: string;
  /** English name, for screen readers and analytics. */
  english: string;
  /** BCP-47 tag used by the browser's speech engines. */
  locale: string;
  /** True when we ship recorded clips for it. */
  flagship: boolean;
}

/* Order matters - this is the order they appear on screen.
   Tamil first, by Mathan's decision. */
export const LANGUAGES: readonly Language[] = [
  { code: "ta", native: "தமிழ்", english: "Tamil", locale: "ta-IN", flagship: true },
  { code: "hi", native: "हिन्दी", english: "Hindi", locale: "hi-IN", flagship: true },
  { code: "en", native: "English", english: "English", locale: "en-IN", flagship: true },
  { code: "te", native: "తెలుగు", english: "Telugu", locale: "te-IN", flagship: false },
  { code: "ml", native: "മലയാളം", english: "Malayalam", locale: "ml-IN", flagship: false },
  { code: "kn", native: "ಕನ್ನಡ", english: "Kannada", locale: "kn-IN", flagship: false },
  { code: "mr", native: "मराठी", english: "Marathi", locale: "mr-IN", flagship: false },
  { code: "bn", native: "বাংলা", english: "Bengali", locale: "bn-IN", flagship: false },
  { code: "gu", native: "ગુજરાતી", english: "Gujarati", locale: "gu-IN", flagship: false },
  { code: "pa", native: "ਪੰਜਾਬੀ", english: "Punjabi", locale: "pa-IN", flagship: false },
] as const;

/** The three shown as tabs. The rest sit behind a "more languages" picker. */
export const FLAGSHIP = LANGUAGES.filter((l) => l.flagship);
export const OTHER_LANGUAGES = LANGUAGES.filter((l) => !l.flagship);

/** Tamil is the default, by design. */
export const DEFAULT_LANGUAGE: LanguageCode = "ta";

export function getLanguage(code: LanguageCode): Language {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

/* --------------------------------------------------------------------------
 * BROWSER CAPABILITY DETECTION
 *
 * These run in the browser only. We check what the visitor's device can
 * actually do rather than assuming, so the demo degrades quietly instead of
 * failing halfway through a call.
 * ------------------------------------------------------------------------ */

/** Speech recognition exists on Android Chrome and desktop Chrome/Edge.
 *  It does NOT exist in Safari on iPhone - those visitors type instead. */
export function canListen(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS 13+ reports itself as a Mac, so check for a touch screen too
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** Whether the device has any installed voice for this language.
 *  Voices load asynchronously, so call this after `voiceschanged`. */
export function canSpeak(locale: string): boolean {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  const base = locale.split("-")[0];
  return window.speechSynthesis
    .getVoices()
    .some((v) => v.lang.replace("_", "-").toLowerCase().startsWith(base));
}

/** Picks the best installed voice for a locale, preferring an exact region
 *  match (ta-IN over a generic ta) and a local voice over a network one. */
export function pickVoice(locale: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const want = locale.toLowerCase();
  const base = want.split("-")[0];
  const norm = (v: SpeechSynthesisVoice) => v.lang.replace("_", "-").toLowerCase();

  return (
    voices.find((v) => norm(v) === want && v.localService) ??
    voices.find((v) => norm(v) === want) ??
    voices.find((v) => norm(v).startsWith(base) && v.localService) ??
    voices.find((v) => norm(v).startsWith(base)) ??
    null
  );
}

/** Resolves once the browser has finished loading its voice list.
 *  Chrome populates this lazily and returns an empty array on first call. */
export function whenVoicesReady(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return resolve([]);
    const existing = window.speechSynthesis.getVoices();
    if (existing.length) return resolve(existing);

    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    // Some browsers never fire the event. Do not hang the demo on it.
    setTimeout(done, 1200);
  });
}
