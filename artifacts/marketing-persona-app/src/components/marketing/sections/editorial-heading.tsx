"use client";

import { MarketingReveal } from "@/components/marketing/motion/marketing-reveal";

type EditorialHeadingProps = {
  line1: string;
  line2?: string;
  description?: string;
  badge?: string;
  align?: "center" | "left";
  theme?: "light" | "dark";
  animate?: boolean;
  className?: string;
  size?: "section" | "card";
};

export function EditorialHeading({
  line1,
  line2,
  description,
  badge,
  align = "center",
  theme = "light",
  animate = true,
  className = "",
  size = "section",
}: EditorialHeadingProps) {
  const isDark = theme === "dark";
  const alignClass = align === "center" ? "text-center items-center" : "text-left items-start";
  const sizeClass =
    size === "card"
      ? "text-2xl sm:text-3xl"
      : "text-3xl sm:text-4xl md:text-5xl";
  const heading = line2 ? `${line1} ${line2}` : line1;

  const content = (
    <div className={`flex flex-col ${alignClass} ${className}`}>
      {badge && (
        <p
          className={`mb-4 font-mono text-[11px] uppercase tracking-[0.12em] ${
            isDark ? "text-white/70" : "text-muted-foreground"
          }`}
        >
          {badge}
        </p>
      )}
      <h2
        className={`max-w-4xl font-semibold leading-[1.12] tracking-tight ${sizeClass} ${
          isDark ? "text-white" : "text-foreground"
        }`}
      >
        {heading}
      </h2>
      {description && (
        <p
          className={`mt-5 max-w-2xl text-lg leading-relaxed tracking-normal ${
            isDark ? "text-white/75" : "text-muted-foreground"
          } ${align === "center" ? "mx-auto" : ""}`}
        >
          {description}
        </p>
      )}
    </div>
  );

  if (!animate) return content;

  return <MarketingReveal>{content}</MarketingReveal>;
}
