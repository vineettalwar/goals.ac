"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Server, Share2 } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { HelpArticleBody } from "@/components/marketing/help-article-body";
import type { HelpArticle, HelpCategory } from "@/lib/marketing/help-articles";
import { HELP_ARTICLES } from "@/lib/marketing/help-articles";
import { HERO_IMAGES } from "@/lib/marketing/marketing-hero-images";
import { cardSurfaceClass } from "@/lib/marketing/marketing-surfaces";

const glassCard = cardSurfaceClass("glass", false);
const glassCardHover = cardSurfaceClass("glass");

const CATEGORY_ICONS: Record<HelpCategory, typeof BookOpen> = {
  "Getting started": BookOpen,
  "Social publishing": Share2,
  "Self-hosted admin": Server,
};

export function HelpArticleClient({ article }: { article: HelpArticle }) {
  const titleWords = article.title.split(" ");
  const mid = Math.ceil(titleWords.length / 2);
  const CategoryIcon = CATEGORY_ICONS[article.category];

  const related = HELP_ARTICLES.filter(
    (a) => a.category === article.category && a.slug !== article.slug,
  ).slice(0, 3);

  return (
    <MarketingPageShell
      overlap={false}
      hero={
        <PageHero
          badge={article.category}
          titleLine1={titleWords.slice(0, mid).join(" ")}
          titleLine2={titleWords.slice(mid).join(" ") || undefined}
          description={article.description}
          backgroundImage={HERO_IMAGES.about.mission}
        />
      }
    >
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <Link
          href="/help"
          className="inline-flex items-center gap-1.5 text-sm text-white/65 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> All help articles
        </Link>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full editorial-badge-dark px-3 py-1 text-xs font-semibold">
            <CategoryIcon className="h-3.5 w-3.5" />
            {article.category}
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/50 capitalize">
            {article.audience === "admin" ? "Admin guide" : "User guide"}
          </span>
        </div>

        <div className={`${glassCard} p-8 md:p-10 marketing-prose-dark`}>
          <HelpArticleBody body={article.body} />
        </div>

        {article.cta ? (
          <div className={`mt-10 ${glassCard} p-8 md:p-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6`}>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary mb-1">Next step</p>
              <p className="text-white/65 text-sm">Put this guide into practice in your workspace.</p>
            </div>
            <Link
              href={article.cta.href}
              className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-medium hover:opacity-90 shrink-0"
            >
              {article.cta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : null}

        {related.length > 0 ? (
          <div className="mt-12">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white/50 mb-4">
              More in {article.category}
            </h3>
            <div className="grid gap-3">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={`/help/${item.slug}`}
                  className={`${glassCardHover} px-5 py-4 flex items-center justify-between gap-4 group`}
                >
                  <div>
                    <p className="font-semibold text-white group-hover:text-primary transition-colors">{item.title}</p>
                    <p className="text-sm text-white/65 mt-0.5 line-clamp-1">{item.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-white/50 shrink-0 group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </MarketingPageShell>
  );
}
