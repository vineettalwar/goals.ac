"use client";

import type { ReactNode } from "react";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { HERO_IMAGES } from "@/lib/marketing/marketing-hero-images";
import { cardSurfaceClass } from "@/lib/marketing/marketing-surfaces";

const glassCard = cardSurfaceClass("glass", false);

type LegalPageClientProps = {
  titleLine1: string;
  titleLine2?: string;
  lastUpdated: string;
  children: ReactNode;
};

export function LegalPageClient({
  titleLine1,
  titleLine2,
  lastUpdated,
  children,
}: LegalPageClientProps) {
  return (
    <MarketingPageShell
      overlap={false}
      hero={
        <PageHero
          badge={`Last updated ${lastUpdated}`}
          titleLine1={titleLine1}
          titleLine2={titleLine2}
          backgroundImage={HERO_IMAGES.legal.hero}
        />
      }
    >
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className={`${glassCard} p-8 md:p-10 space-y-8 marketing-prose-dark`}>{children}</div>
      </div>
    </MarketingPageShell>
  );
}
