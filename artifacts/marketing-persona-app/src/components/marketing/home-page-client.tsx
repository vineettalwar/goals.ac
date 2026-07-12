"use client";

import { useRef } from "react";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { HeroSection } from "@/components/marketing/hero-section";
import { RoadmapGenerator } from "@/components/marketing/roadmap-generator";
import { HomeMarketingSections } from "@/components/marketing/home-marketing-sections";

export function HomePageClient() {
  const generatorRef = useRef<HTMLElement>(null);

  const scrollToGenerator = () => {
    generatorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <MarketingPageShell hero={<HeroSection onCtaClick={scrollToGenerator} />}>
      <RoadmapGenerator sectionRef={generatorRef} />
      <HomeMarketingSections />
    </MarketingPageShell>
  );
}
