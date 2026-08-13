import { site, whatsappHref } from "@/content/site";

/**
 * The closing ask. WhatsApp first, because that is how business actually gets
 * done in India — a form would lose most of these people.
 */
export default function Contact() {
  return (
    <section id="contact" className="section section-surface">
      <div className="shell">
        <div className="reveal mx-auto max-w-2xl text-center">
          <p className="eyebrow">{site.cta.eyebrow}</p>
          <h2 className="mt-5 text-[color:var(--color-text)]">
            {site.cta.heading}
          </h2>
          <p className="mx-auto mt-5 max-w-[48ch] text-[0.95rem] leading-[1.75] text-[color:var(--color-muted)]">
            {site.cta.body}
          </p>

          <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
            <a
              href={whatsappHref()}
              target="_blank"
              rel="noopener noreferrer"
              data-tap
              className="btn btn-whatsapp"
            >
              <WhatsAppGlyph />
              {site.cta.whatsappLabel}
            </a>
            <a
              href={`tel:${site.contact.phoneDial}`}
              data-tap
              className="btn btn-secondary"
            >
              {site.cta.callLabel} · {site.contact.phoneDisplay}
            </a>
          </div>

          <p className="mt-7 text-[0.85rem] text-[color:var(--color-muted)]">
            {site.cta.emailLabel}:{" "}
            <a
              href={`mailto:${site.contact.email}`}
              className="text-[color:var(--color-accent)] underline underline-offset-4"
            >
              {site.contact.email}
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

function WhatsAppGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.41a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.21.89 2.39 1.01 2.55.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.68-1.19.2-.58.2-1.08.15-1.18-.06-.11-.23-.17-.48-.29Z" />
    </svg>
  );
}
