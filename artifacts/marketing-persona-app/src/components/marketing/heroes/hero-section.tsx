"use client";

import { PageHero } from "./page-hero";
import { SIGNUP_HREF } from "@/lib/marketing/site/marketing-contact";

export function HeroSection() {
  return (
    <PageHero
      layout="home"
      badge="goals.ac · content desk"
      titleLine1="The SEO desk that already knows your brand."
      description="Chat or Studio: research-backed briefs, humanized drafts, dual scores, then WordPress-first publish. You approve before anything goes live."
      ctas={[
        { label: "Start creating", href: SIGNUP_HREF, variant: "primary" },
        { label: "See Content Studio", href: "/content-engine", variant: "secondary" },
      ]}
      proof={[
        { label: "Loop", value: "Brief · Draft · Score · Approve" },
        { label: "CMS", value: "WordPress first" },
        { label: "Gate", value: "Approve before live" },
      ]}
    />
  );
}
