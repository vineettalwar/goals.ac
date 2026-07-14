import type { Metadata } from "next";
import { FeatureLanderDynamic } from "@/components/marketing/feature-lander-dynamic";

export const metadata: Metadata = {
  title: "Search Analytics — GSC, GA4 & Keyword Tracking",
  description: "Measure article performance with Google Search Console, GA4, and keyword rank tracking.",
};

export default function Page() {
  return <FeatureLanderDynamic configKey="searchAnalytics" />;
}
