"use client";

import { PageHero } from "./page-hero";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";

export function HeroSection() {
  return (
    <PageHero
      layout="home"
      badge="Content Studio"
      titleLine1="Research-driven SEO content"
      titleLine2="published everywhere"
      leftDescription="Briefs, drafts, and cross-platform publishing from one workspace. You approve every piece before it goes live."
      description="Save time on research, writing, and formatting. CMS, social, and email — connected."
      backgroundImage={HERO_IMAGES.home.base}
      spotlightImage={HERO_IMAGES.home.spotlight}
      enableSpotlight
      ctas={[
        { label: "Start creating", href: "/signup", variant: "primary" },
        { label: "Run free GEO audit", href: "/geo-audit", variant: "ghost" },
      ]}
    />
  );
}
