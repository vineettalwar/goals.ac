import type { Metadata } from "next";
import { FeatureLanderDynamic } from "@/components/marketing/feature-lander-dynamic";

export const metadata: Metadata = {
  title: "For Agencies — goals.ac",
  description: "White-label SEO and GEO workflows for agencies managing multiple client sites.",
};

export default function Page() {
  return <FeatureLanderDynamic configKey="forAgencies" />;
}
