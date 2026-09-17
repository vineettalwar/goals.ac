import type { Metadata } from "next";
import { FeatureLanderDynamic } from "@/components/marketing/landers/feature-lander-dynamic";
import { BrandVoiceShowcase } from "@/components/marketing/sections/brand-voice-showcase";

export const metadata: Metadata = {
  title: "Brand Voice | goals.ac",
  description:
    "Scrape your site into an editable voice skill doc. Chat and Studio retrieve topic passages at draft time — not a tone slider.",
};

export default function Page() {
  return <FeatureLanderDynamic configKey="brandVoice" middleContent={<BrandVoiceShowcase />} />;
}
