/* ============================================================================
 *  BARGE-IN DETECTION
 *
 *  Hearing that the caller has started talking while the receptionist is
 *  still speaking — so she can be cut off mid-sentence, like a real person.
 *
 *  Why this is not done from speech recognition text:
 *
 *  On laptop speakers the microphone picks up HER voice and the caller's at
 *  once. Recognition returns the two mixed together, and because her voice is
 *  louder and closer to the mic, the result looks mostly like her own words —
 *  so a text-comparison echo filter throws the caller's interruption away.
 *  That is exactly the bug this replaces.
 *
 *  Instead we open a separate audio stream with `echoCancellation` on. The
 *  browser subtracts what it is playing through the speakers from what the
 *  mic receives, at the audio layer, before anything reaches this code. What
 *  is left is the caller's voice alone. Then it is simply a question of
 *  whether there is energy in it.
 * ========================================================================== */

let ctx: AudioContext | null = null;
let stream: MediaStream | null = null;
let analyser: AnalyserNode | null = null;
let raf = 0;

/** Opens the mic once per call. Safe to call again; it reuses the stream. */
export async function armBargeIn(): Promise<boolean> {
  if (analyser) return true;
  if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) return false;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        // The whole point. Without this the speakers feed straight back in.
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
    if (ctx.state === "suspended") await ctx.resume();

    const source = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.6;
    source.connect(analyser);
    return true;
  } catch {
    disarmBargeIn();
    return false;
  }
}

export function disarmBargeIn(): void {
  cancelAnimationFrame(raf);
  raf = 0;
  analyser = null;
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  void ctx?.close().catch(() => {});
  ctx = null;
}

/**
 * Watches for the caller starting to speak, and calls `onSpeech` once.
 *
 * Requires sustained energy rather than a single loud frame, so a cough, a
 * door, or one noisy sample does not cut her off. Returns a stop function.
 */
export function watchForSpeech(onSpeech: () => void): () => void {
  if (!analyser) return () => {};

  const buffer = new Uint8Array(analyser.frequencyBinCount);
  const started = performance.now();
  let loudSince = 0;
  let fired = false;

  const tick = () => {
    if (!analyser || fired) return;
    analyser.getByteTimeDomainData(buffer);

    // Root-mean-square around the 128 midpoint = how loud, 0..~1
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      const v = (buffer[i] - 128) / 128;
      sum += v * v;
    }
    const level = Math.sqrt(sum / buffer.length);

    const now = performance.now();
    // Ignore the first moment, while echo cancellation settles.
    if (now - started > 400) {
      if (level > 0.045) {
        if (!loudSince) loudSince = now;
        // A quarter second of continuous voice, not one stray frame.
        if (now - loudSince > 220) {
          fired = true;
          onSpeech();
          return;
        }
      } else {
        loudSince = 0;
      }
    }
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    raf = 0;
    fired = true;
  };
}
