"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import type { LearnPost } from "@/lib/marketing/content/learn-posts";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";

const glassCard = cardSurfaceClass("glass", false);

export function LearnPostClient({ post }: { post: LearnPost }) {
  const paragraphs = post.body.split("\n\n");

  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="Learn"
          titleLine1={post.title.split(" ").slice(0, Math.ceil(post.title.split(" ").length / 2)).join(" ")}
          titleLine2={post.title.split(" ").slice(Math.ceil(post.title.split(" ").length / 2)).join(" ") || undefined}
          description={post.description}
          backgroundImage={HERO_IMAGES.about.hero}
          ctas={[{ label: post.cta.label, href: post.cta.href, variant: "primary" }]}
        />
      }
    >
      <MarketingSection className="py-16">
        <Link href="/learn" className="inline-flex items-center gap-1 text-sm text-white/65 hover:text-white mb-8">
          <ArrowLeft className="h-4 w-4" /> All guides
        </Link>
        <article className={`${glassCard} p-8 marketing-prose-dark max-w-3xl mx-auto`}>
          {paragraphs.map((para) => (
            <p key={para.slice(0, 64)} className="text-white/65 leading-relaxed mb-4 whitespace-pre-wrap">
              {para.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
                part.startsWith("**") && part.endsWith("**") ? (
                  <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>
                ) : (
                  part
                ),
              )}
            </p>
          ))}
        </article>
        <div className={`max-w-3xl mx-auto mt-12 ${glassCard} p-6 text-center`}>
          <p className="font-medium mb-4 text-white">Ready to apply this?</p>
          <Link href={post.cta.href} className="hero-cta-primary inline-flex items-center gap-2">
            {post.cta.label}
          </Link>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  );
}
