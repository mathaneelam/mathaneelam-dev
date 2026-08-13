import Image from "next/image";
import { site } from "@/content/site";

/**
 * The trust section. A real face and a real place do more work here than any
 * number of client logos would.
 *
 * The portrait's own background is burnt umber, so the section sits it on a
 * matching glow and fades its lower edge — the shoulders dissolve into the
 * page instead of ending on a hard rectangle.
 */
export default function About() {
  return (
    <section id="about" className="section section-surface">
      <div className="shell">
        <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          {/* ------------------------------------------------------ PHOTO */}
          <div className="reveal relative mx-auto w-full max-w-[300px] lg:max-w-none">
            <div
              aria-hidden="true"
              className="umber-glow pointer-events-none absolute -inset-6 opacity-40 blur-2xl"
            />
            <div className="relative overflow-hidden rounded-[12px] border-[0.8px] border-[color:var(--color-line)]">
              <Image
                src="/mathan-portrait.jpg"
                alt={site.about.portraitAlt}
                width={820}
                height={1098}
                sizes="(max-width: 1024px) 300px, 420px"
                className="h-auto w-full"
                priority={false}
              />
              {/* Fades the bottom edge into the section colour. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-[color:var(--color-surface)] to-transparent"
              />
            </div>
          </div>

          {/* ------------------------------------------------------- COPY */}
          <div className="reveal" data-reveal-delay="100">
            <p className="eyebrow">{site.about.eyebrow}</p>
            <h2 className="mt-5 max-w-[16ch] text-[color:var(--color-text)]">
              {site.about.heading}
            </h2>

            <div className="mt-6 space-y-4">
              {site.about.body.map((para) => (
                <p
                  key={para.slice(0, 24)}
                  className="max-w-[54ch] text-[0.95rem] leading-[1.8] text-[color:var(--color-muted)]"
                >
                  {para}
                </p>
              ))}
            </div>

            {site.about.credential && (
              <p className="mt-6 inline-flex rounded-full border-[0.8px] border-[color:var(--color-line-strong)] px-4 py-2 text-[0.8rem] text-[color:var(--color-muted)]">
                {site.about.credential}
              </p>
            )}

            <p className="mt-7 text-[0.8rem] tracking-[0.14em] text-[color:var(--color-muted)] uppercase">
              {site.city}, {site.state}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
