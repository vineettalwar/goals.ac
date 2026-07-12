import type { Metadata } from "next";
import { ContentEngineMarketing } from "@/components/marketing/content-engine-marketing";

export const metadata: Metadata = {
  title: "Content Engine — goals.ac",
  description:
    "Draft blog posts, guides, social posts, and web copy in your brand voice. Review, schedule, and publish to WordPress, Notion, Webflow, and social platforms.",
};

export default function ContentEngineMarketingPage() {
  return (
    <div className="max-w-none">
      <ContentEngineMarketing />
    </div>
  );
}
