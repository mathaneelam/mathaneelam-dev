import SectionHead from "@/components/SectionHead";
import { site } from "@/content/site";

/**
 * Three steps. Ends on the reassurance about keeping their existing number,
 * because that is the objection that stops most people from enquiring.
 */
export default function HowItWorks() {
  return (
    <section id="how" className="section section-surface">
      <div className="shell">
        <SectionHead
          eyebrow={site.howItWorks.eyebrow}
          heading={site.howItWorks.heading}
        />

        <ol className="mt-12 grid gap-5 md:grid-cols-3 lg:mt-16">
          {site.howItWorks.steps.map((step, i) => (
            <li
              key={step.n}
              className="card reveal p-7 sm:p-8"
              data-reveal-delay={i * 90}
            >
              <p className="font-[family-name:var(--font-display)] text-[1.75rem] leading-none text-[color:var(--color-accent)]">
                {step.n}
              </p>
              <h3 className="mt-5 text-[color:var(--color-text)]">{step.title}</h3>
              <p className="mt-3 text-[0.9rem] leading-[1.75] text-[color:var(--color-muted)]">
                {step.body}
              </p>
            </li>
          ))}
        </ol>

        <p className="reveal mt-8 flex items-start gap-3 rounded-[12px] border-[0.8px] border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] p-5 text-[0.9rem] leading-relaxed text-[color:var(--color-text)]">
          <svg
            viewBox="0 0 24 24"
            className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[color:var(--color-accent)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m20 6-11 11-5-5" />
          </svg>
          {site.howItWorks.reassurance}
        </p>
      </div>
    </section>
  );
}
