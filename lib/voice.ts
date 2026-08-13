/* ============================================================================
 *  MAKING THE RECEPTIONIST SPEAK
 *
 *  Four levels, tried in order. The demo completes at every one of them:
 *
 *    1. A recorded clip   - instant, free, best quality (ta / hi / en)
 *    2. The phone's voice - free, unlimited, any Indian language
 *    3. Silent            - transcript only, the call still works
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

/* Clips that are not on the server. Until `npm run voice` has been run,
 * public/voice is empty and EVERY line misses — so without remembering the
 * misses, each reply pays the lookup wait again before she says anything. */
const missingClips = new Set<string>();

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

  // -------------------------------------------------- 1. recorded clip
  if (opts.clip) {
    const src = `/voice/${opts.language}/${opts.industry}/${opts.clip}.wav`;
    if (!missingClips.has(src)) {
      const played = await playClip(src, opts.onStart);
      if (played) {
        finish();
        return;
      }
      missingClips.add(src);
    }
    // No clip on disk yet - fall through to the phone's own voice.
  }

  // ------------------------------------------------- 2. the phone's voice
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

    audio.addEventListener("playing", () => onStart?.(), { once: true });
    audio.addEventListener("ended", () => done(true), { once: true });
    audio.addEventListener("error", () => done(false), { once: true });

    audio.addEventListener("stalled", () => done(false), { once: true });

    void audio.play().catch(() => done(false));

    /* Two seconds, not twelve. A missing clip usually errors immediately, but
       when it does not, this wait is dead silence in the middle of a phone
       call — which is far worse than falling straight through to the phone's
       own voice. Real clips are small and local, so 2s is ample. */
    setTimeout(() => done(false), 2000);
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
