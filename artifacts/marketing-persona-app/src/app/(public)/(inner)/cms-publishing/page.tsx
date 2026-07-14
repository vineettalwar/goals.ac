import type { Metadata } from "next";
import { FeatureLanderDynamic } from "@/components/marketing/landers/feature-lander-dynamic";

export const metadata: Metadata = {
  title: "CMS Publishing | goals.ac",
  description: "Publish to WordPress, Shopify, Drupal, Joomla, Notion, Webflow, Ghost, and webhooks.",
};

export default function Page() {
  return <FeatureLanderDynamic configKey="cmsPublishing" />;
}
