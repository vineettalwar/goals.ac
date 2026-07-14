"use client";

import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { MarketingSection } from "@/components/marketing/marketing-section";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { FAQAccordion } from "@/components/marketing/faq-accordion";
import { DarkCTABand } from "@/components/marketing/dark-cta-band";
import { AutopilotUrlHero } from "@/components/marketing/autopilot-url-hero";
import { LANDER_CONFIG } from "@/lib/marketing/marketing-feature-data";
import { CONTACT_CTA_SECONDARY } from "@/lib/marketing/marketing-contact";

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
          ctas={[]}
        >
          <AutopilotUrlHero />
        </PageHero>
      }
    >
      <MarketingSection bordered className="py-20" titleLine1="How it" titleLine2="works">
        <FeatureGrid items={config.features} columns={2} />
      </MarketingSection>

      <DarkCTABand
        badge={CONTACT_CTA_SECONDARY}
        titleLine1="Need a full"
        titleLine2="GEO program?"
        description="Book a discovery call for strategy-first SEO, AEO, and GEO consulting — or start free with Content Autopilot above."
        backgroundImage={config.heroImage}
        primaryCta={{ label: "Start free with your URL", href: "/signup?from=content-autopilot" }}
        secondaryCta={{ label: "Book discovery call", href: "/contact" }}
      />

      <FAQAccordion titleLine1="Common" titleLine2="questions" items={config.faq} />
    </MarketingPageShell>
  );
}
