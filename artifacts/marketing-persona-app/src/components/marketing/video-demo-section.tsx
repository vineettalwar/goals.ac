"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { MarketingSection } from "./marketing-section";
import { HERO_IMAGES } from "@/lib/marketing-hero-images";

export function VideoDemoSection() {
  return (
    <MarketingSection
      variant="paper"
      bordered
      badge="Product tour"
      titleLine1="See the"
      titleLine2="workflow in action"
      description="Onboarding → roadmap → draft → quality score → publish. Full editorial control at every step."
      className="py-20 bg-background"
    >
      <div className="paper-card rounded-2xl overflow-hidden max-w-4xl mx-auto">
        <div
          className="relative aspect-video bg-cover bg-center flex items-center justify-center"
          style={{ backgroundImage: `url(${HERO_IMAGES.features.capabilities})` }}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-10 text-center px-6">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur border border-white/30 mb-4">
              <Play className="h-7 w-7 text-white ml-1" />
            </div>
            <p className="text-white font-semibold text-lg">2-minute product walkthrough</p>
            <p className="text-white/70 text-sm mt-2 max-w-md mx-auto">
              Video demo coming soon —{" "}
              <Link href="/signup" className="text-white underline hover:no-underline">
                start free
              </Link>{" "}
              to explore the workflow live.
            </p>
          </div>
        </div>
        <div className="grid sm:grid-cols-4 gap-px bg-border">
          {["Brand setup", "30-day plan", "Quality score", "CMS publish"].map((step) => (
            <div key={step} className="bg-card p-4 text-center text-xs font-medium text-muted-foreground">
              {step}
            </div>
          ))}
        </div>
      </div>
    </MarketingSection>
  );
}
