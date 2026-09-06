"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, BookOpen, Plug, Search } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import {
  LEARN_CATEGORIES,
  getLearnPostsByCategory,
  type LearnCategory,
} from "@/lib/marketing/content/learn-posts";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";

const glassCard = cardSurfaceClass("glass");

const CATEGORY_ICONS: Record<LearnCategory, typeof BookOpen> = {
  "GEO & AI visibility": Search,
  "Content strategy": BookOpen,
  "Publishing & CMS": Plug,
  "Measurement & ops": BarChart3,
};

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
        {LEARN_CATEGORIES.map((category) => {
          const posts = getLearnPostsByCategory(category);
          if (posts.length === 0) return null;
          const CategoryIcon = CATEGORY_ICONS[category];
          return (
            <div key={category} className="mb-12 last:mb-0">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/80">
                  <CategoryIcon className="h-4 w-4" aria-hidden />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-white">{category}</h2>
              </div>
              <div className="grid gap-4">
                {posts.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/learn/${post.slug}`}
                    className={`${glassCard} p-6 flex items-start justify-between gap-4 group`}
                  >
                    <div>
                      <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-sm text-white/65 mt-1">{post.description}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-white/50 shrink-0 mt-1 group-hover:text-primary" />
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </MarketingSection>
    </MarketingPageShell>
  );
}
