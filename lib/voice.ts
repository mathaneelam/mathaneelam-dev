/* ============================================================================
 *  MAKING THE RECEPTIONIST SPEAK
 *
 *  Four levels, tried in order. The demo completes at every one of them:
 *
 *    1. Sarvam, server-side - every Indian language, on every device
 *    2. The phone's voice   - only where the OS has that language installed
 *    3. Silent              - transcript only, the call still completes
 *
 *  Nothing is pre-recorded. Level 1 is what makes Tamil work on a Windows PC
 *  or an iPhone, neither of which has a Tamil voice to fall back on.
 *
 *  Mobile browsers refuse to play audio until the visitor has tapped
 *  something, so `unlock()` must be called from inside the tap handler on the
 *  call button. Everything after that is allowed.
 * ========================================================================== */

import { LIMITS } from "./limits";
import { getLanguage, pickVoice, type LanguageCode } from "./languages";
import type { IndustryId } from "./personas";

let unlocked = false;
let current: HTMLAudioElement | null = null;


/** Call this synchronously inside a click/tap handler, once per session. */
export function unlock(): void {
  if (unlocked || typeof window === "undefined") return;
  unlocked = true;

  // A silent play/pause satisfies the browser's user-gesture requirement so
  // later programmatic playback is permitted.
  try {
    const a = new Audio(
      "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tUxAADB8AhSmxhIIEVCSiJrDCQBTcu3UrAIwUdkRgQbFAZC1CQEwTJ9mjRvBA4UOLD8nKVOWfh+UlK3z/177OXrfOdKl7pyn3Xf//WreyTRUoAWgBgkOAGbZHBgG1OF6zM82DWbZaUmMBptgQhGjsyYqc9ae9XFz280948NMBWInljyzsNRFLPWdnZGWrddDsjK1unuSrVN9jJsK8KuQtQCtMBjCEtImISdNKJOopIpBFpNSMbIHCSRpRR5iakjTiyzLhchUUBwCgyKiweBv/7UsQbg8fUJUpsPMCA+gSpTYeYEBUBoAgFAaAoBQGgOAcBADgHAaA4BwGgOAcBoDgHAaA4BwGgOAcBoDgHAaA4BwGgOAcBoDgHAaA4BwGgOAcBoDgHAaA4BwGgOAcBoDgHAaA4BwGgOAcBoDgHAaA4BwGgOAcBoDgHAaA4BwGgOAcBoDgHAaA4BwGgOAcBoDgHAaA4BwGgOAcBoDgHAaA4BwGgOAcBoDgHAaA4BwGgOAcBoDgHAaA4BwGgOAcBoDgHAaA4BwGgOAcBoDg=",
    );
    a.volume = 0;
    void a.play().catch(() => {});
    a.pause();
  } catch {
    /* nothing to do - we simply fall through to the next level */
  }
}

export function cancelSpeech(): void {
  if (current) {
    current.pause();
    current = null;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Speaks a line. Resolves when it has finished, or immediately if nothing on
 * the device can say it — the caller carries on either way.
 */
export async function speak(
  text: string,
  opts: {
    clip?: string;
    industry: IndustryId;
    language: LanguageCode;
    onStart?: () => void;
    onEnd?: () => void;
  },
): Promise<void> {
  cancelSpeech();
  const finish = () => opts.onEnd?.();

  // ------------------------------------------------- 1. server-generated
  // The browser can only use voices installed in the operating system, and
  // Windows has none for Tamil — so on a PC this is the only thing that can
  // actually say it. Everything is generated live; nothing is pre-recorded.
  const server = await speakFromServer(text, opts.language, opts.onStart);
  if (server) {
    finish();
    return;
  }

  // ------------------------------------------------- 3. the phone's voice
  const spoke = await speakWithBrowser(text, opts.language, opts.onStart);
  if (spoke) {
    finish();
    return;
  }

  // ------------------------------------------------------- 3. silence
  // The transcript still shows. Give the reader a moment before continuing so
  // the conversation does not jump.
  opts.onStart?.();
  await new Promise((r) => setTimeout(r, Math.min(2600, text.length * 45)));
  finish();
}

/**
 * Asks the server to synthesise the line, then plays it.
 *
 * Returns false on anything unexpected — a missing key, a slow upstream, an
 * unplayable response — so the caller drops to the device's own voice and the
 * conversation carries on rather than stopping dead.
 */
async function speakFromServer(
  text: string,
  language: LanguageCode,
  onStart?: () => void,
): Promise<boolean> {
  try {
    const res = await fetch("/api/speak", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, language }),
    });
    // 204 means "no voice available" — expected, not an error.
    if (!res.ok || res.status === 204) return false;

    const blob = await res.blob();
    if (!blob.size) return false;

    const url = URL.createObjectURL(blob);
    const played = await playClip(url, onStart);
    URL.revokeObjectURL(url);
    return played;
  } catch {
    return false;
  }
}

function playClip(src: string, onStart?: () => void): Promise<boolean> {
  return new Promise((resolve) => {
    const audio = new Audio(src);
    audio.preload = "auto";
    current = audio;

    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    /* The timeout below guards STARTING, not playing. Once the audio is
       actually running it is cleared, otherwise a line longer than the
       timeout would be cut off and then spoken again by the fallback. */
    const startGuard = setTimeout(() => done(false), 2500);

    audio.addEventListener(
      "playing",
      () => {
        clearTimeout(startGuard);
        onStart?.();
      },
      { once: true },
    );
    audio.addEventListener("ended", () => done(true), { once: true });
    audio.addEventListener("error", () => done(false), { once: true });
    audio.addEventListener("stalled", () => done(false), { once: true });

    void audio.play().catch(() => done(false));
  });
}

function speakWithBrowser(
  text: string,
  language: LanguageCode,
  onStart?: () => void,
): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return resolve(false);

    const locale = getLanguage(language).locale;
    const voice = pickVoice(locale);
    if (!voice) return resolve(false); // nothing installed for this language

    const utterance = new SpeechSynthesisUtterance(text.slice(0, LIMITS.maxSpokenChars));
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = 1.02;
    utterance.pitch = 1;

    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    utterance.onstart = () => onStart?.();
    utterance.onend = () => done(true);
    utterance.onerror = () => done(false);

    window.speechSynthesis.speak(utterance);

    // Chrome occasionally drops long utterances without firing onend.
    setTimeout(() => done(true), 2000 + text.length * 90);
  });
}
