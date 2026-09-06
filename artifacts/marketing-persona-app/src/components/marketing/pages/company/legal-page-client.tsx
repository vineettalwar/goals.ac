import type { ReactNode } from "react";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";

const glassCard = cardSurfaceClass("glass", false);

type LegalPageClientProps = {
  titleLine1: string;
  titleLine2?: string;
  lastUpdated: string;
  children: ReactNode;
};

/** Server legal shell — no full-viewport PageHero / client chunk on soft-nav. */
export function LegalPageClient({
  titleLine1,
  titleLine2,
  lastUpdated,
  children,
}: LegalPageClientProps) {
  return (
    <div className="min-h-screen bg-black">
      <header className="px-6 pt-28 pb-10 text-center sm:pt-32">
        <p className="mb-5 text-xs font-semibold uppercase tracking-wide text-white/60">
          Last updated {lastUpdated}
        </p>
        <h1 className="mx-auto max-w-4xl text-white leading-[0.95]">
          <span
            className="block font-playfair text-4xl font-normal italic sm:text-6xl md:text-7xl"
            style={{ letterSpacing: "-0.05em" }}
          >
            {titleLine1}
          </span>
          {titleLine2 ? (
            <span
              className="-mt-1 block text-4xl font-normal sm:text-6xl md:text-7xl"
              style={{ letterSpacing: "-0.06em" }}
            >
              {titleLine2}
            </span>
          ) : null}
        </h1>
      </header>
      <div className="mx-auto max-w-3xl px-6 pb-16">
        <div className={`${glassCard} space-y-8 p-8 marketing-prose-dark md:p-10`}>{children}</div>
      </div>
    </div>
  );
}
