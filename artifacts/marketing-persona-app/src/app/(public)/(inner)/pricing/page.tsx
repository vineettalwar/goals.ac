import type { Metadata } from "next";
import { PricingPageDynamic } from "@/components/marketing/marketing-client-dynamic";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple credit-based pricing for AI content generation, GEO audits, and autopilot publishing.",
  openGraph: {
    title: "Pricing — goals.ac",
    description: "Simple credit-based pricing for AI content generation, GEO audits, and autopilot publishing.",
  },
};

export default function PricingPage() {
  return <PricingPageDynamic />;
}
