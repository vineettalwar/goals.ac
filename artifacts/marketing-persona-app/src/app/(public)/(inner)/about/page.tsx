import type { Metadata } from "next";
import { AboutPageDynamic } from "@/components/marketing/layout/marketing-client-dynamic";

export const metadata: Metadata = {
  title: "About",
  description: "goals.ac helps B2B startups grow with AI-powered content strategy, programmatic SEO, and GEO optimization.",
};

export default function AboutPage() {
  return <AboutPageDynamic />;
}
