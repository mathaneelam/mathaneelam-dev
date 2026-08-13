import SectionHead from "@/components/SectionHead";
import { site } from "@/content/site";

/**
 * Names the loss before offering the fix. Sits on the surface colour, so it
 * separates visually from the hero above it.
 */
export default function Problem() {
  return (
    <section className="section section-surface">
      <div className="shell">
        <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16">
          <SectionHead
            eyebrow={site.problem.eyebrow}
            heading={site.problem.heading}
            body={site.problem.body}
          />

          <div className="grid gap-4 sm:grid-cols-3 lg:gap-5">
            {site.problem.stats.map((s, i) => (
              <div
                key={s.label}
                className="card reveal p-6"
                data-reveal-delay={i * 90}
              >
                <p className="font-[family-name:var(--font-display)] text-[2rem] leading-none text-[color:var(--color-accent)]">
                  {s.value}
                </p>
                <p className="mt-3 text-[0.85rem] leading-snug text-[color:var(--color-muted)]">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {site.problem.source && (
          <p className="reveal mt-8 text-[0.72rem] text-[color:var(--color-muted)]/70">
            {site.problem.source}
          </p>
        )}
      </div>
    </section>
  );
}
