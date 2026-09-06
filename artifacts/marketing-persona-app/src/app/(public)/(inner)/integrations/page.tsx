import type { Metadata } from "next";
import { IntegrationsDirectoryPageClient } from "@/components/marketing/pages/product/integrations-directory-page-client";

export const metadata: Metadata = {
  title: "Integrations | CMS, ESP & Social Publishing",
  description:
    "Publish SEO content to WordPress, Ghost, Shopify, and other CMS/social destinations. Deep paths for primary stacks; Basic publish for headless and site builders.",
  alternates: { canonical: "/integrations" },
};

export default function Page() {
  return <IntegrationsDirectoryPageClient />;
}
