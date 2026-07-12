import type { Metadata } from "next";
import { FeatureLanderDynamic } from "@/components/marketing/feature-lander-dynamic";

export const metadata: Metadata = {
  title: "Content Autopilot — goals.ac",
  description: "Automated content generation with editorial control and flexible publish modes.",
};

export default function Page() {
  return <FeatureLanderDynamic configKey="autopilot" />;
}
