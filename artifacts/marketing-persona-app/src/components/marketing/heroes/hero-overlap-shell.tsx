"use client";

import type { ReactNode, RefObject } from "react";
import { MarketingReveal } from "@/components/marketing/motion/marketing-reveal";

type HeroOverlapShellProps = {
  id?: string;
  children: ReactNode;
  sectionRef?: RefObject<HTMLElement | null>;
};

/** Flush form band under the hero — no floating glass card. */
export function HeroOverlapShell({ id, children, sectionRef }: HeroOverlapShellProps) {
  return (
    <section
      ref={sectionRef}
      id={id}
      className="relative z-20 scroll-mt-24 bg-black"
    >
      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <MarketingReveal mode="mount" delayMs={150}>
          {children}
        </MarketingReveal>
      </div>
    </section>
  );
}
