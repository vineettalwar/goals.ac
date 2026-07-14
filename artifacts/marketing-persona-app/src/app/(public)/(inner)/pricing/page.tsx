import type { Metadata } from "next";
import { PricingPageDynamic } from "@/components/marketing/layout/marketing-client-dynamic";

export const metadata: Metadata = {
  title: "Plans & pricing",
  description:
    "Start free on Starter, upgrade to Growth ($49/mo), or add a hands-on GEO/AEO content program. Self-serve studio plus optional consulting.",
  openGraph: {
    title: "Plans & pricing | goals.ac",
    description:
      "Start free on Starter, upgrade to Growth ($49/mo), or add a hands-on GEO/AEO content program.",
  },
};

export default function PricingPage() {
  return <PricingPageDynamic />;
}
