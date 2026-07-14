"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { MarketingSection } from "@/components/marketing/marketing-section";
import type { LearnPost } from "@/lib/marketing/learn-posts";
import { HERO_IMAGES } from "@/lib/marketing/marketing-hero-images";

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
          backgroundImage={HERO_IMAGES.about.mission}
          ctas={[{ label: post.cta.label, href: post.cta.href, variant: "primary" }]}
        />
      }
    >
      <MarketingSection variant="paper" className="py-16 bg-background">
        <Link href="/learn" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> All guides
        </Link>
        <article className="prose prose-neutral max-w-3xl mx-auto">
          {paragraphs.map((para, i) => (
            <p key={i} className="text-muted-foreground leading-relaxed mb-4 whitespace-pre-wrap">
              {para.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
                part.startsWith("**") && part.endsWith("**") ? (
                  <strong key={j} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>
                ) : (
                  part
                ),
              )}
            </p>
          ))}
        </article>
        <div className="max-w-3xl mx-auto mt-12 paper-card p-6 text-center">
          <p className="font-medium mb-4">Ready to apply this?</p>
          <Link href={post.cta.href} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-medium hover:opacity-90">
            {post.cta.label}
          </Link>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  );
}
