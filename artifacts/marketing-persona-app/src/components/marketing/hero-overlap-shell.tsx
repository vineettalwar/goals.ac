"use client";

import type { ReactNode, RefObject } from "react";
import { motion } from "framer-motion";
import { cardSurfaceClass } from "@/lib/marketing/marketing-surfaces";

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
          className={`${cardSurfaceClass("glass")} overflow-hidden shadow-2xl shadow-black/40`}
        >
          {children}
        </motion.div>
      </div>
    </section>
  );
}
