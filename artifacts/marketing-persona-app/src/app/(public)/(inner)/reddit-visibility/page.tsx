import type { Metadata } from "next";
import { FeatureLanderDynamic } from "@/components/marketing/feature-lander-dynamic";

export const metadata: Metadata = {
  title: "Reddit Visibility — goals.ac",
  description: "Find high-intent Reddit threads and draft replies — you post manually.",
};

export default function Page() {
  return <FeatureLanderDynamic configKey="redditVisibility" />;
}
