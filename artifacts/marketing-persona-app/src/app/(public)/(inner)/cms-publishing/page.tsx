import type { Metadata } from "next";
import { FeatureLanderDynamic } from "@/components/marketing/landers/feature-lander-dynamic";

export const metadata: Metadata = {
  title: "CMS Publishing | goals.ac",
  description:
    "WordPress-first publish with plugin depth (Rank Math, featured image, draft-first). Ghost and Shopify deep; Basic publish for other CMS and webhooks.",
};

export default function Page() {
  return <FeatureLanderDynamic configKey="cmsPublishing" />;
}
