"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EditorialHeading } from "./editorial-heading";
import { MarketingReveal } from "@/components/marketing/motion/marketing-reveal";
import {
  PRODUCT_CTA_HREF,
  PRODUCT_CTA_PRIMARY,
} from "@/lib/marketing/site/marketing-contact";

type MarketingCTAProps = {
  badge?: string;
  title?: string;
  titleLine1?: string;
  titleLine2?: string;
  description: string;
  variant?: "paper" | "dark";
  backgroundImage?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function MarketingCTA({
  badge = "Content Studio",
  title,
  titleLine1,
  titleLine2,
  description,
  primaryHref = PRODUCT_CTA_HREF,
  primaryLabel = PRODUCT_CTA_PRIMARY,
  secondaryHref,
  secondaryLabel,
}: MarketingCTAProps) {
  const line1 = titleLine1 ?? title ?? "Put the next decision in writing";

  return (
    <section className="relative overflow-hidden border-t border-border bg-background py-24 text-foreground">
      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <MarketingReveal>
          <EditorialHeading
            line1={line1}
            line2={titleLine2}
            description={description}
            badge={badge}
            theme="light"
            animate={false}
            className="mb-10"
          />

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {primaryHref.startsWith("http") ? (
              <a href={primaryHref} className="hero-cta-primary inline-flex items-center">
                {primaryLabel} <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            ) : (
              <Link href={primaryHref} className="hero-cta-primary inline-flex items-center">
                {primaryLabel} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            )}
            {secondaryHref && secondaryLabel ? (
              <Link
                href={secondaryHref}
                className="inline-flex items-center text-sm font-medium text-foreground underline-offset-4 hover:underline"
              >
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
        </MarketingReveal>
      </div>
    </section>
  );
}
