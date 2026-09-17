"use client";

import Link from "next/link";
import type { ReactNode } from "react";

function ctaButtonClass(variant: HeroCta["variant"]) {
  return variant === "ghost" || variant === "secondary"
    ? "text-sm font-medium text-foreground underline-offset-4 hover:underline"
    : "hero-cta-primary inline-flex items-center";
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
  if (cta.href?.startsWith("http://") || cta.href?.startsWith("https://") || cta.href?.startsWith("#")) {
    return (
      <a key={key} href={cta.href ?? "#"} className={className}>
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
  variant?: "primary" | "ghost" | "secondary";
  onClick?: () => void;
};

export type PageHeroProps = {
  badge?: string;
  lead?: ReactNode;
  titleLine1: string;
  titleLine2?: string;
  description?: string;
  leftDescription?: string;
  ctas?: HeroCta[];
  /** Ignored — cinematic photo heroes are retired. Kept so callers compile. */
  backgroundImage?: string;
  spotlightImage?: string;
  enableSpotlight?: boolean;
  layout?: "home" | "centered";
  persistCtas?: boolean;
  overlay?: ReactNode;
  proof?: Array<{ label: string; value: string }>;
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
  layout = "centered",
  overlay,
  proof,
  children,
}: PageHeroProps) {
  const deck = leftDescription ?? description;
  const heading = titleLine2 ? `${titleLine1} ${titleLine2}` : titleLine1;

  return (
    <section className="relative w-full bg-background font-sans text-foreground">
      <div
        className={
          layout === "home"
            ? "mx-auto max-w-5xl px-6 pb-16 pt-28 sm:pt-32"
            : "mx-auto max-w-5xl px-6 pb-12 pt-28 sm:pt-32"
        }
      >
        {lead ? <div className="mb-6">{lead}</div> : null}
        {badge ? (
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {badge}
          </p>
        ) : null}
        <h1 className="max-w-4xl text-[clamp(2rem,4.5vw+0.5rem,3.5rem)] font-semibold leading-[1.12] tracking-tight text-foreground">
          {heading}
        </h1>
        {deck ? (
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{deck}</p>
        ) : null}
        {overlay ? <div className="mt-6">{overlay}</div> : null}
        {ctas.length > 0 ? (
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            {ctas.map((cta) => renderHeroCta(cta, cta.label))}
          </div>
        ) : null}
        {proof && proof.length > 0 ? (
          <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {proof.map((item) => (
              <div key={item.label} className="flex items-baseline gap-2">
                <dt>{item.label}</dt>
                <dd className="score-signal normal-case tracking-normal">{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {children}
      </div>
    </section>
  );
}
