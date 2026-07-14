import type { Metadata } from "next";
import { FeatureLanderDynamic } from "@/components/marketing/landers/feature-lander-dynamic";

export const metadata: Metadata = {
  title: "AI Visibility Tracking | goals.ac",
  description: "Track when ChatGPT, Perplexity, Claude, and Gemini cite your brand.",
};

export default function Page() {
  return <FeatureLanderDynamic configKey="aiVisibility" />;
}
