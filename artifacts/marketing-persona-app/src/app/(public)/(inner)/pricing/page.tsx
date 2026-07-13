import type { Metadata } from "next";
import { PricingPageDynamic } from "@/components/marketing/marketing-client-dynamic";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Pricing TBD. Explore goals.ac tiers for AI content, GEO audits, and autopilot publishing. Contact us for early access.",
  openGraph: {
    title: "Pricing | goals.ac",
    description: "Pricing TBD. Explore goals.ac tiers for AI content, GEO audits, and autopilot publishing.",
  },
};

export default function PricingPage() {
  return <PricingPageDynamic />;
}
