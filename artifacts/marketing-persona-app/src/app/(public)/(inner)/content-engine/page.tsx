import type { Metadata } from "next";
import { ContentEngineMarketing } from "@/components/marketing/pages/product/content-engine-marketing";

export const metadata: Metadata = {
  title: "Content Studio | goals.ac",
  description:
    "Research-driven SEO content studio. Briefs, drafts you approve, and cross-platform publishing to CMS, social, and email — saving you time end to end.",
};

export default function ContentEngineMarketingPage() {
  return (
    <div className="max-w-none">
      <ContentEngineMarketing />
    </div>
  );
}
