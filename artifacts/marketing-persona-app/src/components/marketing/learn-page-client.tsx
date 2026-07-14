"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { MarketingSection } from "@/components/marketing/marketing-section";
import { LEARN_POSTS } from "@/lib/marketing/learn-posts";
import { HERO_IMAGES } from "@/lib/marketing/marketing-hero-images";
import { cardSurfaceClass } from "@/lib/marketing/marketing-surfaces";

const glassCard = cardSurfaceClass("glass");

export function LearnPageClient() {
  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="Learn"
          titleLine1="SEO & GEO"
          titleLine2="academy"
          description="Cornerstone guides on generative engine optimization, AI citations, and B2B content strategy."
          backgroundImage={HERO_IMAGES.about.hero}
          ctas={[{ label: "Free tools", href: "/free-tools", variant: "primary" }]}
        />
      }
    >
      <MarketingSection bordered className="py-16">
        <div className="grid gap-4">
          {LEARN_POSTS.map((post) => (
            <Link
              key={post.slug}
              href={`/learn/${post.slug}`}
              className={`${glassCard} p-6 flex items-start justify-between gap-4 group`}
            >
              <div>
                <h2 className="font-bold text-lg text-white group-hover:text-primary transition-colors">{post.title}</h2>
                <p className="text-sm text-white/65 mt-1">{post.description}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-white/50 shrink-0 mt-1 group-hover:text-primary" />
            </Link>
          ))}
        </div>
      </MarketingSection>
    </MarketingPageShell>
  );
}
