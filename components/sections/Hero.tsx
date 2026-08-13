import { site } from "@/content/site";

/**
 * Structured exactly like the Bizzap hero: eyebrow, a serif headline whose
 * last line is terracotta italic, a muted paragraph, then a solid primary
 * button beside an outlined secondary. Device mockup on the right.
 *
 * Bizzap's mockup is a browser window. Ours is a ringing phone, because the
 * whole point of this site is that the phone gets answered.
 */
export default function Hero() {
  return (
    <section id="top" className="grain relative overflow-hidden pt-[65px]">
      <div className="shell relative z-10 pt-14 pb-16 sm:pt-20 md:pt-24 md:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
          {/* ------------------------------------------------------ COPY */}
          <div className="reveal">
            <p className="eyebrow">{site.hero.eyebrow}</p>

            <h1 className="mt-6">
              {site.hero.headlineLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
              <span className="accent-line block">{site.hero.headlineAccent}</span>
            </h1>

            <p className="mt-7 max-w-[48ch] text-[0.95rem] leading-[1.75] text-[color:var(--color-muted)] sm:text-base">
              {site.hero.body}
            </p>

            {/* Full-width stacked buttons on a phone, side by side from 480px. */}
            <div className="mt-9 flex flex-col gap-3 xs:flex-row xs:items-center">
              <a href="#demo" data-tap className="btn btn-primary">
                {site.hero.primaryCta}
                <ArrowIcon />
              </a>
              <a href="#pricing" data-tap className="btn btn-secondary">
                {site.hero.secondaryCta}
              </a>
            </div>

            <p className="mt-7 flex items-start gap-2.5 text-[0.8rem] leading-relaxed text-[color:var(--color-muted)]">
              <CheckIcon />
              <span className="max-w-[42ch]">{site.howItWorks.reassurance}</span>
            </p>
          </div>

          {/* ----------------------------------------------------- PHONE */}
          <div className="reveal" data-reveal-delay="120">
            <RingingPhone />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * A phone mid-ring, with nobody free to answer it. Server-rendered and
 * animated purely in CSS, so it costs zero JavaScript.
 */
function RingingPhone() {
  return (
    <div className="relative mx-auto w-full max-w-[300px] sm:max-w-[330px]">
      {/* Warm glow behind the device, echoing the light in the portrait. */}
      <div
        aria-hidden="true"
        className="umber-glow pointer-events-none absolute -inset-10 opacity-30 blur-3xl"
      />

      <div className="animate-ring relative rounded-[26px] border-[0.8px] border-[color:var(--color-line-strong)] bg-[color:var(--color-ink)] p-2.5 shadow-2xl shadow-black/60">
        <div className="rounded-[18px] bg-[color:var(--color-canvas)] px-5 py-9 text-center">
          <p className="text-[0.65rem] tracking-[0.22em] text-[color:var(--color-muted)] uppercase">
            Incoming call
          </p>

          <p className="mt-5 font-[family-name:var(--font-display)] text-[1.6rem] leading-none text-[color:var(--color-text)]">
            +91 98••• ••••2
          </p>
          <p className="mt-2 text-[0.8rem] text-[color:var(--color-muted)]">
            Calling for the second time
          </p>

          <div className="mt-9 flex items-center justify-center gap-11">
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#3a1f1a] text-[#e06a5c]">
              <PhoneIcon rotate />
            </span>
            <span className="animate-pulse-ring flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[color:var(--color-whatsapp)] text-[#06301a]">
              <PhoneIcon />
            </span>
          </div>

          <p className="mt-8 text-[0.72rem] text-[color:var(--color-muted)]">
            Nobody is free to pick up.
          </p>
        </div>
      </div>
    </div>
  );
}

/* Inline SVG rather than an icon package — no extra bytes, no extra request. */
function PhoneIcon({ rotate = false }: { rotate?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-[1.2em] w-[1.2em] ${rotate ? "rotate-[135deg]" : ""}`}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1l-2.3 2.2Z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-accent)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m20 6-11 11-5-5" />
    </svg>
  );
}
