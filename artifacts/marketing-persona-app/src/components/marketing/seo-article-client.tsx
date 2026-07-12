"use client";

import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { MarketingCTA } from "@/components/marketing/marketing-cta";
import { HERO_IMAGES } from "@/lib/marketing-hero-images";

type SeoArticleClientProps = {
  title: string;
  content: string;
  metaDescription: string | null;
  primaryKeyword: string;
  wordCount: number;
  createdAt: string;
};

export function SeoArticleClient({
  title,
  content,
  metaDescription,
  primaryKeyword,
  wordCount,
  createdAt,
}: SeoArticleClientProps) {
  const dateStr = new Date(createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const titleParts = title.split(":");
  const line1 = titleParts[0]?.trim() || title;
  const line2 = titleParts.slice(1).join(":").trim() || primaryKeyword;

  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge={`${wordCount} words · ${dateStr}`}
          titleLine1={line1}
          titleLine2={line2}
          description={metaDescription ?? undefined}
          backgroundImage={HERO_IMAGES.seoArticle}
        />
      }
      overlap={false}
    >
      <article className="max-w-3xl mx-auto px-6 py-12">
        <div
          className="paper-card rounded-2xl p-8 prose prose-sm max-w-none leading-relaxed"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </article>

      <MarketingCTA
        title="Generate articles like this for your brand."
        description="Set your voice once, then draft SEO-optimised content tailored to your audience."
        secondaryHref="/content-engine"
        secondaryLabel="Explore content engine →"
      />
    </MarketingPageShell>
  );
}
