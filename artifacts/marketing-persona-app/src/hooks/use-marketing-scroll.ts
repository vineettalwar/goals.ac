"use client";

import { type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useMarketingScrollReveal(
  scopeRef: RefObject<HTMLElement | null>,
  selector: string = ".scroll-reveal",
) {
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const scope = scopeRef.current;
      if (!scope) return;

      gsap.from(selector, {
        opacity: 0,
        y: 28,
        duration: 0.65,
        stagger: 0.08,
        ease: "power2.out",
        scrollTrigger: {
          trigger: scope,
          start: "top 82%",
          once: true,
        },
      });
    },
    { scope: scopeRef },
  );
}

export function useMarketingParallax(
  scopeRef: RefObject<HTMLElement | null>,
  bgRef: RefObject<HTMLElement | null>,
  yPercent = 18,
) {
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const scope = scopeRef.current;
      const bg = bgRef.current;
      if (!scope || !bg) return;

      gsap.to(bg, {
        yPercent,
        ease: "none",
        scrollTrigger: {
          trigger: scope,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    },
    { scope: scopeRef },
  );
}
