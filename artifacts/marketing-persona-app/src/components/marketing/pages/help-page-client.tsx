"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Server, Share2 } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import { FAQAccordion } from "@/components/marketing/sections/faq-accordion";
import {
  HELP_CATEGORIES,
  getHelpArticlesByCategory,
  type HelpCategory,
} from "@/lib/marketing/content/help-articles";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";

const glassCard = cardSurfaceClass("glass");

const CATEGORY_ICONS: Record<HelpCategory, typeof BookOpen> = {
  "Getting started": BookOpen,
  "Social publishing": Share2,
  "Self-hosted admin": Server,
};

export function HelpPageClient() {
  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="Help"
          titleLine1="Setup &"
          titleLine2="publishing guides"
          description="Connect social accounts, publish from Content Studio, and configure OAuth for self-hosted deployments."
          backgroundImage={HERO_IMAGES.about.hero}
          ctas={[{ label: "Contact support", href: "/contact", variant: "primary" }]}
        />
      }
    >
      <FAQAccordion
        titleLine1="Quick"
        titleLine2="answers"
        items={[
          {
            question: "Where do I connect LinkedIn or X?",
            answer: "Open a project → Publishing tab → Connect on each social card. Connections are per project.",
            helpHref: "/help/connect-linkedin",
          },
          {
            question: "Can I publish to Instagram?",
            answer: "Yes, via Meta OAuth with a Facebook Page and linked Instagram Business account.",
            helpHref: "/help/connect-meta-facebook-instagram",
          },
          {
            question: "I'm self-hosting. What env vars do I need?",
            answer: "LinkedIn, X, and Meta require OAuth client IDs. Bluesky needs a stable signing key. See the admin guides.",
            helpHref: "/help/admin-social-env-vars",
          },
        ]}
      />

      <MarketingSection bordered className="py-16">
        {HELP_CATEGORIES.map((category) => {
          const articles = getHelpArticlesByCategory(category);
          if (articles.length === 0) return null;
          const CategoryIcon = CATEGORY_ICONS[category];
          return (
            <div key={category} className="mb-12 last:mb-0">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/80">
                  <CategoryIcon className="h-4 w-4" />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-white">{category}</h2>
              </div>
              <div className="grid gap-4">
                {articles.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/help/${article.slug}`}
                    className={`${glassCard} p-6 flex items-start justify-between gap-4 group`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-white group-hover:text-primary transition-colors">{article.title}</h3>
                        <span className="text-xs rounded-full border border-white/10 px-2 py-0.5 text-white/50 capitalize">
                          {article.audience}
                        </span>
                      </div>
                      <p className="text-sm text-white/65">{article.description}</p>
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
