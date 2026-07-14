"use client";

import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import { FeatureGrid } from "@/components/marketing/sections/feature-grid";
import { FAQAccordion } from "@/components/marketing/sections/faq-accordion";
import { DarkCTABand } from "@/components/marketing/sections/dark-cta-band";
import { MarketingCTA } from "@/components/marketing/sections/marketing-cta";
import { AutopilotUrlHero } from "@/components/marketing/heroes/autopilot-url-hero";
import { LANDER_CONFIG } from "@/lib/marketing/site/marketing-feature-data";
import { CONTACT_CTA_LABEL, PRODUCT_CTA_HREF, PRODUCT_CTA_PRIMARY } from "@/lib/marketing/site/marketing-contact";

const config = LANDER_CONFIG.autopilot;

export function ContentAutopilotClient() {
  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge={config.badge}
          titleLine1={config.titleLine1}
          titleLine2={config.titleLine2}
          description={config.description}
          backgroundImage={config.heroImage}
          ctas={[
            { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF, variant: "primary" },
            { label: "Compare tools", href: "/compare/ai-seo-tools", variant: "ghost" },
          ]}
        >
          <AutopilotUrlHero />
        </PageHero>
      }
    >
      <MarketingSection bordered className="py-20" titleLine1="How it" titleLine2="works">
        <FeatureGrid items={config.features} columns={2} />
      </MarketingSection>

      <DarkCTABand
        badge="Consulting program"
        titleLine1="Ready for a full"
        titleLine2="GEO program?"
        description="Autopilot is one piece of a scoped engagement: strategy, editorial review, CMS setup, and AI visibility tracking included."
        primaryCta={{ label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF }}
        secondaryCta={{ label: "View engagements", href: "/pricing" }}
      />

      <FAQAccordion titleLine1="Common" titleLine2="questions" items={config.faq} />

      <MarketingCTA
        titleLine1="See what fits"
        titleLine2="your team"
        description="Sign up free and turn on autopilot when you're ready. Choose your cadence, CMS, and review workflow."
        variant="dark"
        secondaryHref="/geo-audit"
        secondaryLabel="Run free GEO audit →"
      />
    </MarketingPageShell>
  );
}
