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
import { PRODUCT_CTA_HREF, PRODUCT_CTA_PRIMARY } from "@/lib/marketing/site/marketing-contact";

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
            {
              label: config.secondaryCta?.label ?? "See Content Studio",
              href: config.secondaryCta?.href ?? "/content-engine",
              variant: "ghost",
            },
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
        badge="Optional programs"
        titleLine1="Need hands-on"
        titleLine2="GEO help?"
        description="Autopilot works self-serve inside Content Studio. Scoped GEO programs add strategy, editorial review, and AI visibility tracking when you want a team alongside the product."
        primaryCta={{ label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF }}
        secondaryCta={{ label: "See Content Studio", href: "/content-engine" }}
      />

      <FAQAccordion titleLine1="Common" titleLine2="questions" items={config.faq} />

      <MarketingCTA
        titleLine1="See what fits"
        titleLine2="your team"
        description="Sign up free and turn on autopilot when you're ready. Choose your cadence, CMS, and review workflow."
        variant="dark"
        secondaryHref="/content-engine"
        secondaryLabel="See Content Studio →"
      />
    </MarketingPageShell>
  );
}
