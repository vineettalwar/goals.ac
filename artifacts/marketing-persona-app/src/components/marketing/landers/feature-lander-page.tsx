"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import { FeatureGrid, type FeatureItem } from "@/components/marketing/sections/feature-grid";
import { FAQAccordion } from "@/components/marketing/sections/faq-accordion";
import { DarkCTABand } from "@/components/marketing/sections/dark-cta-band";
import { FeatureStatusBadge, type FeatureStatus } from "@/components/shared/feature-status-badge";
import { WaitlistForm } from "@/components/shared/waitlist-form";
import { LANDER_CONFIG } from "@/lib/marketing/site/marketing-feature-data";
import { CONTACT_CTA_LABEL, PRODUCT_CTA_PRIMARY } from "@/lib/marketing/site/marketing-contact";

export type LanderConfigKey = keyof typeof LANDER_CONFIG;

export function FeatureLanderByKey({
  configKey,
  middleContent,
}: {
  configKey: LanderConfigKey;
  middleContent?: ReactNode;
}) {
  return <FeatureLanderPage {...LANDER_CONFIG[configKey]} middleContent={middleContent} />;
}

export type FeatureLanderProps = {
  badge: string;
  status?: FeatureStatus;
  titleLine1: string;
  titleLine2: string;
  description: string;
  heroImage: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  features: FeatureItem[];
  faq: { question: string; answer: string }[];
  waitlistKey?: string;
  waitlistTitle?: string;
  middleContent?: ReactNode;
};

export function FeatureLanderPage({
  badge,
  status,
  titleLine1,
  titleLine2,
  description,
  heroImage,
  primaryCta,
  secondaryCta,
  features,
  faq,
  waitlistKey,
  waitlistTitle,
  middleContent,
}: FeatureLanderProps) {
  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge={status ? `${badge} · ${status === "beta" ? "Beta" : status === "coming-soon" ? "Coming soon" : "Live"}` : badge}
          titleLine1={titleLine1}
          titleLine2={titleLine2}
          description={description}
          backgroundImage={heroImage}
          ctas={[
            { label: primaryCta.label, href: primaryCta.href, variant: "primary" },
            ...(secondaryCta ? [{ label: secondaryCta.label, href: secondaryCta.href, variant: "ghost" as const }] : []),
          ]}
        />
      }
    >
      <MarketingSection bordered className="py-20" titleLine1="How it" titleLine2="works">
        <FeatureGrid items={features} columns={features.length <= 4 ? 2 : 3} />
      </MarketingSection>

      {middleContent}

      {waitlistKey && (
        <MarketingSection
          className="py-16"
          titleLine1={waitlistTitle ?? "Get early access"}
          titleLine2="Join the waitlist"
          description="We're building this next. Leave your email and we'll notify you at launch."
        >
          <div className="flex justify-center">
            <WaitlistForm featureKey={waitlistKey} variant="dark" />
          </div>
        </MarketingSection>
      )}

      <DarkCTABand
        badge="Content Studio"
        titleLine1="Ready to"
        titleLine2="start creating?"
        description="Sign up free, connect your CMS, and publish research-driven content across every channel."
        primaryCta={{ label: primaryCta.label, href: primaryCta.href }}
        secondaryCta={secondaryCta ?? { label: CONTACT_CTA_LABEL, href: "/contact" }}
      />

      <FAQAccordion titleLine1="Common" titleLine2="questions" items={faq} />
    </MarketingPageShell>
  );
}

export type { LucideIcon };
