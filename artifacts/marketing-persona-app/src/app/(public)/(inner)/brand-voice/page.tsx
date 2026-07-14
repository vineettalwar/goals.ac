import type { Metadata } from "next";
import { FeatureLanderDynamic } from "@/components/marketing/landers/feature-lander-dynamic";
import { BrandVoiceShowcase } from "@/components/marketing/sections/brand-voice-showcase";

export const metadata: Metadata = {
  title: "Brand Voice | RAG-Backed Content That Sounds Like You",
  description: "Ingest your site and docs; generate on-brand SEO content with editable voice skill docs.",
};

export default function Page() {
  return <FeatureLanderDynamic configKey="brandVoice" middleContent={<BrandVoiceShowcase />} />;
}
