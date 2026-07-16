import type { Metadata } from "next";
import { Suspense } from "react";
import { GeoAuditResultLoader } from "@/components/marketing/pages/tools/geo-audit-result-loader";
import { MarketingPageSkeleton } from "@/components/skeletons/marketing-page-skeleton";

/** Static marketing export needs a shell path; real ids resolve client-side via public API. */
export function generateStaticParams() {
  return [{ id: "0" }];
}

/** Static export needs false — build-marketing-static.mjs patches this before `next build`. */
export const dynamicParams = true;

export const metadata: Metadata = {
  title: "GEO Audit Results",
  description: "Generative engine optimization audit results.",
  robots: { index: false, follow: false },
};

export default function GeoAuditResultPage() {
  return (
    <Suspense fallback={<MarketingPageSkeleton />}>
      <GeoAuditResultLoader />
    </Suspense>
  );
}
