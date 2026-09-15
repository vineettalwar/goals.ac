"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EditorialHeading } from "./editorial-heading";
import { MarketingReveal } from "@/components/marketing/motion/marketing-reveal";

type DarkCTABandProps = {
  badge?: string;
  title?: string;
  titleLine1?: string;
  titleLine2?: string;
  description?: string;
  backgroundImage?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  children?: React.ReactNode;
};

export function DarkCTABand({
  badge,
  title,
  titleLine1,
  titleLine2,
  description,
  primaryCta,
  secondaryCta,
  children,
}: DarkCTABandProps) {
  const line1 = titleLine1 ?? title ?? "";

  return (
    <section className="relative border-t border-border bg-background py-24 text-foreground">
      <div className="relative mx-auto max-w-5xl px-6">
        <div className="mb-14 text-center">
          <EditorialHeading
            line1={line1}
            line2={titleLine2}
            description={description}
            badge={badge}
            theme="light"
          />
        </div>

        {children ? <MarketingReveal className="mb-12">{children}</MarketingReveal> : null}

        {(primaryCta || secondaryCta) ? (
          <MarketingReveal className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            {primaryCta ? (
              <Link href={primaryCta.href} className="hero-cta-primary inline-flex items-center">
                {primaryCta.label} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            ) : null}
            {secondaryCta ? (
              <Link
                href={secondaryCta.href}
                className="inline-flex items-center text-sm font-medium text-foreground underline-offset-4 hover:underline"
              >
                {secondaryCta.label}
              </Link>
            ) : null}
          </MarketingReveal>
        ) : null}
      </div>
    </section>
  );
}
