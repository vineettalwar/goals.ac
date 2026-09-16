"use client";

import { type RefObject, useEffect } from "react";

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

    // Always show — opacity:0 without this class traps SSR HTML if hydration/IO never runs.
    revealElements(scope, selector);
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
