import type { Metadata } from "next";
import { FeatureLanderDynamic } from "@/components/marketing/feature-lander-dynamic";

export const metadata: Metadata = {
  title: "Rank on ChatGPT — goals.ac",
  description: "Structure content for citation by AI assistants.",
};

export default function Page() {
  return <FeatureLanderDynamic configKey="rankOnChatgpt" />;
}
