import type { Metadata } from "next";
import { PricingPageDynamic } from "@/components/marketing/layout/marketing-client-dynamic";

export const metadata: Metadata = {
  title: "Plans & pricing",
  description:
    "Self-serve Growth and Scale for SEO Chat, Content Studio, Action Queue, and WordPress-first publish. Optional GEO programs when you want hands-on help.",
  openGraph: {
    title: "Plans & pricing | goals.ac",
    description:
      "Self-serve desk plans plus optional GEO programs — approve before live, WordPress-first CMS.",
  },
};

export default function PricingPage() {
  return <PricingPageDynamic />;
}
