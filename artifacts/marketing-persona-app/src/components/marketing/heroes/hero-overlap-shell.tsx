"use client";

import type { ReactNode, RefObject } from "react";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";
import { MarketingReveal } from "@/components/marketing/motion/marketing-reveal";

type HeroOverlapShellProps = {
  id?: string;
  children: ReactNode;
  sectionRef?: RefObject<HTMLElement | null>;
};

export function HeroOverlapShell({ id, children, sectionRef }: HeroOverlapShellProps) {
  return (
    <section
      ref={sectionRef}
      id={id}
      className="py-0 bg-transparent relative z-20 -mt-4 sm:-mt-8"
    >
      <div className="max-w-3xl mx-auto px-6">
        <MarketingReveal
          mode="mount"
          delayMs={150}
          className={`${cardSurfaceClass("glass")} overflow-hidden shadow-2xl shadow-black/40`}
        >
          {children}
        </MarketingReveal>
      </div>
    </section>
  );
}
