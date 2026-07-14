import type { Metadata } from "next";
import { FeatureLanderDynamic } from "@/components/marketing/landers/feature-lander-dynamic";

export const metadata: Metadata = {
  title: "Content Strategy | goals.ac",
  description: "30-day content calendars from keyword and competitor research — prioritized topics, formats, and publish destinations.",
};

export default function Page() {
  return <FeatureLanderDynamic configKey="contentStrategy" />;
}
