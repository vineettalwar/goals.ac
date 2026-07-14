import type { Metadata } from "next";
import { IntegrationsDirectoryPageClient } from "@/components/marketing/integrations-directory-page-client";

export const metadata: Metadata = {
  title: "Integrations — 20+ CMS, ESP & Social Destinations",
  description: "Publish SEO content to WordPress, Shopify, headless CMS, email platforms, and social channels from goals.ac.",
};

export default function Page() {
  return <IntegrationsDirectoryPageClient />;
}
