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
        description="Run a free GEO audit. No account required. See schema gaps, weak metadata, and structure issues."
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
              "Volume-only tools ship drafts with little research. Content Studio starts with keyword and competitor research, humanizes and scores every draft, and you approve before publish. Content Autopilot is an optional scheduled queue on that same path, with review gates by default.",
          },
          {
            question: "Do you use backlink exchange networks?",
            answer:
              "No. We use content clusters and internal links. We don't buy links from exchange networks.",
          },
          {
            question: "How do I get started?",
            answer:
              "Sign up free, connect your CMS, and create your first article in Content Studio. You sign off on every publish. Turn on Autopilot later if you want a daily or weekly queue.",
          },
          {
            question: "Where can you publish?",
            answer:
              "WordPress, Ghost, and Shopify have deep publish paths. Other CMS tiles support Basic publish. Social and webhook destinations are available for distribution after the article is ready.",
          },
          {
            question: "What's a GEO audit?",
            answer:
              "A scan for gaps that hurt visibility in ChatGPT, Perplexity, Claude, Gemini, and Google AI Overviews.",
          },
        ]}
      />

      <MarketingCTA
        badge="Content Studio"
        titleLine1="Research to publish"
        titleLine2="without the busywork"
        description="Create your account, connect a destination, and draft your first SEO article in minutes."
        variant="dark"
        secondaryHref={PRODUCT_CTA_SECONDARY_HREF}
        secondaryLabel={PRODUCT_CTA_SECONDARY}
      />
    </>
  );
}
