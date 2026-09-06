"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { RevealLayer } from "./reveal-layer";

const SPOTLIGHT_R = 260;

function ctaButtonClass(variant: HeroCta["variant"]) {
  return variant === "ghost"
    ? "border border-white/30 bg-white/10 text-white hover:bg-white/20 text-sm font-medium px-7 py-3 rounded-full transition-all"
    : "bg-(--accent-warm) hover:bg-(--accent-warm-hover) text-(--accent-warm-foreground) text-sm font-medium px-7 py-3 rounded-full transition-all hover:scale-[1.03] active:scale-95 hover:shadow-lg hover:shadow-(--accent-warm)/30";
}

function renderHeroCta(cta: HeroCta, key: string) {
  const className = ctaButtonClass(cta.variant ?? "primary");
  if (cta.onClick) {
    return (
      <button key={key} type="button" onClick={cta.onClick} className={className}>
        {cta.label}
      </button>
    );
  }
  if (cta.href?.startsWith("http://") || cta.href?.startsWith("https://")) {
    return (
      <a key={key} href={cta.href} className={className}>
        {cta.label}
      </a>
    );
  }
  if (cta.href?.startsWith("#")) {
    return (
      <a key={key} href={cta.href} className={className}>
        {cta.label}
      </a>
    );
  }
  return (
    <Link key={key} href={cta.href ?? "#"} className={className}>
      {cta.label}
    </Link>
  );
}

export type HeroCta = {
  label: string;
  href?: string;
  variant?: "primary" | "ghost";
  onClick?: () => void;
};

export type PageHeroProps = {
  badge?: string;
  /** Renders above the title (e.g. brand mark). */
  lead?: ReactNode;
  titleLine1: string;
  titleLine2?: string;
  description?: string;
  leftDescription?: string;
  ctas?: HeroCta[];
  backgroundImage?: string;
  spotlightImage?: string;
  enableSpotlight?: boolean;
  layout?: "home" | "centered";
  persistCtas?: boolean;
  overlay?: ReactNode;
  children?: ReactNode;
};

export function PageHero({
  badge,
  lead,
  titleLine1,
  titleLine2,
  description,
  leftDescription,
  ctas = [],
  backgroundImage,
  spotlightImage,
  enableSpotlight,
  layout = "centered",
  persistCtas = false,
  overlay,
  children,
}: PageHeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [heroScrolled, setHeroScrolled] = useState(false);
  // Opt-in only — defaulting on for every hero ran a full-viewport RAF + second image load.
  const spotlightEnabled = enableSpotlight === true;
  const resolvedSpotlightImage = spotlightImage ?? backgroundImage;
  const useEnhance = Boolean(backgroundImage && !spotlightImage);

  useEffect(() => {
    const onScroll = () => setHeroScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden h-screen bg-black font-sans"
      style={{ height: "100dvh" }}
    >
      {backgroundImage && (
        <Image
          src={backgroundImage}
          alt=""
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="absolute inset-0 object-cover z-10 hero-zoom"
          aria-hidden
        />
      )}

      {spotlightEnabled && resolvedSpotlightImage && (
        <RevealLayer
          image={resolvedSpotlightImage}
          radius={SPOTLIGHT_R}
          enhance={useEnhance}
          containerRef={sectionRef}
        />
      )}

      <div className="absolute inset-0 bg-black/30 z-20 pointer-events-none" aria-hidden />

      {layout === "home" ? (
        <>
          {/* Title vertically centered; pb clears the bottom CTA band below lg. */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-5 pointer-events-none z-50 pb-44 sm:pb-48 lg:pb-0">
            <h1 className="text-white leading-[1.08] w-full max-w-5xl">
              <span
                className="block font-playfair italic font-normal text-[clamp(2.25rem,5.5vw+1rem,5.25rem)] tracking-tight hero-anim hero-reveal"
                style={{ animationDelay: "0.25s" }}
              >
                {titleLine1}
              </span>
              {titleLine2 && (
                <span
                  className="block font-normal text-[clamp(2.25rem,5.5vw+1rem,5.25rem)] tracking-tight hero-anim hero-reveal"
                  style={{ animationDelay: "0.42s" }}
                >
                  {titleLine2}
                </span>
              )}
            </h1>
          </div>

          {/* Corner copy only when the viewport has room for the split layout. */}
          {leftDescription && (
            <div
              className="hidden lg:block absolute bottom-14 left-10 xl:left-14 max-w-65 z-50 pointer-events-none hero-anim hero-fade"
              style={{ animationDelay: "0.7s" }}
            >
              <p className="text-sm text-white/90 leading-relaxed">{leftDescription}</p>
            </div>
          )}

          <div
            className={`absolute bottom-10 left-5 right-5 max-w-md lg:bottom-24 lg:left-auto lg:right-10 xl:right-14 lg:max-w-65 flex flex-col items-start gap-4 z-50 hero-anim hero-fade transition-opacity duration-300 ${
              heroScrolled && !persistCtas ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
            style={{ animationDelay: "0.85s" }}
          >
            {description && (
              <p className="text-sm text-white/90 leading-relaxed pointer-events-none">
                {description}
              </p>
            )}
            {ctas.map((cta) => renderHeroCta(cta, cta.label))}
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 z-50 pt-16">
          {lead ? (
            <div className="mb-6 hero-anim hero-fade" style={{ animationDelay: "0.1s" }}>
              {lead}
            </div>
          ) : null}
          {badge && (
            <div
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/80 mb-6 tracking-wide uppercase hero-anim hero-fade"
              style={{ animationDelay: "0.15s" }}
            >
              {badge}
            </div>
          )}
          <h1 className="text-white leading-[1.08] max-w-4xl w-full">
            <span
              className="block font-playfair italic font-normal text-[clamp(1.75rem,3.5vw+0.85rem,3.75rem)] tracking-tight hero-anim hero-reveal"
              style={{ animationDelay: "0.25s" }}
            >
              {titleLine1}
            </span>
            {titleLine2 && (
              <span
                className="block font-normal text-[clamp(1.75rem,3.5vw+0.85rem,3.75rem)] tracking-tight hero-anim hero-reveal"
                style={{ animationDelay: "0.38s" }}
              >
                {titleLine2}
              </span>
            )}
          </h1>
          {description && (
            <p
              className="mt-6 text-base sm:text-lg text-white/90 max-w-2xl leading-relaxed hero-anim hero-fade"
              style={{ animationDelay: "0.5s" }}
            >
              {description}
            </p>
          )}
          {overlay && (
            <div className="mt-6 hero-anim hero-fade" style={{ animationDelay: "0.55s" }}>
              {overlay}
            </div>
          )}
          {ctas.length > 0 && (
            <div
              className={`mt-8 flex flex-col sm:flex-row items-center gap-3 hero-anim hero-fade transition-opacity duration-300 ${
                heroScrolled && !persistCtas ? "opacity-0 pointer-events-none" : "opacity-100"
              }`}
              style={{ animationDelay: "0.6s" }}
            >
              {ctas.map((cta) => renderHeroCta(cta, cta.label))}
            </div>
          )}
          {children}
        </div>
      )}

      <div
        className="absolute bottom-0 left-0 right-0 h-32 sm:h-40 hero-bridge pointer-events-none z-40"
        aria-hidden
      />
    </section>
  );
}
