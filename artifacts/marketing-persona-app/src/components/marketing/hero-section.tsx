"use client";

import { PageHero } from "./page-hero";
import { HERO_IMAGES } from "@/lib/marketing-hero-images";

type HeroSectionProps = {
  onCtaClick?: () => void;
};

export function HeroSection({ onCtaClick }: HeroSectionProps) {
  return (
    <PageHero
      layout="home"
      titleLine1="Your market holds"
      titleLine2="stories worth ranking"
      leftDescription="Every published article compounds — building search visibility, audience trust, and pipeline from topics your market already cares about."
      description="Peel back the plan: custom roadmaps, persona-driven articles, and one-click publishing to the CMS you already use."
      backgroundImage={HERO_IMAGES.home.base}
      spotlightImage={HERO_IMAGES.home.spotlight}
      enableSpotlight
      ctas={[{ label: "Build your roadmap", onClick: onCtaClick, variant: "primary" }]}
    />
  );
}
