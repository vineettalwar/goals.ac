"use client";

import Link from "next/link";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { EditorialHeading } from "./editorial-heading";
import { HeroPhotoBg } from "../heroes/hero-photo-bg";
import { fadeUp, fadeUpTransition } from "@/lib/utils/motion";
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
  variant = "dark",
  backgroundImage,
  primaryHref = PRODUCT_CTA_HREF,
  primaryLabel = PRODUCT_CTA_PRIMARY,
  secondaryHref,
  secondaryLabel,
}: MarketingCTAProps) {
  const line1 = titleLine1 ?? title ?? "Put the next decision in writing";
  const isDark = variant === "dark";

  return (
    <LazyMotion features={domAnimation} strict>
      <section
        className={`py-28 relative overflow-hidden border-t ${
          isDark ? "text-white bg-black border-white/10" : "bg-background text-foreground border-border"
        }`}
      >
        {isDark && backgroundImage && <HeroPhotoBg image={backgroundImage} />}

        <div className="relative z-20 max-w-4xl mx-auto px-6 text-center">
          <m.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            transition={fadeUpTransition}
          >
            <EditorialHeading
              line1={line1}
              line2={titleLine2}
              description={description}
              badge={badge}
              theme={isDark ? "dark" : "light"}
              animate={false}
              className="mb-10"
            />

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
              <Link href={primaryHref} className="hero-cta-primary inline-flex items-center">
                {primaryLabel} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              {secondaryHref && secondaryLabel && (
                <Link
                  href={secondaryHref}
                  className={`text-sm font-medium px-7 py-3 rounded-full transition-all inline-flex items-center ${
                    isDark
                      ? "border border-white/30 bg-white/10 text-white hover:bg-white/20"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {secondaryLabel}
                </Link>
              )}
            </div>
          </m.div>
        </div>
      </section>
    </LazyMotion>
  );
}
