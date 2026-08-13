import type { ReactNode } from "react";

/**
 * The Bizzap section opener: a small tracked terracotta eyebrow, then a large
 * serif heading, then an optional muted paragraph. Used by every section so
 * the vertical rhythm stays identical down the page.
 */
export default function SectionHead({
  eyebrow,
  heading,
  body,
  align = "left",
  children,
}: {
  eyebrow: string;
  heading: string;
  body?: string;
  align?: "left" | "center";
  children?: ReactNode;
}) {
  const centered = align === "center";
  return (
    <div className={`reveal ${centered ? "mx-auto max-w-2xl text-center" : ""}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-5 max-w-[18ch] text-[color:var(--color-text)]">
        {heading}
      </h2>
      {body && (
        <p
          className={`mt-5 text-[0.95rem] leading-[1.75] text-[color:var(--color-muted)] ${
            centered ? "mx-auto max-w-[52ch]" : "max-w-[52ch]"
          }`}
        >
          {body}
        </p>
      )}
      {children}
    </div>
  );
}
