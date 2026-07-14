import type { Metadata } from "next";
import { FeatureLanderDynamic } from "@/components/marketing/landers/feature-lander-dynamic";

export const metadata: Metadata = {
  title: "Generative Engine Optimization | goals.ac",
  description: "Optimize for AI search engines with schema, metadata, and structure fixes.",
};

export default function Page() {
  return <FeatureLanderDynamic configKey="geo" />;
}
