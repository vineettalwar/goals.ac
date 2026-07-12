import type { Metadata } from "next";
import { GeoAuditPageDynamic } from "@/components/marketing/marketing-client-dynamic";

export const metadata: Metadata = {
  title: "Free GEO Audit",
  description: "Audit any URL for generative engine optimization — schema, metadata, llms.txt, and AI-readiness signals.",
};

export default function GeoAuditFormPage() {
  return <GeoAuditPageDynamic />;
}
