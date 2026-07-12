"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { fadeUp, fadeUpTransition } from "@/lib/motion";

type MarketingSectionProps = {
  badge?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  bordered?: boolean;
  animate?: boolean;
};

export function MarketingSection({
  badge,
  title,
  description,
  children,
  className = "py-28 bg-background",
  bordered = false,
  animate = true,
}: MarketingSectionProps) {
  const header = (
    <div className="text-center mb-16">
      {badge && (
        <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary mb-4">
          {badge}
        </div>
      )}
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{title}</h2>
      {description && (
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{description}</p>
      )}
    </div>
  );

  const content = (
    <>
      {header}
      {children}
    </>
  );

  return (
    <section
      className={`${className}${bordered ? " border-t border-[--border]" : ""}`}
    >
      <div className="max-w-5xl mx-auto px-6">
        {animate ? (
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            transition={fadeUpTransition}
          >
            {content}
          </motion.div>
        ) : (
          content
        )}
      </div>
    </section>
  );
}
