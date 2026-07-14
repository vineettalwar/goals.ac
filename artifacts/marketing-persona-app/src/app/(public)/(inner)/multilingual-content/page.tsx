import type { Metadata } from "next";
import { FeatureLanderDynamic } from "@/components/marketing/feature-lander-dynamic";

export const metadata: Metadata = {
  title: "Multilingual Content — goals.ac",
  description: "Native-quality SEO content in 25+ languages today, 50+ on the roadmap.",
};

export default function Page() {
  return <FeatureLanderDynamic configKey="multilingual" />;
}
