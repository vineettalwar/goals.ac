"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fadeUp, fadeUpTransition } from "@/lib/motion";

type MarketingCTAProps = {
  badge?: string;
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function MarketingCTA({
  badge = "For lean B2B teams",
  title,
  description,
  primaryHref = "/signup",
  primaryLabel = "Start for free",
  secondaryHref,
  secondaryLabel,
}: MarketingCTAProps) {
  return (
    <section className="py-28 bg-background border-t border-[--border]">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          transition={fadeUpTransition}
        >
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary mb-6">
            <Target className="h-3 w-3" />
            {badge}
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-5">{title}</h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            {description}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="h-12 px-8">
              <Link href={primaryHref}>
                {primaryLabel} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            {secondaryHref && secondaryLabel && (
              <Button asChild variant="ghost" size="lg" className="h-12 px-8">
                <Link href={secondaryHref}>{secondaryLabel}</Link>
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
