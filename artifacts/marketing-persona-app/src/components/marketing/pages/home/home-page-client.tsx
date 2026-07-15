"use client";

import dynamic from "next/dynamic";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { HeroSection } from "@/components/marketing/heroes/hero-section";
import type { ShowcaseArticle } from "@/components/marketing/sections/home-marketing-sections";

const WorkflowSection = dynamic(
  () =>
    import("@/components/marketing/sections/workflow-section").then((module) => module.WorkflowSection),
  { loading: () => null },
);

const VideoDemoSection = dynamic(
  () =>
    import("@/components/marketing/sections/video-demo-section").then(
      (module) => module.VideoDemoSection,
    ),
  { loading: () => null },
);

const HomeMarketingSections = dynamic(
  () =>
    import("@/components/marketing/sections/home-marketing-sections").then(
      (module) => module.HomeMarketingSections,
    ),
  { loading: () => null },
);

type HomePageClientProps = {
  showcaseArticle?: ShowcaseArticle | null;
};

export function HomePageClient({ showcaseArticle }: HomePageClientProps) {
  return (
    <MarketingPageShell hero={<HeroSection />}>
      <WorkflowSection />
      <VideoDemoSection />
      <HomeMarketingSections showcaseArticle={showcaseArticle} />
    </MarketingPageShell>
  );
}
