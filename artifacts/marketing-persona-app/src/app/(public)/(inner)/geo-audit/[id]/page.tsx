import type { Metadata } from "next";
import { GeoAuditResultLoader } from "@/components/marketing/pages/tools/geo-audit-result-loader";

/** Static marketing export needs a shell path; real ids resolve client-side via public API. */
export function generateStaticParams() {
  return [{ id: "0" }];
}

export const dynamicParams = true;

export const metadata: Metadata = {
  title: "GEO Audit Results",
  description: "Generative engine optimization audit results.",
  robots: { index: false, follow: false },
};

export default async function GeoAuditResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GeoAuditResultLoader id={id} />;
}
