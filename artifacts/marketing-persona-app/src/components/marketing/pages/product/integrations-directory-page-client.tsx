"use client";

import { useState } from "react";
import Link from "next/link";
import { PublishBrandIcon, type PublishBrandIconId } from "@workspace/app-shell/integrations";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import { DarkCTABand } from "@/components/marketing/sections/dark-cta-band";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import {
  CONTACT_HREF,
  PRODUCT_CTA_HREF,
  PRODUCT_CTA_PRIMARY,
} from "@/lib/marketing/site/marketing-contact";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";
import { cn } from "@/lib/utils";
import {
  hasIntegrationLander,
  integrationLanderPath,
} from "@/lib/marketing/content/integration-landers";
import {
  getCmsDestinations,
  getEspDestinations,
  PUBLISHING_DESTINATIONS,
} from "@/lib/projects/publishing-destinations";

const CATEGORY_LABELS = {
  cms: "CMS & headless",
  esp: "Email platforms",
  social: "Social OAuth",
  export: "Export formats",
} as const;

type CategoryKey = keyof typeof CATEGORY_LABELS;
type FilterKey = "all" | CategoryKey;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  ...(Object.entries(CATEGORY_LABELS) as [CategoryKey, string][]).map(([key, label]) => ({
    key,
    label,
  })),
];

const glassCard = cardSurfaceClass("glass", false);

function groupDestinations() {
  return [
    { key: "cms" as const, items: getCmsDestinations() },
    { key: "esp" as const, items: getEspDestinations() },
    {
      key: "social" as const,
      // Marketing hub shows every social publish target (incl. IG/FB/Bluesky).
      items: PUBLISHING_DESTINATIONS.filter((d) => d.category === "social"),
    },
    {
      key: "export" as const,
      items: PUBLISHING_DESTINATIONS.filter((d) => d.category === "export"),
    },
  ];
}

export function IntegrationsDirectoryPageClient() {
  const groups = groupDestinations();
  const [filter, setFilter] = useState<FilterKey>("all");
  const visible = filter === "all" ? groups : groups.filter((g) => g.key === filter);

  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="Integrations"
          titleLine1="Publish to"
          titleLine2="your stack"
          description="Connect the CMS, ESP, and social platforms you already use. Deep plugin and Admin API paths for WordPress, Ghost, and Shopify; Basic publish for headless and site builders."
          backgroundImage={HERO_IMAGES.contentEngine.hero}
          ctas={[
            { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF, variant: "primary" },
            { label: "CMS publishing", href: "/cms-publishing", variant: "ghost" },
          ]}
        />
      }
    >
      <MarketingSection bordered className="py-16">
        <div
          className="mb-8 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Integration categories"
        >
          {FILTERS.map((f) => {
            const count =
              f.key === "all"
                ? groups.reduce((n, g) => n + g.items.length, 0)
                : (groups.find((g) => g.key === f.key)?.items.length ?? 0);
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-white/30 bg-white text-black"
                    : "border-white/15 bg-white/5 text-white/75 hover:border-white/25 hover:bg-white/10 hover:text-white",
                )}
              >
                {f.label}
                <span className={cn("ml-1.5 tabular-nums", active ? "text-black/50" : "text-white/40")}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="space-y-10">
          {visible.map((group) => (
            <div key={group.key}>
              {filter === "all" ? (
                <h2 className="text-lg font-semibold mb-4 text-white">
                  {CATEGORY_LABELS[group.key]}
                </h2>
              ) : null}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.items.map((dest) => {
                  const landerHref = hasIntegrationLander(dest.id)
                    ? integrationLanderPath(dest.id)
                    : null;
                  const body = (
                    <>
                      <PublishBrandIcon
                        id={dest.id as PublishBrandIconId}
                        className="mt-0.5 h-8 w-8"
                      />
                      <div>
                        <p className="font-medium text-sm text-white">
                          {dest.label}
                          {landerHref ? (
                            <span className="ml-2 text-xs font-normal text-white/40">→</span>
                          ) : null}
                        </p>
                        <p className="text-xs text-white/65 mt-1">{dest.description}</p>
                      </div>
                    </>
                  );
                  return landerHref ? (
                    <Link
                      key={dest.id}
                      href={landerHref}
                      className={`${glassCard} p-4 flex items-start gap-3 transition-colors hover:bg-white/10`}
                    >
                      {body}
                    </Link>
                  ) : (
                    <div
                      key={dest.id}
                      className={`${glassCard} p-4 flex items-start gap-3`}
                    >
                      {body}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-white/65 mt-10">
          Basic publish destinations create content without full plugin depth (featured image, scheduling, and updates vary).{" "}
          Need a custom webhook or headless workflow?{" "}
          <Link href={CONTACT_HREF} className="text-primary hover:underline">
            Talk to us about your stack
          </Link>
          .
        </p>
      </MarketingSection>

      <DarkCTABand
        title="Connect your stack in the studio"
        description="Sign up, add OAuth or API credentials, and publish from one workspace. Demo depth on WordPress, Ghost, or Shopify."
        primaryCta={{ label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF }}
      />
    </MarketingPageShell>
  );
}
