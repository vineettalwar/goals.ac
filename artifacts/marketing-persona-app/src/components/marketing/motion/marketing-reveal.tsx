"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type MarketingRevealProps = {
  children: ReactNode;
  className?: string;
  mode?: "inView" | "mount";
  delayMs?: number;
  disabled?: boolean;
  style?: CSSProperties;
};

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function MarketingReveal({
  children,
  className,
  mode = "inView",
  delayMs = 0,
  disabled = false,
  style,
}: MarketingRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      el.classList.add("marketing-reveal-visible");
      return;
    }

    if (mode === "mount") {
      const timer = window.setTimeout(() => el.classList.add("marketing-reveal-visible"), delayMs);
      return () => window.clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.classList.add("marketing-reveal-visible");
          observer.disconnect();
        }
      },
      { rootMargin: "-80px 0px", threshold: 0.01 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [disabled, mode, delayMs]);

  if (disabled) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn("marketing-reveal", className)}
      style={{ ...style, ...(delayMs ? { transitionDelay: `${delayMs}ms` } : undefined) }}
    >
      {children}
    </div>
  );
}
