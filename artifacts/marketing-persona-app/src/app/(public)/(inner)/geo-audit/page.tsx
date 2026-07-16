import type { Metadata } from "next";
import { Suspense } from "react";
import { GeoAuditPageDynamic } from "@/components/marketing/layout/marketing-client-dynamic";
import { MarketingPageSkeleton } from "@/components/skeletons/marketing-page-skeleton";

export const metadata: Metadata = {
  title: "Free GEO Audit",
  description: "Audit any URL for generative engine optimization: schema, metadata, llms.txt, and AI-readiness signals.",
};

export default function GeoAuditFormPage() {
  return (
    <Suspense fallback={<MarketingPageSkeleton />}>
      <GeoAuditPageDynamic />
    </Suspense>
  );
}
