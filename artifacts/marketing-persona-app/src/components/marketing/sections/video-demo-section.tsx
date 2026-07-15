"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { EditorialHeading } from "./editorial-heading";
import { useMarketingScrollReveal } from "@/hooks/use-marketing-scroll";
import {
  PRODUCT_CTA_HREF,
  PRODUCT_CTA_PRIMARY,
  PRODUCT_CTA_SECONDARY,
  PRODUCT_CTA_SECONDARY_HREF,
} from "@/lib/marketing/site/marketing-contact";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";

const TOUR_STEPS = ["Brand setup", "30-day plan", "Quality score", "CMS publish"];
const glassCard = cardSurfaceClass("glass", false);

const COLLAGE = [
  {
    src: HERO_IMAGES.contentEngine.hero,
    alt: "Content studio workflow",
    label: "Content studio",
    href: PRODUCT_CTA_SECONDARY_HREF,
    className: "sm:col-span-2 sm:row-span-2",
    sizes: "(max-width: 640px) 100vw, 66vw",
  },
  {
    src: HERO_IMAGES.features.hero,
    alt: "Article quality scoring",
    label: "Article quality",
    href: "/article-quality",
    className: "",
    sizes: "(max-width: 640px) 100vw, 33vw",
  },
  {
    src: HERO_IMAGES.roadmaps.hero,
    alt: "Content engine planning",
    label: "Content engine",
    href: "/content-engine",
    className: "",
    sizes: "(max-width: 640px) 100vw, 33vw",
  },
] as const;

export function VideoDemoSection() {
  const sectionRef = useRef<HTMLElement>(null);
  useMarketingScrollReveal(sectionRef);

  return (
    <section ref={sectionRef} className="py-20 bg-black border-t border-white/10">
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-12">
          <EditorialHeading
            line1="See it"
            line2="live"
            description="Skip the placeholder walkthrough. Try the article quality demo, tour the content studio, or start creating in your account."
            theme="dark"
          />
        </div>

        <div className={`scroll-reveal ${glassCard} overflow-hidden max-w-4xl mx-auto`}>
          <div className="grid sm:grid-cols-3 sm:grid-rows-2 sm:aspect-16/10 gap-px bg-white/10">
            {COLLAGE.map((tile) => (
              <Link
                key={tile.href}
                href={tile.href}
                className={`group relative aspect-4/3 sm:aspect-auto overflow-hidden bg-white/5 ${tile.className}`}
              >
                <Image
                  src={tile.src}
                  alt={tile.alt}
                  fill
                  sizes={tile.sizes}
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/25 to-transparent" />
                <span className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 text-sm font-medium text-white">
                  {tile.label}
                  <ArrowRight className="h-4 w-4 shrink-0 opacity-70 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
                </span>
              </Link>
            ))}
          </div>

          <div className="grid sm:grid-cols-4 gap-px bg-white/10">
            {TOUR_STEPS.map((step) => (
              <div key={step} className="bg-white/5 p-4 text-center text-sm font-medium text-white/65">
                {step}
              </div>
            ))}
          </div>
        </div>

        <div className="scroll-reveal mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/article-quality" className="hero-cta-primary inline-flex items-center">
            Try article quality demo <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Link
            href={PRODUCT_CTA_HREF}
            className="border border-white/30 bg-white/10 text-white hover:bg-white/20 text-sm font-medium px-7 py-3 rounded-full transition-all inline-flex items-center"
          >
            {PRODUCT_CTA_PRIMARY}
          </Link>
          <Link
            href={PRODUCT_CTA_SECONDARY_HREF}
            className="text-sm font-medium text-white/70 hover:text-white transition-colors inline-flex items-center px-2 py-3"
          >
            {PRODUCT_CTA_SECONDARY} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
