"use client";

import Link from "next/link";
import { Plug } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import { DarkCTABand } from "@/components/marketing/sections/dark-cta-band";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import { CONTACT_CTA_LABEL, CONTACT_HREF, PRODUCT_CTA_HREF, PRODUCT_CTA_PRIMARY } from "@/lib/marketing/site/marketing-contact";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";
import {
  getCmsDestinations,
  getEspDestinations,
  getSocialDestinations,
  PUBLISHING_DESTINATIONS,
} from "@/lib/projects/publishing-destinations";

const CATEGORY_LABELS = {
  cms: "CMS & headless",
  esp: "Email platforms",
  social: "Social OAuth",
  export: "Export formats",
} as const;

const glassCard = cardSurfaceClass("glass", false);

function groupDestinations() {
  return [
    { key: "cms" as const, items: getCmsDestinations() },
    { key: "esp" as const, items: getEspDestinations() },
    { key: "social" as const, items: getSocialDestinations() },
    {
      key: "export" as const,
      items: PUBLISHING_DESTINATIONS.filter((d) => d.category === "export"),
    },
  ];
}

export function IntegrationsDirectoryPageClient() {
  const total = PUBLISHING_DESTINATIONS.length;
  const groups = groupDestinations();

  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="Integrations"
          titleLine1="Publish to"
          titleLine2={`${total}+ destinations`}
          description="Connect the CMS, ESP, and social platforms you already use. goals.ac renders content for each destination: Gutenberg, Elementor, headless fields, and more."
          backgroundImage={HERO_IMAGES.contentEngine.hero}
          ctas={[
            { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF, variant: "primary" },
            { label: "CMS publishing", href: "/cms-publishing", variant: "ghost" },
          ]}
        />
      }
    >
      <MarketingSection bordered className="py-16">
        <div className="space-y-10">
          {groups.map((group) => (
            <div key={group.key}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                <Plug className="h-4 w-4 text-primary" />
                {CATEGORY_LABELS[group.key]}
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.items.map((dest) => (
                  <div
                    key={dest.id}
                    className={`${glassCard} p-4 flex items-start gap-3`}
                  >
                    <span
                      className={`mt-0.5 h-2.5 w-2.5 rounded-full shrink-0 ${dest.listColorClassName ?? "bg-primary"}`}
                    />
                    <div>
                      <p className="font-medium text-sm text-white">{dest.label}</p>
                      <p className="text-xs text-white/65 mt-1">{dest.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-white/65 mt-10">
          Need a custom webhook or headless workflow?{" "}
          <Link href={CONTACT_HREF} className="text-primary hover:underline">
            Talk to us about your stack
          </Link>
          .
        </p>
      </MarketingSection>

      <DarkCTABand
        title="Connect your stack in the studio"
        description="Sign up, add OAuth or API credentials, and publish to every destination from one workspace."
        primaryCta={{ label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF }}
      />
    </MarketingPageShell>
  );
}
