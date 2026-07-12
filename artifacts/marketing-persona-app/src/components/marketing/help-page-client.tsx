"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { MarketingSection } from "@/components/marketing/marketing-section";
import { FAQAccordion } from "@/components/marketing/faq-accordion";
import {
  HELP_CATEGORIES,
  getHelpArticlesByCategory,
} from "@/lib/help-articles";
import { HERO_IMAGES } from "@/lib/marketing-hero-images";

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
            question: "I'm self-hosting — what env vars do I need?",
            answer: "LinkedIn, X, and Meta require OAuth client IDs. Bluesky needs a stable signing key. See the admin guides.",
            helpHref: "/help/admin-social-env-vars",
          },
        ]}
      />

      <MarketingSection variant="paper" bordered className="py-16 bg-background">
        {HELP_CATEGORIES.map((category) => {
          const articles = getHelpArticlesByCategory(category);
          if (articles.length === 0) return null;
          return (
            <div key={category} className="mb-12 last:mb-0">
              <h2 className="text-lg font-bold mb-4">{category}</h2>
              <div className="grid gap-4">
                {articles.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/help/${article.slug}`}
                    className="paper-card paper-card-hover p-6 flex items-start justify-between gap-4 group"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold group-hover:text-primary transition-colors">{article.title}</h3>
                        <span className="text-xs rounded-full border border-border px-2 py-0.5 text-muted-foreground capitalize">
                          {article.audience}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{article.description}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1 group-hover:text-primary" />
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
