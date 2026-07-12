"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { EditorialHeading } from "./editorial-heading";
import { fadeUp, fadeUpTransition, staggerContainer } from "@/lib/motion";

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
    <section className="py-24 relative overflow-hidden text-white bg-[var(--surface-dark)] border-t border-white/10">
      {backgroundImage && (
        <>
          <div
            className="absolute inset-0 bg-center bg-cover bg-no-repeat z-0"
            style={{ backgroundImage: `url(${backgroundImage})` }}
            aria-hidden
          />
          <div className="absolute inset-0 bg-black/60 z-0" aria-hidden />
        </>
      )}

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

        {children && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mb-12"
          >
            {children}
          </motion.div>
        )}

        {(primaryCta || secondaryCta) && (
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            transition={fadeUpTransition}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
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
          </motion.div>
        )}
      </div>
    </section>
  );
}
