import type { Metadata } from "next";
import { FeatureLanderDynamic } from "@/components/marketing/landers/feature-lander-dynamic";

export const metadata: Metadata = {
  title: "Link Building | goals.ac",
  description: "Build topical authority with internal link clusters, not link exchange schemes.",
};

export default function Page() {
  return <FeatureLanderDynamic configKey="linkBuilding" />;
}
