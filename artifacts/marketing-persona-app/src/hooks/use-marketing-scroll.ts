"use client";

import { type RefObject, useEffect } from "react";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function revealElements(scope: HTMLElement, selector: string) {
  const elements = scope.querySelectorAll<HTMLElement>(selector);
  elements.forEach((element, index) => {
    element.style.transitionDelay = `${index * 80}ms`;
    element.classList.add("scroll-reveal-visible");
  });
}

export function useMarketingScrollReveal(
  scopeRef: RefObject<HTMLElement | null>,
  selector: string = ".scroll-reveal",
) {
  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;

    const elements = scope.querySelectorAll<HTMLElement>(selector);
    if (!elements.length) return;

    if (prefersReducedMotion()) {
      revealElements(scope, selector);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = entry.target as HTMLElement;
          target.classList.add("scroll-reveal-visible");
          observer.unobserve(target);
        });
      },
      { rootMargin: "0px 0px -18% 0px", threshold: 0.01 },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [scopeRef, selector]);
}

/** Reserved for hero parallax — no-op without GSAP to keep marketing bundles lean. */
export function useMarketingParallax(
  _scopeRef: RefObject<HTMLElement | null>,
  _bgRef: RefObject<HTMLElement | null>,
  _yPercent = 18,
) {
  // Intentionally empty: parallax is not used on current marketing routes.
}
