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
      badge="AI SEO for B2B teams"
      titleLine1="Rank on Google and get"
      titleLine2="cited by ChatGPT"
      leftDescription="Roadmaps, GEO-ready articles, and AI visibility tracking with editorial control at every step. You approve every draft before it hits your CMS."
      description="No backlink schemes. No black-box autopilot. Strategy-first content that compounds visibility and pipeline."
      backgroundImage={HERO_IMAGES.home.base}
      spotlightImage={HERO_IMAGES.home.spotlight}
      enableSpotlight
      ctas={[
        { label: "Build your roadmap", onClick: onCtaClick, variant: "primary" },
        { label: "Run free GEO audit", href: "/geo-audit", variant: "ghost" },
      ]}
    />
  );
}
