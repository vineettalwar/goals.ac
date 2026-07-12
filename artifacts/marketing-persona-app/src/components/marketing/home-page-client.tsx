"use client";

import { useRef } from "react";
import { HeroSection } from "@/components/marketing/hero-section";
import { RoadmapGenerator } from "@/components/marketing/roadmap-generator";
import { HomeMarketingSections } from "@/components/marketing/home-marketing-sections";

export function HomePageClient() {
  const generatorRef = useRef<HTMLElement>(null);

  const scrollToGenerator = () => {
    generatorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background tracking-[-0.02em]">
      <HeroSection onCtaClick={scrollToGenerator} />
      <div className="relative bg-background">
        <RoadmapGenerator sectionRef={generatorRef} />
        <HomeMarketingSections />
      </div>
    </div>
  );
}
