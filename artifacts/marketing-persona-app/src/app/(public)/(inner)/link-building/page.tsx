import type { Metadata } from "next";
import { FeatureLanderDynamic } from "@/components/marketing/feature-lander-dynamic";

export const metadata: Metadata = {
  title: "Link Building — goals.ac",
  description: "Build topical authority with internal link clusters — not link schemes.",
};

export default function Page() {
  return <FeatureLanderDynamic configKey="linkBuilding" />;
}
