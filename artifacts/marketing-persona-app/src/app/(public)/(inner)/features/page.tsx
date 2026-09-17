import type { Metadata } from "next";
import { FeaturesPageDynamic } from "@/components/marketing/layout/marketing-client-dynamic";

export const metadata: Metadata = {
  title: "Features",
  description:
    "SEO Chat, Content Studio, Action Queue, GEO audits, 12-month roadmaps, and WordPress-first publish — with approve-before-live gates.",
};

export default function FeaturesPage() {
  return <FeaturesPageDynamic />;
}
