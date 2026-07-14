import type { Metadata } from "next";
import { FeatureLanderDynamic } from "@/components/marketing/feature-lander-dynamic";

export const metadata: Metadata = {
  title: "Social Hub — Distribute Content Across Channels",
  description: "Publish to LinkedIn, X, Meta, Bluesky, and Mastodon from goals.ac Social Hub.",
};

export default function Page() {
  return <FeatureLanderDynamic configKey="socialDistribution" />;
}
