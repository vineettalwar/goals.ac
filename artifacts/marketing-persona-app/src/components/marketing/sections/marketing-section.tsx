"use client";

import type { ReactNode } from "react";
import { EditorialHeading } from "./editorial-heading";
import { HeroPhotoBg } from "../heroes/hero-photo-bg";
import { MarketingReveal } from "@/components/marketing/motion/marketing-reveal";
import { cn } from "@/lib/utils";

export type MarketingSectionVariant = "paper" | "image" | "dark";

type MarketingSectionProps = {
  badge?: string;
  title?: string;
  titleLine1?: string;
  titleLine2?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  bordered?: boolean;
  animate?: boolean;
  variant?: MarketingSectionVariant;
  backgroundImage?: string;
  overlayClass?: string;
  bridgeTop?: boolean;
  bridgeBottom?: boolean;
  id?: string;
};

const variantClasses: Record<MarketingSectionVariant, string> = {
  paper: "py-28 bg-background text-foreground",
  image: "py-28 relative overflow-hidden text-white",
  dark: "py-24 relative overflow-hidden text-white bg-black",
};

export function MarketingSection({
  badge,
  title,
  titleLine1,
  titleLine2,
  description,
  children,
  className,
  bordered = false,
  animate = true,
  variant = "dark",
  backgroundImage,
  overlayClass,
  bridgeTop = false,
  bridgeBottom = false,
  id,
}: MarketingSectionProps) {
  const isDarkTheme = variant === "image" || variant === "dark";
  const resolvedClassName = cn(variantClasses[variant], className);
  const useEditorial = Boolean(titleLine1 || titleLine2);

  const header = useEditorial ? (
    <div className="mb-16">
      <EditorialHeading
        line1={titleLine1 ?? title ?? ""}
        line2={titleLine2}
        description={description}
        badge={badge}
        theme={isDarkTheme ? "dark" : "light"}
        animate={animate}
      />
    </div>
  ) : (
    <div className="text-center mb-16">
      {badge && (
        <div
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold mb-4 ${
            isDarkTheme ? "editorial-badge-dark" : "editorial-badge-light"
          }`}
        >
          {badge}
        </div>
      )}
      {title && (
        <h2 className={`text-3xl md:text-4xl font-bold tracking-tight mb-4 ${isDarkTheme ? "text-white" : ""}`}>
          {title}
        </h2>
      )}
      {description && (
        <p className={`text-lg max-w-2xl mx-auto ${isDarkTheme ? "text-white/75" : "text-muted-foreground"}`}>
          {description}
        </p>
      )}
    </div>
  );

  const body = (
    <>
      {header}
      {children}
    </>
  );

  return (
    <section
      id={id}
      className={`${resolvedClassName}${bordered && variant !== "paper" ? " border-t border-white/10" : bordered && variant === "paper" ? " border-t border-border" : ""}`}
    >
      {isDarkTheme && backgroundImage && (
        <HeroPhotoBg image={backgroundImage} overlayClass={overlayClass} />
      )}

      {bridgeTop && (
        <div className="absolute top-0 left-0 right-0 h-24 section-bridge-top pointer-events-none z-10" aria-hidden />
      )}
      {bridgeBottom && (
        <div className="absolute bottom-0 left-0 right-0 h-24 section-bridge-bottom pointer-events-none z-10" aria-hidden />
      )}

      <div className="relative z-20 max-w-5xl mx-auto px-6">
        {animate && !useEditorial ? (
          <MarketingReveal>{body}</MarketingReveal>
        ) : (
          body
        )}
      </div>
    </section>
  );
}
