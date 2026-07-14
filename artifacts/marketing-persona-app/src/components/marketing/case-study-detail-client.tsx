"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, TrendingUp } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { MarketingSection } from "@/components/marketing/marketing-section";
import type { MarketingCaseStudy } from "@/lib/marketing/case-studies";
import { HERO_IMAGES } from "@/lib/marketing/marketing-hero-images";
import { CONTACT_CTA_PRIMARY, CONTACT_HREF } from "@/lib/marketing/marketing-contact";

export function CaseStudyDetailClient({ study }: { study: MarketingCaseStudy }) {
  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge={study.vertical}
          titleLine1={study.company}
          titleLine2={study.metric}
          description={study.summary}
          backgroundImage={HERO_IMAGES.roadmaps.hero}
          ctas={[
            { label: CONTACT_CTA_PRIMARY, href: CONTACT_HREF, variant: "primary" },
            { label: "All success stories", href: "/success-stories", variant: "ghost" },
          ]}
        />
      }
    >
      <MarketingSection variant="paper" bordered className="py-16 bg-background">
        <Link
          href="/success-stories"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> All success stories
        </Link>

        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{study.industry}</p>
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-5xl font-bold text-primary">{study.value}</span>
                <span className="text-muted-foreground">{study.period}</span>
              </div>
              {study.quote ? (
                <blockquote className="border-l-4 border-primary pl-4 text-muted-foreground italic">
                  &ldquo;{study.quote}&rdquo;
                  {study.quoteAuthor ? (
                    <footer className="mt-2 text-sm not-italic text-foreground">— {study.quoteAuthor}</footer>
                  ) : null}
                </blockquote>
              ) : null}
            </div>

            <div>
              <h2 className="text-lg font-bold mb-4">Methodology</h2>
              <ol className="space-y-3">
                {study.methodology.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="space-y-6">
            <div className="paper-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold">Before / after</h3>
              </div>
              <dl className="space-y-4">
                {study.metrics.map((m) => (
                  <div key={m.label}>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide">{m.label}</dt>
                    <dd className="flex items-baseline gap-2 mt-1">
                      <span className="text-sm text-muted-foreground line-through">{m.before}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="font-semibold text-primary">{m.after}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {study.verifyLinks && study.verifyLinks.length > 0 ? (
              <div className="paper-card p-6">
                <h3 className="font-bold mb-3">Verify & explore</h3>
                <ul className="space-y-2">
                  {study.verifyLinks.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-sm text-primary hover:underline">
                        {link.label} →
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        <div className="paper-card p-8 text-center max-w-xl mx-auto">
          <p className="font-medium mb-2">Want similar results?</p>
          <p className="text-sm text-muted-foreground mb-6">
            Book a discovery call — we scope consulting programs on goals.ac, not self-serve checkout.
          </p>
          <Link
            href={CONTACT_HREF}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-medium hover:opacity-90"
          >
            {CONTACT_CTA_PRIMARY} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  );
}
