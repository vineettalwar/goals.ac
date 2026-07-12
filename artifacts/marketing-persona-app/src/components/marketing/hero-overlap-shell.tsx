"use client";

import type { ReactNode, RefObject } from "react";
import { motion } from "framer-motion";

type HeroOverlapShellProps = {
  id?: string;
  children: ReactNode;
  sectionRef?: RefObject<HTMLElement | null>;
};

export function HeroOverlapShell({ id, children, sectionRef }: HeroOverlapShellProps) {
  return (
    <section
      ref={sectionRef}
      id={id}
      className="py-0 bg-transparent relative z-20 -mt-4 sm:-mt-8"
    >
      <div className="max-w-3xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
          className="paper-card overflow-hidden shadow-2xl shadow-black/20 ring-1 ring-black/5"
        >
          {children}
        </motion.div>
      </div>
    </section>
  );
}
