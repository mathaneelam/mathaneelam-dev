import SectionHead from "@/components/SectionHead";
import { site } from "@/content/site";

/**
 * Four services, described the way you would say them out loud to a shop
 * owner. Emoji icons follow the Bizzap card pattern.
 */
export default function Services() {
  return (
    <section id="services" className="section">
      <div className="shell">
        <SectionHead
          eyebrow={site.services.eyebrow}
          heading={site.services.heading}
        />

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:mt-16">
          {site.services.items.map((item, i) => (
            <article
              key={item.title}
              className="card reveal p-7 sm:p-8"
              data-reveal-delay={i * 80}
            >
              <span className="text-[1.7rem] leading-none" aria-hidden="true">
                {item.icon}
              </span>
              <h3 className="mt-5 text-[color:var(--color-text)]">{item.title}</h3>
              <p className="mt-3 text-[0.9rem] leading-[1.75] text-[color:var(--color-muted)]">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
