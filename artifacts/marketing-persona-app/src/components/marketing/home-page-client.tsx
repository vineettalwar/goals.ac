"use client";

import { useRef } from "react";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { HeroSection } from "@/components/marketing/hero-section";
import { RoadmapGenerator } from "@/components/marketing/roadmap-generator";
import { HOME_ROADMAP_REFERRER } from "@/lib/roadmap-intent";
import { HomeMarketingSections } from "@/components/marketing/home-marketing-sections";
import { VideoDemoSection } from "@/components/marketing/video-demo-section";

export function HomePageClient() {
  const generatorRef = useRef<HTMLElement>(null);

  const scrollToGenerator = () => {
    generatorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <MarketingPageShell hero={<HeroSection onCtaClick={scrollToGenerator} />}>
      <RoadmapGenerator sectionRef={generatorRef} referrer={HOME_ROADMAP_REFERRER} />
      <HomeMarketingSections />
      <VideoDemoSection />
    </MarketingPageShell>
  );
}
