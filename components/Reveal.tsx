"use client";

import { useEffect } from "react";

/**
 * Scroll-reveal, mounted once for the whole page.
 *
 * One IntersectionObserver watching every `.reveal` element, instead of an
 * animation library — about 30 lines rather than ~50KB of JavaScript.
 *
 * The important property here is that content can never get stuck invisible.
 * Three separate guarantees:
 *   1. Anything already on screen at setup is revealed immediately, so a deep
 *      link straight to #pricing does not land on a blank section.
 *   2. The observer reveals the rest as they scroll into view.
 *   3. A timeout reveals everything regardless, if anything above failed.
 */
export default function Reveal() {
  useEffect(() => {
    const reveal = (el: Element) => el.setAttribute("data-in", "true");
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (!nodes.length) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) {
      nodes.forEach(reveal);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          const delay = Number(el.dataset.revealDelay ?? 0);
          window.setTimeout(() => reveal(el), delay);
          io.unobserve(el);
        }
      },
      { rootMargin: "120px 0px 0px 0px", threshold: 0.01 },
    );

    for (const node of nodes) {
      // Already visible, or scrolled past? Show it now, without animating in.
      // This is what a hash link like /#pricing lands on.
      if (node.getBoundingClientRect().top < window.innerHeight) {
        reveal(node);
        continue;
      }
      io.observe(node);
    }

    // Last resort. Visible beats pretty.
    const failsafe = window.setTimeout(() => nodes.forEach(reveal), 1500);

    return () => {
      io.disconnect();
      window.clearTimeout(failsafe);
    };
  }, []);

  return null;
}
