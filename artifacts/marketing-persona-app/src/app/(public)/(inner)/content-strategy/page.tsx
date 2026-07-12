import type { Metadata } from "next";
import { FeatureLanderDynamic } from "@/components/marketing/feature-lander-dynamic";

export const metadata: Metadata = {
  title: "Content Strategy — goals.ac",
  description: "30-day content calendars from your 12-month growth roadmap.",
};

export default function Page() {
  return <FeatureLanderDynamic configKey="contentStrategy" />;
}
