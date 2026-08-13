import SectionHead from "@/components/SectionHead";
import { site, whatsappHref } from "@/content/site";

/**
 * Real numbers, shown publicly. In India, hidden pricing reads as "they will
 * judge my wallet and quote accordingly" — showing it buys trust and filters
 * out enquiries that were never going to convert.
 */
export default function Pricing() {
  return (
    <section id="pricing" className="section">
      <div className="shell">
        <SectionHead
          eyebrow={site.pricing.eyebrow}
          heading={site.pricing.heading}
          body={site.pricing.body}
        />

        <div className="mt-12 grid gap-5 lg:mt-16 lg:grid-cols-3">
          {site.pricing.plans.map((plan, i) => (
            <div
              key={plan.name}
              data-reveal-delay={i * 90}
              className={`reveal flex flex-col rounded-[12px] p-7 sm:p-8 ${
                plan.featured
                  ? "border-[0.8px] border-[color:var(--color-accent-line)] bg-[color:var(--color-surface)] ring-1 ring-[color:var(--color-accent-soft)]"
                  : "card"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[color:var(--color-text)]">{plan.name}</h3>
                {plan.featured && (
                  <span className="rounded-full bg-[color:var(--color-accent)] px-3 py-1 text-[0.65rem] font-medium tracking-[0.12em] text-[color:var(--color-cream)] uppercase">
                    Popular
                  </span>
                )}
              </div>

              <p className="mt-1.5 text-[0.82rem] text-[color:var(--color-muted)]">
                {plan.best}
              </p>

              <p className="mt-6 flex items-baseline gap-2">
                <span className="font-[family-name:var(--font-display)] text-[2.4rem] leading-none text-[color:var(--color-text)]">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-[0.82rem] text-[color:var(--color-muted)]">
                    {plan.period}
                  </span>
                )}
              </p>

              <ul className="mt-7 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2.5 text-[0.875rem] leading-snug text-[color:var(--color-muted)]"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="mt-[3px] h-[15px] w-[15px] shrink-0 text-[color:var(--color-accent)]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m20 6-11 11-5-5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href={whatsappHref(
                  `Hi Mathan, I am interested in the ${plan.name} plan for my business.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                data-tap
                className={`btn mt-8 w-full ${plan.featured ? "btn-primary" : "btn-secondary"}`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="reveal mt-8 text-center text-[0.85rem] text-[color:var(--color-muted)]">
          {site.pricing.note}
        </p>
      </div>
    </section>
  );
}
