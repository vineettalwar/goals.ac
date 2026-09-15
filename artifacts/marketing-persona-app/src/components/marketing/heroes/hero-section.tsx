"use client";

import { PageHero } from "./page-hero";
import { SIGNUP_HREF } from "@/lib/marketing/site/marketing-contact";

export function HeroSection() {
  return (
    <PageHero
      layout="home"
      badge="goals.ac · content desk"
      titleLine1="Research-driven SEO content, published everywhere."
      description="Briefs, drafts, and CMS publishing from one desk. You approve every piece before it goes live."
      ctas={[
        { label: "Start creating", href: SIGNUP_HREF, variant: "primary" },
        { label: "See Content Studio", href: "/content-engine", variant: "secondary" },
      ]}
      proof={[
        { label: "Scores", value: "Editorial + SERP" },
        { label: "CMS", value: "WordPress first" },
        { label: "Gate", value: "Approve before live" },
      ]}
    />
  );
}
