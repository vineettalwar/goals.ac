"use client";

import { DarkCTABand } from "./dark-cta-band";
import { PlatformFeaturesSection } from "./platform-features-section";
import { ArticleExampleSection } from "./article-example-section";
import { SocialProofSection } from "./social-proof-section";
import { FAQAccordion } from "./faq-accordion";
import { MarketingCTA } from "./marketing-cta";
import {
  PRODUCT_CTA_SECONDARY,
  PRODUCT_CTA_SECONDARY_HREF,
} from "@/lib/marketing/site/marketing-contact";

export type ShowcaseArticle = {
  id: number;
  title: string;
  primaryKeyword: string;
  wordCount: number;
};

type HomeMarketingSectionsProps = {
  showcaseArticle?: ShowcaseArticle | null;
};

export function HomeMarketingSections({ showcaseArticle }: HomeMarketingSectionsProps) {
  return (
    <>
      <PlatformFeaturesSection />

      <DarkCTABand
        badge="Free tool"
        titleLine1="Do ChatGPT, Claude, Perplexity"
        titleLine2="& Gemini recommend you?"
        description="Run a free GEO audit. No account required. Schema, meta, llms.txt, AI robots, and citability — the same checks as in-app."
        primaryCta={{ label: "Run free audit", href: "/geo-audit" }}
        secondaryCta={{ label: "All free tools", href: "/free-tools" }}
      />

      <ArticleExampleSection article={showcaseArticle} />
      <SocialProofSection />

      <FAQAccordion
        titleLine1="Common"
        titleLine2="questions"
        items={[
          {
            question: "How is this different from autopilot SEO tools?",
            answer:
              "Volume tools ship drafts with thin research. goals.ac is a desk: SEO Chat and Content Studio run brief → draft → humanize → score → approve. Autopilot is an optional schedule on that same path, review gates by default — not a silent content farm.",
          },
          {
            question: "What is SEO Chat?",
            answer:
              "The conversational control plane. Onboard from a URL, scan opportunities, draft with an ask-before-draft gate, push to the Action Queue, and approve publish. Replies stay grounded — no invented metrics.",
          },
          {
            question: "Do you use backlink exchange networks?",
            answer:
              "No. We use content clusters and internal links. We don't buy links from exchange networks.",
          },
          {
            question: "How do I get started?",
            answer:
              "Request access, connect WordPress (or another CMS), and draft your first piece in Studio or Chat. You sign off on every live publish. Turn on Autopilot or Daily Five when you want cadence.",
          },
          {
            question: "Where can you publish?",
            answer:
              "WordPress is the deep path (plugin, Rank Math, featured image, draft-first). Ghost and Shopify are deep too. Other CMS tiles support Basic publish. Social Hub handles distribution after the article is ready.",
          },
          {
            question: "What's a GEO audit?",
            answer:
              "A single-URL scan for gaps that hurt visibility in ChatGPT, Perplexity, Claude, Gemini, and Google AI Overviews — schema, meta, llms.txt, and citability.",
          },
        ]}
      />

      <MarketingCTA
        badge="Content Studio"
        titleLine1="Research to publish"
        titleLine2="on one desk"
        description="Request access, connect a destination, and run the Studio loop on your first keyword."
        variant="dark"
        secondaryHref={PRODUCT_CTA_SECONDARY_HREF}
        secondaryLabel={PRODUCT_CTA_SECONDARY}
      />
    </>
  );
}
