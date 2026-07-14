import type { Metadata } from "next";
import { PricingPageDynamic } from "@/components/marketing/marketing-client-dynamic";

export const metadata: Metadata = {
  title: "Engagements",
  description: "Custom SEO, AEO, and GEO consulting for B2B teams. Contact us to discuss scope.",
  openGraph: {
    title: "Engagements | goals.ac",
    description: "Custom SEO, AEO, and GEO consulting for B2B teams. Contact us to discuss scope.",
  },
};

export default function PricingPage() {
  return <PricingPageDynamic />;
}
