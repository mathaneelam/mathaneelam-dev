"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SectionHead from "@/components/SectionHead";
import { site } from "@/content/site";
import {
  DEFAULT_LANGUAGE,
  FLAGSHIP,
  OTHER_LANGUAGES,
  canListen,
  getLanguage,
  isIOS,
  whenVoicesReady,
  type LanguageCode,
} from "@/lib/languages";
import {
  DEFAULT_INDUSTRY,
  PERSONAS,
  getPersona,
  type IndustryId,
} from "@/lib/personas";
import { cancelSpeech, speak, unlock } from "@/lib/voice";
import { armBargeIn, disarmBargeIn, watchForSpeech } from "@/lib/bargein";
import type { Turn } from "@/lib/brain";

type CallState = "idle" | "connecting" | "live" | "ended";

/**
 * The point of the whole site: a receptionist you can actually talk to.
 *
 * On a phone the transcript lives INSIDE the handset, like a real call with
 * live captions. Side-by-side layout only appears from tablet width up, where
 * there is room for it.
 */
export default function VoiceDemo() {
  const [language, setLanguage] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [industry, setIndustry] = useState<IndustryId>(DEFAULT_INDUSTRY);
  const [state, setState] = useState<CallState>("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  /* Voice is the product; typing is the fallback for iPhones and for anyone
     who would rather not talk. The call screen shows one or the other, never
     both — a text box sitting under a live call makes it feel like a chat
     window rather than a phone call. */
  const [mode, setMode] = useState<"voice" | "text">("voice");
  const [draft, setDraft] = useState("");
  const [micAvailable, setMicAvailable] = useState(false);
  const [onIOS, setOnIOS] = useState(false);

  const persona = getPersona(industry);
  const scriptedLocale = (["ta", "hi", "en"] as const).includes(
    language as "ta" | "hi" | "en",
  )
    ? (language as "ta" | "hi" | "en")
    : "en";
  const suggestions = persona.byLanguage[scriptedLocale].suggestions;

  const transcriptRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const turnsRef = useRef<Turn[]>([]);
  // Assigned in an effect, not during render — React forbids touching refs
  // while rendering, and lint rightly flags it.
  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  /* Hands-free is what makes this feel like a call rather than dictation.
   * Once connected, the receptionist listens on her own after every reply —
   * the caller never taps anything between turns.
   *
   * These are refs, not state, because the speech callbacks are created once
   * and would otherwise close over stale values. */
  const handsFreeRef = useRef(true);
  const callLiveRef = useRef(false);
  const busyRef = useRef(false);
  const beginListeningRef = useRef<() => void>(() => {});

  /* Barge-in. The mic stays open while she talks so the caller can cut in,
   * which means it also hears her. `spokenRef` holds what she is currently
   * saying so her own words can be recognised and ignored. */
  const spokenRef = useRef("");
  const speakingRef = useRef(false);
  const speakStartedRef = useRef(0);

  /* Chrome decides you have finished talking on its own schedule, and takes
     one to two seconds about it. That is dead air in a phone call, so we
     watch for the words to stop changing and send it ourselves instead. */
  const silenceTimer = useRef<number | null>(null);
  const pendingRef = useRef("");
  const stopWatchRef = useRef<(() => void) | null>(null);

  /** Cuts her off mid-sentence and starts listening. Used both by the
   *  acoustic detector and by tapping her on screen. */
  const interrupt = useCallback(() => {
    if (!speakingRef.current) return;
    cancelSpeech();
    stopWatchRef.current?.();
    stopWatchRef.current = null;
    speakingRef.current = false;
    busyRef.current = false;
    setSpeaking(false);
    if (handsFreeRef.current) beginListeningRef.current();
  }, []);

  /* Capability detection runs in the browser only, after mount, so the
     server-rendered HTML is identical for everyone. */
  /* No device-voice detection any more. Audio is generated server-side by
     Sarvam, so every language in the picker works on every device — including
     a Windows PC or an iPhone, neither of which can install a Tamil voice.
     Tamil stays the default, always. */
  useEffect(() => {
    // Deferred rather than set synchronously, so this does not cascade a
    // second render immediately after mount.
    queueMicrotask(() => {
      setMicAvailable(canListen());
      setOnIOS(isIOS());
    });
    void whenVoicesReady(); // still used as a last-resort fallback
  }, []);

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns, thinking]);

  /* Changing language or business mid-call ends it — the receptionist is a
     different person now. */
  const reset = useCallback(() => {
    cancelSpeech();
    callLiveRef.current = false; // stops the hands-free loop restarting
    handsFreeRef.current = true;
    busyRef.current = false;
    if (silenceTimer.current) window.clearTimeout(silenceTimer.current);
    silenceTimer.current = null;
    pendingRef.current = "";
    stopWatchRef.current?.();
    stopWatchRef.current = null;
    speakingRef.current = false;
    disarmBargeIn();
    recognitionRef.current?.abort();
    setMicError(null);
    setState("idle");
    setTurns([]);
    setDraft("");
    setSpeaking(false);
    setThinking(false);
    setListening(false);
  }, []);

  useEffect(() => () => cancelSpeech(), []);

  const ask = useCallback(
    async (history: Turn[]) => {
      setThinking(true);
      let reply: { text: string; clip?: string; ended?: boolean };

      try {
        const res = await fetch("/api/reply", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ industry, language, history }),
        });
        reply = await res.json();
      } catch {
        // Offline or the route is unreachable. Say something human rather
        // than showing an error in the middle of a phone call.
        reply = {
          text: persona.byLanguage[scriptedLocale].lines.unsure,
          clip: "unsure",
        };
      }

      setThinking(false);
      if (!reply?.text) {
        setState("ended");
        return;
      }

      setTurns((t) => [...t, { role: "agent", text: reply.text }]);

      /* Interrupting her is handled acoustically while she speaks — see the
         watchForSpeech call below. Recognition text is ignored during
         playback, because on speakers it is a mix of both voices. */
      busyRef.current = true;
      spokenRef.current = reply.text;
      speakingRef.current = true;

      await speak(reply.text, {
        clip: reply.clip,
        industry,
        language,
        onStart: () => {
          setSpeaking(true);
          speakStartedRef.current = Date.now();
          // Listen acoustically for the caller cutting in. This works on
          // speakers, where comparing recognised words does not.
          stopWatchRef.current = watchForSpeech(() => interrupt());
        },
        onEnd: () => {
          setSpeaking(false);
          stopWatchRef.current?.();
          stopWatchRef.current = null;
        },
      });

      speakingRef.current = false;
      spokenRef.current = "";
      busyRef.current = false;

      if (reply.ended) {
        callLiveRef.current = false;
        setState("ended");
        return;
      }

      // She has finished her sentence, so she listens again — this is what
      // turns the demo from dictation into a conversation.
      if (handsFreeRef.current) {
        window.setTimeout(() => beginListeningRef.current(), 350);
      }
    },
    [industry, language, persona, scriptedLocale, interrupt],
  );

  const startCall = useCallback(() => {
    unlock(); // must happen inside the tap, or mobile blocks all audio
    setTurns([]);
    setMicError(null);
    handsFreeRef.current = micAvailable;
    busyRef.current = false;
    // No mic on this device (iPhone) — go straight to typing rather than
    // showing a call screen that can never hear anything.
    setMode(micAvailable ? "voice" : "text");
    // Opens an echo-cancelled mic stream for interrupt detection. Must start
    // from this tap, like all audio permissions on mobile.
    void armBargeIn();
    setState("connecting");
    window.setTimeout(() => {
      callLiveRef.current = true;
      setState("live");
      void ask([]);
    }, 900); // a beat of ringing, so it feels like a call
  }, [ask, micAvailable]);

  const send = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean || thinking || speaking) return;
      setDraft("");
      const next: Turn[] = [...turnsRef.current, { role: "caller", text: clean }];
      setTurns(next);
      void ask(next);
    },
    [ask, thinking, speaking],
  );

  /* Tap to start, tap again to stop.
   *
   * This was press-and-hold, which nobody discovers and which is awkward with
   * a mouse. A toggle is obvious on a phone and on a laptop alike.
   *
   * Every failure path says something. A microphone button that silently does
   * nothing when permission is blocked is worse than no button at all. */
  const beginListening = useCallback(() => {
    // Listening continues while she talks — that is what allows barge-in.
    if (!callLiveRef.current) return;

    const Ctor =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition })
        .webkitSpeechRecognition;
    if (!Ctor) {
      setMicError(site.demo.micBlocked);
      return;
    }

    const rec = new Ctor();
    rec.lang = getLanguage(language).locale;
    rec.interimResults = true;
    /* Stay open across pauses. With this false, recognition stopped after
       every utterance and had to be restarted, which Chrome throttles and
       which makes the mic indicator flicker on and off mid-conversation. */
    rec.continuous = true;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      /* In continuous mode `results` keeps every utterance of the session, so
         read only from resultIndex — otherwise each new sentence would be
         sent with all the previous ones glued to the front of it. */
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += text;
        else interim += text;
      }

      /* No text-based echo filtering any more. On speakers the mic hears her
         and the caller mixed together, her voice dominates, and comparing
         words threw the caller's interruption away as echo. Interrupting is
         now detected acoustically in lib/bargein.ts, on an echo-cancelled
         stream. While she is still speaking, ignore recognition entirely. */
      if (speakingRef.current) return;

      /* Chrome only emits a final result after a long pause of its own
         choosing. Rather than wait through it, treat the words going quiet
         for 700ms as the caller having finished, and send what we have. */
      const clearSilence = () => {
        if (silenceTimer.current) {
          window.clearTimeout(silenceTimer.current);
          silenceTimer.current = null;
        }
      };

      if (final.trim()) {
        clearSilence();
        pendingRef.current = "";
        setDraft("");
        send(final.trim());
        return;
      }

      if (interim.trim()) {
        setDraft(interim);
        pendingRef.current = interim.trim();
        clearSilence();
        silenceTimer.current = window.setTimeout(() => {
          const said = pendingRef.current.trim();
          pendingRef.current = "";
          silenceTimer.current = null;
          if (!said) return;
          setDraft("");
          // Stop the mic so it does not also deliver its own final result
          // a moment later and send the same sentence twice.
          recognitionRef.current?.abort();
          send(said);
        }, 700);
      }
    };
    rec.onend = () => {
      setListening(false);
      /* Android Chrome ends recognition on its own after a pause. In a real
         call that is not the end of the conversation, so pick it straight
         back up — unless she is talking, or the caller switched it off. */
      if (handsFreeRef.current && callLiveRef.current) {
        window.setTimeout(() => beginListeningRef.current(), 250);
      }
    };
    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      setListening(false);
      // "no-speech" just means they said nothing — not worth a message.
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        handsFreeRef.current = false; // stop retrying against a wall
        setMicError(site.demo.micBlocked);
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        setMicError(site.demo.micFailed);
      }
    };

    /* Chrome permits one recognition session at a time. Without dropping the
       previous instance these pile up and every later start() throws, which
       silently ends up with nothing listening at all. */
    const previous = recognitionRef.current;
    if (previous) {
      previous.onresult = null;
      previous.onend = null;
      previous.onerror = null;
      try {
        previous.abort();
      } catch {
        /* already finished */
      }
    }

    recognitionRef.current = rec;
    setMicError(null);
    setListening(true);
    try {
      rec.start();
    } catch {
      // Already running — harmless, and not worth telling the caller about.
      setListening(false);
    }
  }, [language, send]);

  // Kept in a ref so the speech callbacks above can call the latest version.
  useEffect(() => {
    beginListeningRef.current = beginListening;
  }, [beginListening]);

  /* The mic button is now only a manual override: tap to interrupt her, or to
     switch hands-free back on if you turned it off. */
  const toggleListening = useCallback(() => {
    if (listening) {
      handsFreeRef.current = false;
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    handsFreeRef.current = true;
    beginListening();
  }, [listening, beginListening]);

  const busy = thinking || speaking;

  return (
    <section id="demo" className="section section-surface">
      <div className="shell">
        <SectionHead
          eyebrow={site.demo.eyebrow}
          heading={site.demo.heading}
          body={site.demo.body}
          align="center"
        />

        {/* -------------------------------------------------- SELECTORS */}
        <div className="reveal mt-10 flex flex-col items-center gap-4">
          <Tabs
            label="Language"
            options={FLAGSHIP.map((l) => ({ id: l.code, label: l.native }))}
            value={language}
            onChange={(v) => {
              setLanguage(v as LanguageCode);
              reset();
            }}
            extra={
              <select
                aria-label="More Indian languages"
                value={OTHER_LANGUAGES.some((l) => l.code === language) ? language : ""}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setLanguage(e.target.value as LanguageCode);
                  reset();
                }}
                className="h-[38px] rounded-full border-[0.8px] border-[color:var(--color-line-strong)] bg-transparent px-4 text-[0.82rem] text-[color:var(--color-muted)] outline-none"
              >
                <option value="">More…</option>
                {OTHER_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} className="bg-[#222]">
                    {l.native}
                  </option>
                ))}
              </select>
            }
          />

          <Tabs
            label="Business"
            options={PERSONAS.map((p) => ({ id: p.id, label: `${p.emoji} ${p.label}` }))}
            value={industry}
            onChange={(v) => {
              setIndustry(v as IndustryId);
              reset();
            }}
          />
        </div>

        {/* ------------------------------------------------------ PHONE */}
        <div className="reveal mx-auto mt-10 w-full max-w-[420px]">
          <div className="relative rounded-[28px] border-[0.8px] border-[color:var(--color-line-strong)] bg-[color:var(--color-ink)] p-2.5 shadow-2xl shadow-black/60">
            <div className="flex h-[520px] flex-col rounded-[20px] bg-[color:var(--color-canvas)] p-4 sm:h-[560px]">
              {/* Call header */}
              <div className="shrink-0 border-b-[0.8px] border-[color:var(--color-line)] pb-3 text-center">
                <p className="font-[family-name:var(--font-display)] text-[1.15rem] leading-tight text-[color:var(--color-text)]">
                  {persona.business}
                </p>
                <p className="mt-0.5 text-[0.72rem] text-[color:var(--color-muted)]">
                  {persona.location} Â·{" "}
                  {state === "live"
                    ? speaking
                      ? `${persona.agentName} is speaking`
                      : thinking
                        ? "…"
                        : listening
                          ? "Listening — just talk"
                          : "Connected"
                    : state === "connecting"
                      ? "Ringing…"
                      : state === "ended"
                        ? site.demo.endedLabel
                        : getLanguage(language).native}
                </p>
              </div>

              {/* Transcript — inside the handset, like live captions */}
              <div
                ref={transcriptRef}
                className="flex-1 space-y-2.5 overflow-y-auto py-4"
              >
                {state === "idle" && (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <span className="text-[2.5rem]" aria-hidden="true">
                      {persona.emoji}
                    </span>
                    <p className="mt-4 max-w-[26ch] text-[0.85rem] leading-relaxed text-[color:var(--color-muted)]">
                      Press the green button to hear {persona.agentName} answer in{" "}
                      {getLanguage(language).native}.
                    </p>
                  </div>
                )}

                {/* VOICE MODE — a call screen, not a chat log. */}
                {state !== "idle" && mode === "voice" && (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    {/* Tapping her cuts her off. The acoustic detector should
                        catch you talking over her, but this always works. */}
                    <button
                      onClick={interrupt}
                      disabled={!speaking}
                      aria-label={speaking ? "Tap to interrupt" : persona.agentName}
                      className={`flex h-24 w-24 items-center justify-center rounded-full border-[0.8px] transition-colors ${
                        speaking
                          ? "border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)]"
                          : listening
                            ? "animate-pulse-ring border-transparent bg-[color:var(--color-whatsapp)]/15"
                            : "border-[color:var(--color-line-strong)]"
                      }`}
                    >
                      <span className="text-[2.6rem]" aria-hidden="true">
                        {persona.emoji}
                      </span>
                    </button>

                    <p className="mt-6 font-[family-name:var(--font-display)] text-[1.3rem] text-[color:var(--color-text)]">
                      {persona.agentName}
                    </p>
                    <p className="mt-1.5 text-[0.85rem] text-[color:var(--color-muted)]">
                      {speaking
                        ? "Speaking… talk over her, or tap to stop"
                        : thinking
                          ? "…"
                          : listening
                            ? "Listening — just talk"
                            : "Connected"}
                    </p>

                    {speaking && (
                      <div className="mt-5">
                        <Waveform />
                      </div>
                    )}
                  </div>
                )}

                {/* TEXT MODE — the full transcript. */}
                {mode === "text" &&
                  turns.map((t, i) => <Bubble key={i} role={t.role} text={t.text} />)}

                {mode === "text" && thinking && (
                  <div className="flex justify-start">
                    <span className="rounded-2xl rounded-bl-sm bg-[color:var(--color-raised)] px-4 py-2.5 text-[0.9rem] text-[color:var(--color-muted)]">
                      <span className="animate-caret">â–Š</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="shrink-0 pt-3">
                {state === "idle" && (
                  <button
                    onClick={startCall}
                    className="animate-pulse-ring mx-auto flex h-[56px] w-[56px] items-center justify-center rounded-full bg-[color:var(--color-whatsapp)] text-[#06301a]"
                    aria-label="Start the call"
                  >
                    <PhoneIcon />
                  </button>
                )}

                {state === "connecting" && (
                  <p className="py-4 text-center text-[0.85rem] text-[color:var(--color-muted)]">
                    Ringing…
                  </p>
                )}

                {/* VOICE MODE controls — hang up, and a quiet way out to
                    typing. Nothing else on screen during a call. */}
                {state === "live" && mode === "voice" && (
                  <div className="space-y-3">
                    {micError && (
                      <p className="rounded-lg bg-[color:var(--color-accent-soft)] px-3 py-2 text-[0.7rem] leading-snug text-[color:var(--color-text)]">
                        {micError}
                      </p>
                    )}

                    <button
                      onClick={reset}
                      aria-label="End the call"
                      className="mx-auto flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#3a1f1a] text-[#e06a5c]"
                    >
                      <span className="rotate-[135deg]">
                        <PhoneIcon />
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        handsFreeRef.current = false;
                        recognitionRef.current?.abort();
                        setListening(false);
                        setMode("text");
                      }}
                      className="mx-auto block text-[0.72rem] text-[color:var(--color-muted)] underline underline-offset-4"
                      style={{ minHeight: 0 }}
                    >
                      Type instead
                    </button>
                  </div>
                )}

                {state === "live" && mode === "text" && (
                  <div className="space-y-2.5">
                    {turns.length <= 1 && !busy && (
                      <div className="flex flex-wrap gap-1.5">
                        {suggestions.map((s) => (
                          <button
                            key={s}
                            onClick={() => send(s)}
                            className="rounded-full border-[0.8px] border-[color:var(--color-line-strong)] px-3 py-1.5 text-left text-[0.75rem] leading-snug text-[color:var(--color-muted)] transition-colors hover:border-[color:var(--color-accent-line)] hover:text-[color:var(--color-text)]"
                            style={{ minHeight: 0 }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-end gap-2">
                      <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && send(draft)}
                        placeholder={
                          listening
                            ? site.demo.listeningLabel
                            : micAvailable
                              ? site.demo.micHint
                              : site.demo.typeHint
                        }
                        disabled={busy}
                        className="h-[44px] min-w-0 flex-1 rounded-full border-[0.8px] border-[color:var(--color-line-strong)] bg-transparent px-4 text-[0.85rem] text-[color:var(--color-text)] placeholder:text-[color:var(--color-muted)] outline-none focus:border-[color:var(--color-accent-line)]"
                      />

                      {/* Send appears as soon as there is something to send.
                          Otherwise the mic, where the browser allows it. */}
                      {draft.trim() || !micAvailable ? (
                        <button
                          onClick={() => send(draft)}
                          disabled={busy || !draft.trim()}
                          aria-label="Send"
                          className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-[color:var(--color-accent)] text-[color:var(--color-cream)] disabled:opacity-40"
                        >
                          <SendIcon />
                        </button>
                      ) : (
                        <button
                          onClick={toggleListening}
                          disabled={busy}
                          aria-label={listening ? "Stop listening" : "Tap to speak"}
                          className={`flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full transition-colors ${
                            listening
                              ? "animate-pulse-ring bg-[color:var(--color-accent)] text-[color:var(--color-cream)]"
                              : "border-[0.8px] border-[color:var(--color-line-strong)] text-[color:var(--color-muted)]"
                          }`}
                        >
                          <MicIcon />
                        </button>
                      )}
                    </div>

                    {/* A mic button that silently does nothing is worse than
                        no mic button. Always say what happened. */}
                    {micError && (
                      <p className="rounded-lg bg-[color:var(--color-accent-soft)] px-3 py-2 text-[0.7rem] leading-snug text-[color:var(--color-text)]">
                        {micError}
                      </p>
                    )}

                    {onIOS && !micError && (
                      <p className="text-center text-[0.68rem] text-[color:var(--color-muted)]/80">
                        {site.demo.iosNotice}
                      </p>
                    )}
                  </div>
                )}

                {state === "ended" && (
                  <button
                    onClick={reset}
                    className="btn btn-secondary w-full"
                    style={{ minHeight: 44 }}
                  >
                    {site.demo.restartLabel}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ bits */

function Tabs({
  label,
  options,
  value,
  onChange,
  extra,
}: {
  label: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      <span className="sr-only">{label}</span>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`h-[38px] rounded-full px-4 text-[0.82rem] transition-colors ${
            value === o.id
              ? "bg-[color:var(--color-accent)] text-[color:var(--color-cream)]"
              : "border-[0.8px] border-[color:var(--color-line-strong)] text-[color:var(--color-muted)] hover:text-[color:var(--color-text)]"
          }`}
          style={{ minHeight: 38 }}
        >
          {o.label}
        </button>
      ))}
      {extra}
    </div>
  );
}

function Bubble({ role, text }: { role: Turn["role"]; text: string }) {
  const agent = role === "agent";
  return (
    <div className={`flex ${agent ? "justify-start" : "justify-end"}`}>
      <p
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[0.85rem] leading-relaxed ${
          agent
            ? "rounded-bl-sm bg-[color:var(--color-raised)] text-[color:var(--color-text)]"
            : "rounded-br-sm bg-[color:var(--color-accent)] text-[color:var(--color-cream)]"
        }`}
      >
        {text}
      </p>
    </div>
  );
}

function Waveform() {
  return (
    <div
      className="flex h-6 shrink-0 items-center justify-center gap-[3px]"
      aria-hidden="true"
    >
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-[color:var(--color-accent)]"
          style={{
            animation: `wave 900ms ease-in-out ${i * 90}ms infinite`,
            height: 6,
          }}
        />
      ))}
      <style>{`@keyframes wave{0%,100%{height:5px;opacity:.5}50%{height:20px;opacity:1}}`}</style>
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
      <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1l-2.3 2.2Z" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z" />
      <path d="M18 11a1 1 0 1 0-2 0 4 4 0 0 1-8 0 1 1 0 1 0-2 0 6 6 0 0 0 5 5.9V19H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.1A6 6 0 0 0 18 11Z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" />
    </svg>
  );
}
