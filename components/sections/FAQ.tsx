import SectionHead from "@/components/SectionHead";
import { site } from "@/content/site";

/**
 * Native <details> accordions — open/close with zero JavaScript, and they
 * stay usable if scripts fail. Answers address the fear directly rather than
 * selling around it.
 */
export default function FAQ() {
  return (
    <section id="faq" className="section">
      <div className="shell">
        <SectionHead
          eyebrow={site.faq.eyebrow}
          heading={site.faq.heading}
          align="center"
        />

        <div className="mx-auto mt-12 max-w-3xl space-y-3 lg:mt-16">
          {site.faq.items.map((item, i) => (
            <details
              key={item.q}
              className="card reveal group overflow-hidden"
              data-reveal-delay={i * 60}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-[0.95rem] font-medium text-[color:var(--color-text)] sm:p-6 [&::-webkit-details-marker]:hidden">
                {item.q}
                <svg
                  viewBox="0 0 24 24"
                  className="h-[18px] w-[18px] shrink-0 text-[color:var(--color-accent)] transition-transform duration-300 group-open:rotate-45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </summary>
              <p className="px-5 pb-5 text-[0.9rem] leading-[1.8] text-[color:var(--color-muted)] sm:px-6 sm:pb-6">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
