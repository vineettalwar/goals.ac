"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { PublishBrandIcon } from "@workspace/app-shell/integrations";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import { FAQAccordion } from "@/components/marketing/sections/faq-accordion";
import { DarkCTABand } from "@/components/marketing/sections/dark-cta-band";
import { MarketingReveal } from "@/components/marketing/motion/marketing-reveal";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import {
  CONTACT_CTA_LABEL,
  CONTACT_HREF,
  PRODUCT_CTA_HREF,
  PRODUCT_CTA_PRIMARY,
} from "@/lib/marketing/site/marketing-contact";
import {
  getIntegrationLander,
  integrationLanderPath,
  type IntegrationLander,
} from "@/lib/marketing/content/integration-landers";

export function IntegrationLanderPageClient({ lander }: { lander: IntegrationLander }) {
  const related = lander.relatedSlugs
    .map((slug) => getIntegrationLander(slug))
    .filter((x): x is IntegrationLander => !!x);

  return (
    <MarketingPageShell
      hero={
        <PageHero
          titleLine1={lander.titleLine1}
          titleLine2={lander.titleLine2}
          description={lander.description}
          backgroundImage={HERO_IMAGES.contentEngine.hero}
          lead={
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:h-20 sm:w-20">
                <PublishBrandIcon id={lander.brandId} className="h-10 w-10 sm:h-12 sm:w-12" />
              </div>
              <p className="text-sm font-medium tracking-wide text-white/85">
                {lander.label}
                <span className="mx-2 text-white/35" aria-hidden>
                  ·
                </span>
                <span className="text-white/60">{lander.depthLabel}</span>
              </p>
            </div>
          }
          ctas={[
            { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF, variant: "primary" },
            { label: "All integrations", href: "/integrations", variant: "ghost" },
          ]}
        />
      }
    >
      <MarketingSection variant="paper" className="py-20 md:py-28" bordered={false}>
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-16">
          <MarketingReveal>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              How you connect
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {lander.label}
              <span className="mt-1 block font-playfair italic font-normal text-foreground/80">
                on your terms
              </span>
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
              Pick the depth that matches your stack — then publish from Content Studio without leaving goals.ac.
            </p>
          </MarketingReveal>

          <MarketingReveal delayMs={80}>
            <ul className="space-y-0 divide-y divide-border border-y border-border">
              {lander.connectMethods.map((method) => (
                <li key={method} className="flex gap-3 py-5 text-base leading-relaxed text-foreground">
                  <Check
                    className="mt-1 h-4 w-4 shrink-0 text-primary"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                  <span>{method}</span>
                </li>
              ))}
            </ul>
          </MarketingReveal>
        </div>
      </MarketingSection>

      <MarketingSection
        bordered
        className="py-20 md:py-28"
        titleLine1="What goals.ac"
        titleLine2={`does on ${lander.label}`}
        description="Product capabilities for this destination — not a generic CMS glossary."
      >
        <div className="mx-auto max-w-3xl">
          {lander.capabilities.map((cap, i) => (
            <MarketingReveal key={cap.title} delayMs={i * 60}>
              <article
                className={`py-8 ${i < lander.capabilities.length - 1 ? "border-b border-white/10" : ""}`}
              >
                <h3 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  {cap.title}
                </h3>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/70">{cap.body}</p>
              </article>
            </MarketingReveal>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection
        variant="paper"
        className="py-20 md:py-28"
        bordered={false}
        titleLine1="Setup"
        titleLine2="in minutes"
      >
        <MarketingReveal>
          <ol className="mx-auto flex max-w-xl flex-col gap-5">
            {lander.setupSteps.map((step, i) => (
              <li key={step} className="flex gap-3.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <p className="text-base leading-snug text-foreground">{step}</p>
              </li>
            ))}
          </ol>
        </MarketingReveal>
      </MarketingSection>

      <MarketingSection
        bordered
        className="py-20 md:py-28"
        titleLine1="Formats that"
        titleLine2="publish here"
      >
        <ul className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-8 sm:gap-y-3">
          {lander.formats.map((format) => (
            <li
              key={format}
              className="flex items-center gap-2 text-base text-white/85 sm:justify-center"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--accent-warm)" aria-hidden />
              {format}
            </li>
          ))}
        </ul>
      </MarketingSection>

      <FAQAccordion
        titleLine1={lander.label}
        titleLine2="questions"
        items={lander.faq}
      />

      {related.length > 0 ? (
        <MarketingSection
          variant="paper"
          className="py-20 md:py-28"
          bordered={false}
          titleLine1="Related"
          titleLine2="integrations"
        >
          <div className="mx-auto grid max-w-4xl gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={integrationLanderPath(r.slug)}
                className="group flex items-start gap-4 bg-card p-6 transition-colors hover:bg-secondary"
              >
                <PublishBrandIcon id={r.brandId} className="mt-0.5 h-9 w-9 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground group-hover:text-primary">{r.label}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.metaDescription}</p>
                </div>
              </Link>
            ))}
            <Link
              href="/integrations"
              className="flex items-center gap-2 bg-card p-6 text-sm font-medium text-foreground transition-colors hover:bg-secondary hover:text-primary sm:col-span-2 lg:col-span-1"
            >
              Browse all
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </MarketingSection>
      ) : null}

      <DarkCTABand
        title={`Connect ${lander.label} in the studio`}
        description={`Sign up, add your ${lander.label} credentials, and publish the next SEO draft without leaving goals.ac.`}
        primaryCta={{ label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF }}
        secondaryCta={{ label: CONTACT_CTA_LABEL, href: CONTACT_HREF }}
      />
    </MarketingPageShell>
  );
}
