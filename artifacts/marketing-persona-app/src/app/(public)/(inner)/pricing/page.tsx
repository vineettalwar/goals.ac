import type { Metadata } from "next";
import { PricingPageDynamic } from "@/components/marketing/layout/marketing-client-dynamic";

export const metadata: Metadata = {
  title: "Plans & pricing",
  description:
    "Hands-on GEO/AEO content programs for research, production, editorial review, and cross-platform publishing.",
  openGraph: {
    title: "Plans & pricing | goals.ac",
    description:
      "Hands-on GEO/AEO content programs for research, production, editorial review, and cross-platform publishing.",
  },
};

export default function PricingPage() {
  return <PricingPageDynamic />;
}
