"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MarketingNav } from "./marketing-nav";
import { RevealLayer } from "./reveal-layer";

const SPOTLIGHT_R = 260;

export type HeroCta = {
  label: string;
  href?: string;
  variant?: "primary" | "ghost";
  onClick?: () => void;
};

export type PageHeroProps = {
  badge?: string;
  titleLine1: string;
  titleLine2?: string;
  description?: string;
  leftDescription?: string;
  ctas?: HeroCta[];
  backgroundImage?: string;
  spotlightImage?: string;
  enableSpotlight?: boolean;
  layout?: "home" | "centered";
  overlay?: ReactNode;
  children?: ReactNode;
};

export function PageHero({
  badge,
  titleLine1,
  titleLine2,
  description,
  leftDescription,
  ctas = [],
  backgroundImage,
  spotlightImage,
  enableSpotlight = false,
  layout = "centered",
  overlay,
  children,
}: PageHeroProps) {
  const mouse = useRef({ x: -999, y: -999 });
  const smooth = useRef({ x: -999, y: -999 });
  const rafRef = useRef<number | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: -999, y: -999 });

  useEffect(() => {
    if (!enableSpotlight) return;

    const updatePosition = (clientX: number, clientY: number) => {
      mouse.current = { x: clientX, y: clientY };
    };

    const onMouseMove = (e: MouseEvent) => updatePosition(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) updatePosition(touch.clientX, touch.clientY);
    };

    const tick = () => {
      smooth.current.x += (mouse.current.x - smooth.current.x) * 0.1;
      smooth.current.y += (mouse.current.y - smooth.current.y) * 0.1;
      setCursorPos({ x: smooth.current.x, y: smooth.current.y });
      rafRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [enableSpotlight]);

  const ctaButtonClass = (variant: HeroCta["variant"]) =>
    variant === "ghost"
      ? "border border-white/30 bg-white/10 text-white hover:bg-white/20 text-sm font-medium px-7 py-3 rounded-full transition-all"
      : "bg-(--accent-warm) hover:bg-(--accent-warm-hover) text-white text-sm font-medium px-7 py-3 rounded-full transition-all hover:scale-[1.03] active:scale-95 hover:shadow-lg hover:shadow-(--accent-warm)/30";

  const renderCta = (cta: HeroCta, key: string) => {
    const className = ctaButtonClass(cta.variant ?? "primary");
    if (cta.onClick) {
      return (
        <button key={key} type="button" onClick={cta.onClick} className={className}>
          {cta.label}
        </button>
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
  };

  return (
    <section
      className="relative w-full overflow-hidden h-screen bg-black font-sans"
      style={{ height: "100dvh" }}
    >
      {backgroundImage && (
        <div
          className="absolute inset-0 bg-center bg-cover bg-no-repeat z-10 hero-zoom"
          style={{ backgroundImage: `url(${backgroundImage})` }}
          aria-hidden
        />
      )}

      {enableSpotlight && spotlightImage && (
        <RevealLayer
          image={spotlightImage}
          cursorX={cursorPos.x}
          cursorY={cursorPos.y}
          radius={SPOTLIGHT_R}
        />
      )}

      <div className="absolute inset-0 bg-black/30 z-20 pointer-events-none" aria-hidden />

      <MarketingNav />

      {layout === "home" ? (
        <>
          <div className="absolute top-[14%] left-0 right-0 flex flex-col items-center text-center px-5 pointer-events-none z-50">
            <h1 className="text-white leading-[0.95]">
              <span
                className="block font-playfair italic font-normal text-5xl sm:text-7xl md:text-8xl hero-anim hero-reveal"
                style={{ letterSpacing: "-0.05em", animationDelay: "0.25s" }}
              >
                {titleLine1}
              </span>
              {titleLine2 && (
                <span
                  className="block font-normal text-5xl sm:text-7xl md:text-8xl -mt-1 hero-anim hero-reveal"
                  style={{ letterSpacing: "-0.08em", animationDelay: "0.42s" }}
                >
                  {titleLine2}
                </span>
              )}
            </h1>
          </div>

          {leftDescription && (
            <div
              className="hidden sm:block absolute bottom-14 left-10 md:left-14 max-w-[260px] z-50 pointer-events-none hero-anim hero-fade"
              style={{ animationDelay: "0.7s" }}
            >
              <p className="text-sm text-white/80 leading-relaxed">{leftDescription}</p>
            </div>
          )}

          <div
            className="absolute bottom-10 sm:bottom-24 left-5 right-5 sm:left-auto sm:right-10 md:right-14 max-w-full sm:max-w-[260px] flex flex-col items-start gap-4 sm:gap-5 z-50 hero-anim hero-fade"
            style={{ animationDelay: "0.85s" }}
          >
            {description && (
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed pointer-events-none">
                {description}
              </p>
            )}
            {ctas.map((cta) => renderCta(cta, cta.label))}
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 z-50 pt-16">
          {badge && (
            <div
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/80 mb-6 tracking-wide uppercase hero-anim hero-fade"
              style={{ animationDelay: "0.15s" }}
            >
              {badge}
            </div>
          )}
          <h1 className="text-white leading-[0.95] max-w-4xl">
            <span
              className="block font-playfair italic font-normal text-4xl sm:text-6xl md:text-7xl hero-anim hero-reveal"
              style={{ letterSpacing: "-0.05em", animationDelay: "0.25s" }}
            >
              {titleLine1}
            </span>
            {titleLine2 && (
              <span
                className="block font-normal text-4xl sm:text-6xl md:text-7xl -mt-1 hero-anim hero-reveal"
                style={{ letterSpacing: "-0.06em", animationDelay: "0.38s" }}
              >
                {titleLine2}
              </span>
            )}
          </h1>
          {description && (
            <p
              className="mt-6 text-base sm:text-lg text-white/75 max-w-2xl leading-relaxed hero-anim hero-fade"
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
              className="mt-8 flex flex-col sm:flex-row items-center gap-3 hero-anim hero-fade"
              style={{ animationDelay: "0.6s" }}
            >
              {ctas.map((cta) => renderCta(cta, cta.label))}
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
