import type { Metadata } from "next";
import { FeaturesPageDynamic } from "@/components/marketing/marketing-client-dynamic";

export const metadata: Metadata = {
  title: "Features",
  description: "Content studio, programmatic SEO roadmaps, GEO audits, keyword tracking, and CMS autopilot.",
};

export default function FeaturesPage() {
  return <FeaturesPageDynamic />;
}
