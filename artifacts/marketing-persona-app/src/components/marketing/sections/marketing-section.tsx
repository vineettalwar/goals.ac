"use client";

import type { ReactNode } from "react";
import { EditorialHeading } from "./editorial-heading";
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
  paper: "py-24 bg-background text-foreground",
  image: "py-24 bg-background text-foreground",
  dark: "py-24 bg-background text-foreground",
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
  variant = "paper",
  backgroundImage: _backgroundImage,
  overlayClass: _overlayClass,
  bridgeTop: _bridgeTop = false,
  bridgeBottom: _bridgeBottom = false,
  id,
}: MarketingSectionProps) {
  const resolvedClassName = cn(variantClasses[variant], className);
  const useEditorial = Boolean(titleLine1 || titleLine2);

  const header = useEditorial ? (
    <div className="mb-16">
      <EditorialHeading
        line1={titleLine1 ?? title ?? ""}
        line2={titleLine2}
        description={description}
        badge={badge}
        theme="light"
        animate={animate}
      />
    </div>
  ) : (
    <div className="mb-16 text-center">
      {badge ? (
        <p className="editorial-badge-light mb-4 inline-flex items-center px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em]">
          {badge}
        </p>
      ) : null}
      {title ? (
        <h2 className="mb-4 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h2>
      ) : null}
      {description ? (
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{description}</p>
      ) : null}
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
      className={`${resolvedClassName}${bordered ? " border-t border-border" : ""}`}
    >
      <div className="relative mx-auto max-w-5xl px-6">
        {animate && !useEditorial ? <MarketingReveal>{body}</MarketingReveal> : body}
      </div>
    </section>
  );
}
