"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fadeUp, fadeUpTransition } from "@/lib/motion";

type DarkCTABandProps = {
  badge?: string;
  title: string;
  description?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  children?: React.ReactNode;
};

export function DarkCTABand({
  badge,
  title,
  description,
  primaryCta,
  secondaryCta,
  children,
}: DarkCTABandProps) {
  return (
    <section className="py-24 bg-[var(--surface-dark)] text-white border-t border-white/10">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          transition={fadeUpTransition}
          className="text-center mb-14"
        >
          {badge && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 mb-4">
              {badge}
            </div>
          )}
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">{title}</h2>
          {description && (
            <p className="text-lg text-white/70 max-w-2xl mx-auto">{description}</p>
          )}
        </motion.div>

        {children}

        {(primaryCta || secondaryCta) && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            {primaryCta && (
              <Button asChild size="lg" className="h-12 px-8">
                <Link href={primaryCta.href}>
                  {primaryCta.label} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
            {secondaryCta && (
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 px-8 border-white/20 bg-transparent text-white hover:bg-white/10"
              >
                <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
