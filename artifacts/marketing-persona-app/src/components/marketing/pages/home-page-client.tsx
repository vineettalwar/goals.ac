"use client";

import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { HeroSection } from "@/components/marketing/heroes/hero-section";
import { WorkflowSection } from "@/components/marketing/sections/workflow-section";
import { HomeMarketingSections, type ShowcaseArticle } from "@/components/marketing/sections/home-marketing-sections";

type HomePageClientProps = {
  showcaseArticle?: ShowcaseArticle | null;
};

export function HomePageClient({ showcaseArticle }: HomePageClientProps) {
  return (
    <MarketingPageShell hero={<HeroSection />}>
      <WorkflowSection />
      <HomeMarketingSections showcaseArticle={showcaseArticle} />
    </MarketingPageShell>
  );
}
