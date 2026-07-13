"use client";

import Link from "next/link";
import { useRef } from "react";
import { Play } from "lucide-react";
import { EditorialHeading } from "./editorial-heading";
import { HERO_IMAGES } from "@/lib/marketing-hero-images";
import { useMarketingScrollReveal } from "@/hooks/use-marketing-scroll";

const TOUR_STEPS = ["Brand setup", "30-day plan", "Quality score", "CMS publish"];

export function VideoDemoSection() {
  const sectionRef = useRef<HTMLElement>(null);
  useMarketingScrollReveal(sectionRef);

  return (
    <section ref={sectionRef} className="py-20 bg-background border-t border-border">
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-12">
          <EditorialHeading
            line1="See the"
            line2="workflow in action"
            description="Onboarding, roadmap, draft, quality score, and publish. Full editorial control at every step."
            theme="light"
          />
        </div>

        <div className="scroll-reveal paper-card rounded-2xl overflow-hidden max-w-4xl mx-auto">
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
              <p className="text-white/70 text-base mt-2 max-w-md mx-auto">
                Video demo coming soon.{" "}
                <Link href="/signup" className="text-white underline hover:no-underline">
                  Start free
                </Link>{" "}
                to explore the workflow live.
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-4 gap-px bg-border">
            {TOUR_STEPS.map((step) => (
              <div key={step} className="bg-card p-4 text-center text-sm font-medium text-muted-foreground">
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
