"use client";

import { motion } from "framer-motion";
import { fadeUp, fadeUpTransition } from "@/lib/utils/motion";

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

  const content = (
    <div className={`flex flex-col ${alignClass} ${className}`}>
      {badge && (
        <div
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold mb-4 ${
            isDark ? "editorial-badge-dark" : "editorial-badge-light"
          }`}
        >
          {badge}
        </div>
      )}
      <h2 className={`leading-[0.95] ${isDark ? "text-white" : "text-foreground"}`}>
        <span
          className={`block font-playfair italic font-normal ${sizeClass}`}
          style={{ letterSpacing: "-0.05em" }}
        >
          {line1}
        </span>
        {line2 && (
          <span
            className={`block font-normal ${sizeClass} -mt-1`}
            style={{ letterSpacing: "-0.06em" }}
          >
            {line2}
          </span>
        )}
      </h2>
      {description && (
        <p
          className={`mt-5 text-lg max-w-2xl leading-relaxed tracking-normal ${
            isDark ? "text-white/75" : "text-muted-foreground"
          } ${align === "center" ? "mx-auto" : ""}`}
        >
          {description}
        </p>
      )}
    </div>
  );

  if (!animate) return content;

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={fadeUp}
      transition={fadeUpTransition}
    >
      {content}
    </motion.div>
  );
}
