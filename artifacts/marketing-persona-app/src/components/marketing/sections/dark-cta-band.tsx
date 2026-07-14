"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EditorialHeading } from "./editorial-heading";
import { HeroPhotoBg } from "../heroes/hero-photo-bg";
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
  backgroundImage,
  primaryCta,
  secondaryCta,
  children,
}: DarkCTABandProps) {
  const line1 = titleLine1 ?? title ?? "";

  return (
    <section className="py-24 relative overflow-hidden text-white bg-black border-t border-white/10">
      {backgroundImage && <HeroPhotoBg image={backgroundImage} overlayClass="bg-black/60" />}

      <div className="relative z-20 max-w-5xl mx-auto px-6">
        <div className="text-center mb-14">
          <EditorialHeading
            line1={line1}
            line2={titleLine2}
            description={description}
            badge={badge}
            theme="dark"
          />
        </div>

        {children && <MarketingReveal className="mb-12">{children}</MarketingReveal>}

        {(primaryCta || secondaryCta) && (
          <MarketingReveal className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {primaryCta && (
              <Link href={primaryCta.href} className="hero-cta-primary inline-flex items-center">
                {primaryCta.label} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            )}
            {secondaryCta && (
              <Link
                href={secondaryCta.href}
                className="border border-white/30 bg-white/10 text-white hover:bg-white/20 text-sm font-medium px-7 py-3 rounded-full transition-all inline-flex items-center"
              >
                {secondaryCta.label}
              </Link>
            )}
          </MarketingReveal>
        )}
      </div>
    </section>
  );
}
