import type { Metadata } from "next";
import { FeaturesPageDynamic } from "@/components/marketing/layout/marketing-client-dynamic";

export const metadata: Metadata = {
  title: "Features",
  description: "Research-driven content studio: SEO briefs, cross-platform publishing, GEO audits, keyword tracking, and editorial review.",
};

export default function FeaturesPage() {
  return <FeaturesPageDynamic />;
}
